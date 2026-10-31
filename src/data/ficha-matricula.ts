import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { mascaraTelefone } from '@/lib/telefone'

/**
 * A ficha de matricula da ADAM (a de papel, "Ficha de inscricao ADAM1"),
 * inteira: tudo o que nao cabe nas colunas de `criancas` (nome, nascimento,
 * unidade, foto, funcao) nem em `responsaveis` e `documentos`. Mora na
 * tabela `fichas_matricula`, uma linha por crianca, com o numero de
 * matricula. So ADM e Secretaria leem e gravam (RLS).
 *
 * Tudo texto (sim/nao tambem), um nivel so: o cadastro (participantes/
 * ficha/[parte].tsx) e a visualizacao (components/ficha-matricula.tsx)
 * saem da mesma lista de campos, PARTES, abaixo.
 */
export type FichaMatricula = {
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  escola: string
  turno: string
  serie: string
  aulasPorSemana: string
  dias: string
  nomeMae: string
  nomePai: string
  moraCom: string
  moraComQuem: string
  irmaos: string
  irmaosQuantos: string
  igreja: string
  igrejaQual: string
  cras: string
  crasUnidade: string
  urgenciaNome: string
  urgenciaTelefone: string
  saudeProblemas: string
  saudeDescricao: string
  alergias: string
  peso: string
  altura: string
  tipoSanguineo: string
  chuteira: string
  convenio: string
  convenioQual: string
  observacoes: string
  declaranteNome: string
  declaranteRg: string
  declaranteRgOrgao: string
  declaranteCpf: string
  declaranteVinculo: string
  autorizaImagem: string
}

export type Chave = keyof FichaMatricula

export const MATRICULA_VAZIA: FichaMatricula = {
  cep: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: 'Atibaia',
  escola: '',
  turno: '',
  serie: '',
  aulasPorSemana: '',
  dias: '',
  nomeMae: '',
  nomePai: '',
  moraCom: '',
  moraComQuem: '',
  irmaos: '',
  irmaosQuantos: '',
  igreja: '',
  igrejaQual: '',
  cras: '',
  crasUnidade: '',
  urgenciaNome: '',
  urgenciaTelefone: '',
  saudeProblemas: '',
  saudeDescricao: '',
  alergias: '',
  peso: '',
  altura: '',
  tipoSanguineo: '',
  chuteira: '',
  convenio: '',
  convenioQual: '',
  observacoes: '',
  declaranteNome: '',
  declaranteRg: '',
  declaranteRgOrgao: '',
  declaranteCpf: '',
  declaranteVinculo: '',
  autorizaImagem: '',
}

/** O que vier do banco (ou de uma ficha antiga) cai no formato de hoje. */
export function completar(dados: unknown): FichaMatricula {
  const d = (dados && typeof dados === 'object' ? dados : {}) as Record<string, unknown>
  const ficha = { ...MATRICULA_VAZIA }
  for (const chave of Object.keys(MATRICULA_VAZIA) as Chave[]) {
    if (typeof d[chave] === 'string') ficha[chave] = d[chave] as string
  }
  // ficha gravada antes de rua e numero serem separados: tudo era "endereco"
  if (!ficha.rua && typeof d.endereco === 'string') ficha.rua = d.endereco
  return ficha
}

// ─── os campos, por parte da ficha ───────────────────────────────────

export type Campo = {
  chave: Chave
  rotulo: string
  tipo?: 'texto' | 'multilinha' | 'telefone' | 'cep' | 'cpf' | 'numero'
  /** escolha entre opcoes: [valor, rotulo] */
  opcoes?: [string, string][]
  /** com opcoes: marca mais de uma (gravado separado por virgula) */
  multipla?: boolean
  /** so aparece quando outro campo tem um destes valores */
  se?: [Chave, string[]]
  placeholder?: string
}

const SIM_NAO: [string, string][] = [
  ['sim', 'Sim'],
  ['nao', 'Não'],
]

