import { criarRascunho } from '@/hooks/use-rascunho'

/**
 * Perfis: cada pessoa ve o app do tamanho do trabalho dela.
 *
 * A Chamada e a primeira aba de todos — sao duas por dia, uma por turma,
 * e uma so para o app inteiro. Depois dela, cada perfil ve so os setores
 * que usa.
 *
 * Dado sensivel (estatistica, relatorio, ficha da crianca) e so de ADM e
 * Secretaria. Treinador e professor veem nome e idade, que e o que a
 * chamada e a escalacao pedem. A excecao e o numero PRINCIPAL do
 * responsavel, que o professor ve para cobrar livro atrasado.
 */
export type Perfil = 'adm' | 'coordenador' | 'treinador' | 'professor' | 'secretaria'
export type Setor = 'jogo' | 'secretaria' | 'estudo'

type ConfigPerfil = {
  /** O que aparece no selo do topo. */
  rotulo: string
  setores: readonly Setor[]
  /** Estatistica, relatorio e ficha da crianca. */
  veDadosSensiveis: boolean
  /** Monta a escala dos tecnicos e a comissao. O treinador so ve. */
  editaEscala: boolean
  /** Cria acessos e mexe nos Ajustes do app. */
  administra: boolean
}

/** Quem esta logado, lido da conta no banco. */
export type Pessoa = {
  nome: string
  email: string
  iniciais: string
  /** endereco temporario da foto (bucket privado `perfis`) */
  foto?: string | null
  fotoPath?: string | null
}

const SEM_PESSOA: Pessoa = { nome: '', email: '', iniciais: '' }

export const PERFIS: Record<Perfil, ConfigPerfil> = {
  adm: {
    rotulo: 'Coordenação',
    setores: ['jogo', 'secretaria', 'estudo'],
    veDadosSensiveis: true,
    editaEscala: true,
    administra: true,
  },
  coordenador: {
    rotulo: 'Coord. técnica',
    setores: ['jogo'],
    veDadosSensiveis: false,
    editaEscala: true,
    administra: false,
  },
  treinador: {
    rotulo: 'Treinador',
    setores: ['jogo'],
    veDadosSensiveis: false,
    editaEscala: false,
    administra: false,
  },
  professor: {
    rotulo: 'Professor',
    setores: ['estudo'],
    veDadosSensiveis: false,
    editaEscala: false,
    administra: false,
  },
  secretaria: {
    rotulo: 'Secretaria',
    setores: ['secretaria'],
    veDadosSensiveis: true,
    editaEscala: false,
    administra: false,
  },
}

/**
 * O perfil de uma conta real sai de funcao + permissao, a mesma regra da
 * funcao `meu_perfil()` do banco (supabase/migrations). As duas precisam
 * andar juntas: o app decide o que MOSTRA, o banco decide o que ENTREGA.
 */
export type Funcao = 'treinador' | 'professor' | 'secretaria'
export type Permissao = 'ver_registrar' | 'coordenar_setor' | 'acesso_total'

export function perfilDe(funcao: Funcao | null, permissao: Permissao): Perfil | null {
  if (permissao === 'acesso_total') return 'adm'
  if (funcao === 'secretaria') return 'secretaria'
  if (funcao === 'treinador') return permissao === 'coordenar_setor' ? 'coordenador' : 'treinador'
  if (funcao === 'professor') return 'professor'
  return null
}

/**
 * Quem esta usando o app agora, lido da conta real no banco. Fora do React,
 * como os rascunhos.
 */
export const sessao = criarRascunho({
  /** Ha alguem logado? Sem isto, toda tela fica atras da guarda de sessao. */
  logado: false,
  /** O id da conta no Supabase (auth.uid). E ele que assina as marcas da chamada. */
  usuarioId: null as string | null,
  perfil: 'adm' as Perfil,
  /** funcao e permissao da conta, cruas: dizem quem administra cada setor */
  funcao: null as Funcao | null,
  permissao: 'ver_registrar' as Permissao,
  pessoa: null as Pessoa | null,
})

/**
 * Quem administra cada setor: o ADM (acesso total) e quem tem "Coordenar
 * setor" na funcao daquele setor. A Chamada e de todos os setores: qualquer
 * coordenador administra. So quem administra EXCLUI (o banco confere de novo:
 * administra_jogo(), administra_estudo()... no SQL de exclusao por setor).
 */
export function administracaoDe(funcao: Funcao | null, permissao: Permissao) {
  const total = permissao === 'acesso_total'
  const coordena = permissao === 'coordenar_setor'
  return {
    administraJogo: total || (coordena && funcao === 'treinador'),
    administraEstudo: total || (coordena && funcao === 'professor'),
    administraSecretaria: total || (coordena && funcao === 'secretaria'),
    administraChamada: total || coordena,
  }
}

export function usePerfil() {
  const { perfil, pessoa, funcao, permissao } = sessao.useValor()
  const config = PERFIS[perfil]
  return {
    perfil,
    ...config,
    ...administracaoDe(funcao, permissao),
    pessoa: pessoa ?? SEM_PESSOA,
  }
}
