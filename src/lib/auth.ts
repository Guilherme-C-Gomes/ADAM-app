import { iniciaisDe } from '@/data/jogo'
import { perfilDe, sessao, type Funcao, type Permissao } from '@/data/perfis'
import { armazenamentoSessao, definirLembrar } from '@/lib/armazenamento-sessao'
import {
  ehErroDeRede,
  esquecerPerfil,
  guardarPerfil,
  perfilGuardado,
  type LinhaUsuario,
} from '@/lib/perfil-guardado'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

/**
 * Entrar, voltar e sair.
 *
 * A conta e do Supabase Auth; o que ela pode fazer sai da linha dela em
 * `usuarios` (funcao + permissao). Conta nova nasce inativa: quem libera e
 * o ADM, e ate la o login explica isso em vez de abrir um app vazio.
 *
 * Sem internet, quem ja tinha entrado neste aparelho entra com a ultima
 * linha boa guardada (lib/perfil-guardado.ts) — e a Chamada offline fica ao
 * alcance. Quando a conexao volta, o perfil e conferido de novo no banco.
 */
export class ErroDeAcesso extends Error {}

/** O servidor nao respondeu: nao da para dizer nem sim nem nao. */
class SemConexao extends ErroDeAcesso {
  constructor() {
    super('Sem conexão com a internet.')
  }
}

/** O banco respondeu que esta conta nao entra (inexistente, inativa, sessao morta). */
class AcessoRecusado extends ErroDeAcesso {}

/** Falhou por falta de resposta do servidor (e nao por recusa)? */
const semResposta = (e: unknown) =>
  e instanceof SemConexao || (!(e instanceof ErroDeAcesso) && ehErroDeRede(e))

const MENSAGENS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme o e-mail pelo link que chegou na sua caixa de entrada.',
}

// a tabela `usuarios` nao existe: a migracao do banco nao foi aplicada
const SEM_TABELA = ['42P01', 'PGRST205']

/** Endereco temporario (7 dias) da foto de uma pessoa da equipe. */
export async function enderecoDaFoto(caminho: string) {
  const { data } = await supabase.storage.from('perfis').createSignedUrl(caminho, 7 * 86400)
  return data?.signedUrl ?? null
}

/** Quando o perfil foi conferido no banco pela ultima vez (0 = so o guardado). */
let conferidoEm = 0
// muda a cada "Sair": uma leitura do perfil que ainda estava a caminho nao
// pode logar a pessoa de novo depois que ela saiu
let geracao = 0

/** Monta o perfil da sessao a partir da linha de `usuarios`. */
async function aplicarLinha(linha: LinhaUsuario, comFoto: boolean, desde = geracao) {
  const perfil = perfilDe(linha.funcao as Funcao | null, linha.permissao as Permissao)
  if (!perfil) return false
  let foto: string | null = null
  if (comFoto && linha.foto_path) foto = await enderecoDaFoto(linha.foto_path).catch(() => null)
  if (desde !== geracao) return true
  sessao.definir({
    logado: true,
    usuarioId: linha.id,
    perfil,
    funcao: linha.funcao as Funcao | null,
    permissao: linha.permissao as Permissao,
    pessoa: {
      nome: linha.nome,
      email: linha.email,
      iniciais: iniciaisDe(linha.nome),
      fotoPath: linha.foto_path,
      foto,
    },
  })
  return true
}

/**
 * Le a linha da conta em `usuarios` no banco e monta o perfil da sessao.
 * Sem resposta do servidor lanca `SemConexao`; recusa de verdade (conta
 * inativa ou inexistente) sai deste aparelho e lanca `AcessoRecusado`.
 */
async function carregarPerfil() {
  const desde = geracao
  const { data: auth, error: erroAuth } = await supabase.auth.getUser()
  if (ehErroDeRede(erroAuth)) throw new SemConexao()
  const usuario = auth.user
  if (!usuario) throw new AcessoRecusado('Sessão expirada. Entre de novo.')

  // `*`: a linha inteira, inclusive colunas que um SQL novo acrescenta
  // (foto_path) — sem quebrar o login enquanto ele nao roda
  const { data, error, status } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', usuario.id)
    .maybeSingle()

  if (error) {
    if (ehErroDeRede(error, status)) throw new SemConexao()
    if (SEM_TABELA.includes(error.code)) {
      throw new ErroDeAcesso('O banco do ADAM ainda não foi configurado.')
    }
    throw new ErroDeAcesso('Não foi possível carregar a sua conta. Tente de novo.')
  }

  const linha: LinhaUsuario | null = data
    ? {
        id: usuario.id,
        nome: data.nome,
        email: data.email,
        funcao: data.funcao ?? null,
        permissao: data.permissao,
        ativo: !!data.ativo,
        foto_path: (data.foto_path as string | null | undefined) ?? null,
      }
    : null
  // a pessoa saiu enquanto a resposta vinha: nao entra de novo
  if (desde !== geracao) return
  if (!linha?.ativo || !(await aplicarLinha(linha, true, desde))) {
    await sairDoAparelho()
    throw new AcessoRecusado('Seu acesso ainda não foi liberado. Fale com a coordenação.')
  }
  if (desde !== geracao) return
  await guardarPerfil(linha)
  conferidoEm = Date.now()
}