export const PARTES = {
  endereco: {
    titulo: 'Endereço',
    legenda: 'CEP, rua, número, bairro e cidade',
    campos: [
      { chave: 'cep', rotulo: 'CEP', tipo: 'cep', placeholder: '12940-000' },
      { chave: 'rua', rotulo: 'Rua' },
      { chave: 'numero', rotulo: 'Número', placeholder: 'Ex.: 120 ou S/N' },
      { chave: 'bairro', rotulo: 'Bairro' },
      { chave: 'cidade', rotulo: 'Cidade' },
    ],
  },
  escola: {
    titulo: 'Escola e treinos',
    legenda: 'Escola, turno, série e dias no projeto',
    campos: [
      { chave: 'escola', rotulo: 'Escola em que estuda' },
      {
        chave: 'turno',
        rotulo: 'Turno',
        opcoes: [
          ['manha', 'Manhã'],
          ['tarde', 'Tarde'],
          ['noite', 'Noite'],
          ['integral_manha_tarde', 'Integral (manhã/tarde)'],
          ['integral_tarde_noite', 'Integral (tarde/noite)'],
        ],
      },
      { chave: 'serie', rotulo: 'Série atual', placeholder: 'Ex.: 5º ano' },
      {
        chave: 'aulasPorSemana',
        rotulo: 'Aulas por semana no projeto',
        opcoes: [
          ['1', '1 vez'],
          ['2', '2 vezes'],
          ['3', '3 vezes'],
        ],
      },
      {
        chave: 'dias',
        rotulo: 'Quais dias vai',
        multipla: true,
        opcoes: [
          ['quarta', 'Quarta'],
          ['sabado', 'Sábado'],
        ],
      },
    ],
  },
  familia: {
    titulo: 'Família',
    legenda: 'Mãe, pai, com quem mora e urgência',
    campos: [
      { chave: 'nomeMae', rotulo: 'Nome da mãe' },
      { chave: 'nomePai', rotulo: 'Nome do pai' },
      {
        chave: 'moraCom',
        rotulo: 'Mora com quem',
        opcoes: [
          ['pai_e_mae', 'Pai e mãe'],
          ['mae', 'Mãe'],
          ['pai', 'Pai'],
          ['outros', 'Outros responsáveis'],
        ],
      },
      { chave: 'moraComQuem', rotulo: 'Quem?', se: ['moraCom', ['outros']] },
      { chave: 'irmaos', rotulo: 'Tem irmãos', opcoes: SIM_NAO },
      { chave: 'irmaosQuantos', rotulo: 'Quantos?', tipo: 'numero', se: ['irmaos', ['sim']] },
      {
        chave: 'igreja',
        rotulo: 'Frequenta alguma igreja',
        opcoes: [...SIM_NAO, ['as_vezes', 'Às vezes']],
      },
      { chave: 'igrejaQual', rotulo: 'Qual?', se: ['igreja', ['sim', 'as_vezes']] },
      { chave: 'cras', rotulo: 'Família atendida pelo CRAS Atibaia', opcoes: SIM_NAO },
      { chave: 'crasUnidade', rotulo: 'Qual unidade do CRAS?', se: ['cras', ['sim']] },
      { chave: 'urgenciaNome', rotulo: 'Em caso de urgência, chamar' },
      { chave: 'urgenciaTelefone', rotulo: 'Celular de urgência', tipo: 'telefone' },
    ],
  },
  saude: {
    titulo: 'Saúde',
    legenda: 'Problemas de saúde, alergias, medidas e convênio',
    campos: [
      { chave: 'saudeProblemas', rotulo: 'Tem problemas de saúde', opcoes: SIM_NAO },
      {
        chave: 'saudeDescricao',
        rotulo: 'Descreva',
        tipo: 'multilinha',
        se: ['saudeProblemas', ['sim']],
      },
      { chave: 'alergias', rotulo: 'Alergias', placeholder: 'Remédio, alimento…' },
      { chave: 'peso', rotulo: 'Peso (kg)', tipo: 'numero' },
      { chave: 'altura', rotulo: 'Altura (m)', placeholder: '1,40' },
      {
        chave: 'tipoSanguineo',
        rotulo: 'Tipo sanguíneo',
        opcoes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => [t, t]),
      },
      { chave: 'chuteira', rotulo: 'Tamanho da chuteira', tipo: 'numero' },
      { chave: 'convenio', rotulo: 'Convênio médico', opcoes: SIM_NAO },
      { chave: 'convenioQual', rotulo: 'Qual convênio?', se: ['convenio', ['sim']] },
      { chave: 'observacoes', rotulo: 'Observações da ficha', tipo: 'multilinha' },
    ],
  },
} satisfies Record<string, { titulo: string; legenda: string; campos: Campo[] }>

export type Parte = keyof typeof PARTES
export const ORDEM_DAS_PARTES = Object.keys(PARTES) as Parte[]

/** O campo aparece agora? (os "Qual?" so com a resposta que pede) */
export const campoVisivel = (c: Campo, f: FichaMatricula) => !c.se || c.se[1].includes(f[c.se[0]])

/** Quantos campos da parte estao preenchidos, entre os que aparecem. */
export function preenchidos(parte: Parte, f: FichaMatricula) {
  const campos = (PARTES[parte].campos as Campo[]).filter((c) => campoVisivel(c, f))
  return { feitos: campos.filter((c) => f[c.chave].trim()).length, total: campos.length }
}

const so = (t: string) => t.replace(/\D/g, '')
export const mascaraCpf = (t: string) =>
  so(t)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
export const mascaraCep = (t: string) =>
  so(t)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2')

/** Os valores marcados de um campo de varias escolhas ("quarta,sabado"). */
export const marcados = (v: string) =>
  v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

