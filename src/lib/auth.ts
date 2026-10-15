import { iniciaisDe } from '@/data/jogo'
import { perfilDe, sessao, type Funcao, type Permissao } from '@/data/perfis'
import { definirLembrar } from '@/lib/armazenamento-sessao'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

/**
 * Entrar, voltar e sair.
 *
 * A conta e do Supabase Auth; o que ela pode fazer sai da linha dela em
 * `usuarios` (funcao + permissao). Conta nova nasce inativa: quem libera e
 * o ADM, e ate la o login explica isso em vez de abrir um app vazio.
 */
export class ErroDeAcesso extends Error {}

const MENSAGENS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme o e-mail pelo link que chegou na sua caixa de entrada.',
}

/** Endereco temporario (7 dias) da foto de uma pessoa da equipe. */
export async function enderecoDaFoto(caminho: string) {
  const { data } = await supabase.storage.from('perfis').createSignedUrl(caminho, 7 * 86400)
  return data?.signedUrl ?? null
}

/** Le a linha da conta em `usuarios` e monta o perfil da sessao. */
async function carregarPerfil() {
  const { data: auth } = await supabase.auth.getUser()
  const usuario = auth.user
  if (!usuario) throw new ErroDeAcesso('Sessão expirada. Entre de novo.')

  // `*`: a linha inteira, inclusive colunas que um SQL novo acrescenta
  // (foto_path) — sem quebrar o login enquanto ele nao roda
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', usuario.id)
    .maybeSingle()

  if (error) {
    // a tabela ainda nao existe: a migracao do banco nao foi aplicada
    throw new ErroDeAcesso('O banco do ADAM ainda não foi configurado.')
  }
  const perfil = data?.ativo
    ? perfilDe(data.funcao as Funcao | null, data.permissao as Permissao)
    : null
  if (!data || !perfil) {
    await supabase.auth.signOut()
    throw new ErroDeAcesso('Seu acesso ainda não foi liberado. Fale com a coordenação.')
  }

  const fotoPath = (data.foto_path as string | null | undefined) ?? null
  sessao.definir({
    logado: true,
    usuarioId: usuario.id,
    perfil,
    pessoa: {
      nome: data.nome,
      email: data.email,
      iniciais: iniciaisDe(data.nome),
      fotoPath,
      foto: fotoPath ? await enderecoDaFoto(fotoPath) : null,
    },
  })
}

export async function entrar(email: string, senha: string, lembrar: boolean) {
  if (!supabaseConfigurado) throw new ErroDeAcesso('O app ainda não está ligado ao banco.')

  await definirLembrar(lembrar)
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  })
  if (error) {
    throw new ErroDeAcesso(
      MENSAGENS[error.message] ?? 'Não foi possível entrar. Confira a conexão e tente de novo.',
    )
  }
  await carregarPerfil()
}

/**
 * Chamado na abertura do app: se o aparelho foi lembrado e a sessao ainda
 * vale, entra direto — e o que faz o app nao pedir senha toda vez.
 */
export async function retomarSessao() {
  if (!supabaseConfigurado) return false
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return false
    await carregarPerfil()
    return true
  } catch {
    return false
  }
}

/** Sai e apaga a sessao do aparelho (Keychain inclusive). */
export async function sair() {
  await supabase.auth.signOut().catch(() => {})
  sessao.definir({ logado: false, usuarioId: null, perfil: 'adm', pessoa: null })
}
