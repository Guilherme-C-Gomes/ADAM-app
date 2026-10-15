import { useCallback, useEffect, useState } from 'react'

import { iniciaisDe } from '@/data/jogo'
import { sessao, type Funcao, type Permissao } from '@/data/perfis'
import { supabase } from '@/lib/supabase'

/**
 * A equipe com acesso ao app, no banco (tabela `usuarios`).
 *
 * Ler: qualquer conta ativa le a equipe (escala, comissao, "Rafael esta
 * marcando"). Criar: pela Edge Function `criar-usuario`, porque criar conta
 * de outra pessoa exige a chave secreta, que nao vai no app. Mudar funcao,
 * permissao e acesso: so o ADM — a politica do banco recusa os outros.
 */
export type Usuario = {
  id: string
  nome: string
  email: string
  funcao: Funcao | null
  permissao: Permissao
  ativo: boolean
  /** endereco temporario da foto, se a pessoa pos uma */
  foto: string | null
}

export const FUNCOES: { valor: Funcao; rotulo: string }[] = [
  { valor: 'treinador', rotulo: 'Treinador' },
  { valor: 'professor', rotulo: 'Professor' },
  { valor: 'secretaria', rotulo: 'Secretaria' },
]

/**
 * A permissao diz tambem o que a pessoa ENXERGA das criancas. Dado
 * sensivel (estatistica, relatorio, ficha) e so de quem tem acesso total e
 * da funcao Secretaria. Treinador com "Coordenar setor" e o coordenador
 * tecnico: monta a escala e a comissao que os outros treinadores so veem.
 */
export const PERMISSOES: { valor: Permissao; rotulo: string; detalhe: string }[] = [
  {
    valor: 'ver_registrar',
    rotulo: 'Ver e registrar',
    detalhe: 'Chamada e o próprio setor. Da criança, só nome e idade',
  },
  {
    valor: 'coordenar_setor',
    rotulo: 'Coordenar setor',
    detalhe: 'Também monta a escala e a comissão do setor',
  },
  {
    valor: 'acesso_total',
    rotulo: 'Acesso total',
    detalhe: 'Vê tudo, inclusive dados e fichas, e cria acessos',
  },
]

/** O selo da lista: a funcao, ou "Administrador" para quem so administra. */
export function rotuloDe(u: Pick<Usuario, 'funcao' | 'permissao'>) {
  if (u.permissao === 'acesso_total' && !u.funcao) return 'Administrador'
  return FUNCOES.find((f) => f.valor === u.funcao)?.rotulo ?? 'Sem função'
}

/**
 * A equipe com as fotos. `*` le a linha inteira: a coluna foto_path so
 * existe depois do SQL de 02/10, e pedir por nome quebraria a lista antes.
 */
async function lerEquipe() {
  const { data, error } = await supabase.from('usuarios').select('*').order('nome')
  if (error)
    return {
      lista: [] as Usuario[],
      carregando: false,
      erro: 'Não foi possível carregar a equipe.',
    }
  const linhas = (data ?? []) as (Omit<Usuario, 'foto'> & { foto_path?: string | null })[]
  const caminhos = linhas.flatMap((u) => (u.foto_path ? [u.foto_path] : []))
  const fotos = new Map<string, string>()
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage
      .from('perfis')
      .createSignedUrls(caminhos, 3600)
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) fotos.set(a.path, a.signedUrl)
  }
  return {
    lista: linhas.map(({ foto_path, ...u }) => ({
      ...u,
      foto: foto_path ? (fotos.get(foto_path) ?? null) : null,
    })),
    carregando: false,
    erro: null,
  }
}

export function useUsuarios() {
  const [estado, setEstado] = useState<{
    lista: Usuario[]
    carregando: boolean
    erro: string | null
  }>({
    lista: [],
    carregando: true,
    erro: null,
  })

  const buscar = useCallback(() => lerEquipe(), [])

  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])

  useEffect(() => {
    let ativo = true
    buscar().then((novo) => {
      if (ativo) setEstado(novo)
    })
    return () => {
      ativo = false
    }
  }, [buscar])

  return { ...estado, recarregar }
}

/** A mensagem que a Edge Function devolveu, ou uma generica. */
async function mensagemDe(error: unknown) {
  const resposta = (error as { context?: Response })?.context
  try {
    const corpo = await resposta?.json()
    if (corpo?.erro) return String(corpo.erro)
  } catch {
    // sem corpo legivel
  }
  return 'Não foi possível criar o usuário. Confira a conexão.'
}

/**
 * O endereco da Edge Function no Supabase. No painel ela se chama
 * "criar-usuario", mas o endereco (slug) ficou "smooth-service" ao publicar
 * pelo navegador — e o slug nao muda depois. O codigo e o de
 * supabase/functions/criar-usuario.
 */
const FUNCAO_CRIAR_USUARIO = 'smooth-service'

export async function criarUsuario(dados: {
  nome: string
  email: string
  senha: string
  funcao: Funcao | null
  permissao: Permissao
}) {
  const { error } = await supabase.functions.invoke(FUNCAO_CRIAR_USUARIO, { body: dados })
  if (error) throw new Error(await mensagemDe(error))
}

export async function atualizarUsuario(
  id: string,
  dados: Partial<Pick<Usuario, 'funcao' | 'permissao' | 'ativo'>>,
) {
  const { error } = await supabase.from('usuarios').update(dados).eq('id', id)
  if (error) throw new Error('Não foi possível salvar. Só a coordenação muda acessos.')
}

/**
 * Exclui o acesso de alguem (so o ADM; a funcao confere de novo). O que
 * estava atribuido a pessoa fica sem atribuicao — ver o SQL de exclusao.
 */
export async function excluirUsuario(id: string) {
  const { error } = await supabase.functions.invoke(FUNCAO_CRIAR_USUARIO, {
    body: { acao: 'excluir', id },
  })
  if (error) throw new Error(await mensagemDe(error))
}

/** A propria pessoa troca o nome e o e-mail de entrar (Minha conta). */
export async function atualizarMeuPerfil(dados: { nome: string; email: string }) {
  const nome = dados.nome.trim()
  const email = dados.email.trim().toLowerCase()
  const { error } = await supabase.functions.invoke(FUNCAO_CRIAR_USUARIO, {
    body: { acao: 'meu-perfil', nome, email },
  })
  if (error) throw new Error(await mensagemDe(error))
  const { pessoa } = sessao.ler()
  if (pessoa) {
    sessao.definir({ pessoa: { ...pessoa, nome, email, iniciais: iniciaisDe(nome) } })
  }
}

/** O ADM poe uma senha nova para quem esqueceu (e passa para a pessoa). */
export async function redefinirSenha(id: string, senha: string) {
  const { error } = await supabase.functions.invoke(FUNCAO_CRIAR_USUARIO, {
    body: { acao: 'redefinir-senha', id, senha },
  })
  if (error) throw new Error(await mensagemDe(error))
}