/** O valor para ler: o rotulo da opcao, ou o texto ja formatado. Vazio = ''. */
export function valorLegivel(c: Campo, f: FichaMatricula) {
  const v = f[c.chave].trim()
  if (!v) return ''
  if (c.tipo === 'telefone') return mascaraTelefone(v)
  if (c.tipo === 'cpf') return mascaraCpf(v)
  if (c.tipo === 'cep') return mascaraCep(v)
  const rotulo = (x: string) => c.opcoes?.find(([valor]) => valor === x)?.[1] ?? x
  if (c.multipla) return marcados(v).map(rotulo).join(' e ')
  return rotulo(v)
}

// ─── banco ───────────────────────────────────────────────────────────

const SEM_TABELA = 'Falta rodar o SQL da ficha de matrícula no Supabase.'
export const tabelaFaltando = (e: { code?: string } | null) =>
  e?.code === '42P01' || e?.code === 'PGRST205'

/** A ficha de matricula de uma crianca (vazia se ainda nao tem). */
export async function lerMatricula(criancaId: string) {
  const { data, error } = await supabase
    .from('fichas_matricula')
    .select('numero, dados')
    .eq('crianca_id', criancaId)
    .maybeSingle()
  if (error)
    throw new Error(
      tabelaFaltando(error) ? SEM_TABELA : 'Não foi possível ler a ficha de matrícula.',
    )
  return {
    numero: (data?.numero as number | undefined) ?? null,
    dados: completar(data?.dados),
  }
}

export async function gravarMatricula(criancaId: string, dados: FichaMatricula) {
  const { error } = await supabase
    .from('fichas_matricula')
    .upsert(
      { crianca_id: criancaId, dados, atualizado_em: new Date().toISOString() },
      { onConflict: 'crianca_id' },
    )
  if (error) throw new Error(tabelaFaltando(error) ? SEM_TABELA : 'Não foi possível gravar.')
}

export function useMatricula(criancaId: string | undefined) {
  const [estado, setEstado] = useState({
    numero: null as number | null,
    dados: null as FichaMatricula | null,
    erro: null as string | null,
  })
  const [vez, setVez] = useState(0)
  const recarregar = useCallback(() => setVez((v) => v + 1), [])
  useEffect(() => {
    let ativo = true
    if (!criancaId) return
    lerMatricula(criancaId).then(
      (r) => {
        if (ativo) setEstado({ numero: r.numero, dados: r.dados, erro: null })
      },
      (e: unknown) => {
        if (ativo) {
          setEstado({
            numero: null,
            dados: null,
            erro: e instanceof Error ? e.message : 'Não foi possível ler a ficha de matrícula.',
          })
        }
      },
    )
    return () => {
      ativo = false
    }
  }, [criancaId, vez])
  return { ...estado, recarregar }
}

/** Numero de matricula para mostrar: 7 -> "0007". */
export const numeroDaMatricula = (n: number | null) => (n ? String(n).padStart(4, '0') : '')

// ─── da inscricao pelo link ──────────────────────────────────────────

type Inscrita = {
  crianca: Record<string, string>
  familia: Record<string, string>
  saude: Record<string, string>
  declarante: Record<string, string | boolean>
}

/** A ficha que a familia mandou pelo link, no formato da ficha de matricula. */
export function deInscricao(d: Inscrita): FichaMatricula {
  const c = d.crianca ?? {}
  const f = d.familia ?? {}
  const s = d.saude ?? {}
  const decl = d.declarante ?? {}
  const t = (v: unknown) => (typeof v === 'string' ? v : '')
  return completar({
    cep: c.cep,
    rua: c.rua ?? c.endereco,
    numero: c.numero,
    bairro: c.bairro,
    cidade: c.cidade,
    escola: c.escola,
    turno: c.turno,
    serie: c.serie,
    aulasPorSemana: c.aulasPorSemana,
    dias: c.dias,
    nomeMae: f.nomeMae,
    nomePai: f.nomePai,
    moraCom: f.moraCom,
    moraComQuem: f.moraComQuem,
    irmaos: f.irmaos,
    irmaosQuantos: f.irmaosQuantos,
    igreja: f.igreja,
    igrejaQual: f.igrejaQual,
    cras: f.cras,
    crasUnidade: f.crasUnidade,
    urgenciaNome: f.urgenciaNome,
    urgenciaTelefone: f.urgenciaTelefone,
    saudeProblemas: s.problemas,
    saudeDescricao: s.descricao,
    alergias: s.alergias,
    peso: s.peso,
    altura: s.altura,
    tipoSanguineo: s.tipoSanguineo,
    chuteira: s.chuteira,
    convenio: s.convenio,
    convenioQual: s.convenioQual,
    observacoes: s.observacoes,
    declaranteNome: t(decl.nome),
    declaranteRg: t(decl.rg),
    declaranteRgOrgao: t(decl.rgOrgao),
    declaranteCpf: t(decl.cpf),
    declaranteVinculo: t(decl.vinculo),
    autorizaImagem:
      decl.autorizaImagem === true ? 'sim' : decl.autorizaImagem === false ? 'nao' : '',
  })
}