export async function entrar(email: string, senha: string, lembrar: boolean) {
  if (!supabaseConfigurado) throw new ErroDeAcesso('O app ainda não está ligado ao banco.')

  await definirLembrar(lembrar)
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  })
  if (error) {
    if (ehErroDeRede(error)) throw new SemConexao()
    throw new ErroDeAcesso(
      MENSAGENS[error.message] ?? 'Não foi possível entrar. Confira a conexão e tente de novo.',
    )
  }
  try {
    await carregarPerfil()
  } catch (e) {
    if (semResposta(e)) throw new SemConexao()
    if (e instanceof ErroDeAcesso) throw e
    throw new ErroDeAcesso('Não foi possível entrar. Tente de novo.')
  }
}

/**
 * O id da conta da sessao guardada no aparelho, lida direto do armazenamento.
 * Sem internet e com o token vencido, `getSession()` devolve sessao nula (nao
 * consegue renovar), mas a sessao continua guardada — e ela que diz de quem
 * e o perfil guardado.
 */
async function contaDaSessaoGuardada() {
  try {
    const chave = (supabase.auth as unknown as { storageKey?: string }).storageKey
    const texto = chave ? await armazenamentoSessao.getItem(chave) : null
    const id = texto ? (JSON.parse(texto) as { user?: { id?: string } }).user?.id : null
    return id ?? null
  } catch {
    return null
  }
}

/** Entra com a ultima linha boa guardada (sem internet). */
async function entrarSemConexao(usuarioId: string | null) {
  const linha = usuarioId ? await perfilGuardado(usuarioId) : null
  if (!linha) return false
  conferidoEm = 0
  return aplicarLinha(linha, false)
}

/**
 * Chamado na abertura do app: se o aparelho foi lembrado e a sessao ainda
 * vale, entra direto — e o que faz o app nao pedir senha toda vez. Sem
 * internet, entra com o perfil guardado; so o banco respondendo pode barrar.
 */
export async function retomarSessao() {
  if (!supabaseConfigurado) return false
  try {
    const { data, error } = await supabase.auth.getSession()
    if (!data.session) {
      // sem sessao de verdade, ou sem rede para renovar o token vencido
      return ehErroDeRede(error) ? await entrarSemConexao(await contaDaSessaoGuardada()) : false
    }
    try {
      await carregarPerfil()
      return true
    } catch (e) {
      if (semResposta(e)) return await entrarSemConexao(data.session.user.id)
      // recusa de verdade: o perfil guardado nao vale mais
      if (e instanceof AcessoRecusado) await esquecerPerfil()
      return false
    }
  } catch {
    return false
  }
}

let conferindo: Promise<void> | null = null

/**
 * Confere o perfil no banco de novo, em silencio — chamado quando o app volta
 * para a frente e, enquanto estiver com o perfil guardado, de tempos em
 * tempos. Sem rede, segue como esta; se o banco disser que a conta nao vale
 * mais, sai (e a guarda de sessao leva para o login).
 */
export function conferirPerfil() {
  if (!supabaseConfigurado || !sessao.ler().logado || conferindo) return
  // com o perfil do banco, uma conferencia a cada 15 minutos basta
  if (conferidoEm && Date.now() - conferidoEm < 15 * 60_000) return
  conferindo = carregarPerfil()
    .catch(async (e) => {
      // so a recusa do banco tira a pessoa; sem rede ou erro passageiro, segue
      if (e instanceof AcessoRecusado) await sair()
    })
    .finally(() => {
      conferindo = null
    })
}

/**
 * Apaga a sessao deste aparelho, e so dele (`scope: 'local'`): o padrao do
 * Supabase (`global`) derrubava a pessoa em todos os celulares.
 */
async function sairDoAparelho() {
  await esquecerPerfil()
  const { error } = await supabase.auth.signOut({ scope: 'local' }).catch((e) => ({ error: e }))
  // sem rede e com o token vencido, o Supabase devolve o erro e NAO apaga a
  // sessao guardada: apaga aqui, para "Sair" valer de verdade
  if (error) {
    const chave = (supabase.auth as unknown as { storageKey?: string }).storageKey
    if (chave) await armazenamentoSessao.removeItem(chave).catch(() => {})
  }
}

/** Sai e apaga a sessao do aparelho (Keychain inclusive). */
export async function sair() {
  geracao++
  await sairDoAparelho()
  conferidoEm = 0
  sessao.definir({
    logado: false,
    usuarioId: null,
    perfil: 'adm',
    funcao: null,
    permissao: 'ver_registrar',
    pessoa: null,
  })
}
