import { useCallback, useEffect, useState } from 'react'

import { turmaDaIdade, type TurmaEstudo } from '@/data/estudo'
import { iniciaisDe } from '@/data/jogo'
import { FICHA_VAZIA, rascunhoFicha, type Anexo, type Contato } from '@/data/rascunhos'
import { deISO, paraISO as dataParaISO } from '@/data/metricas'
import { porLotes, todasAsLinhas } from '@/lib/consulta'
import { supabase } from '@/lib/supabase'

/**
 * A ficha da crianca, no banco: `criancas`, `responsaveis`, `documentos` e
 * os arquivos no bucket privado `fichas` do Storage.
 *
 * Tudo aqui e dado sensivel: so ADM e Secretaria leem e escrevem (RLS do
 * banco e do Storage). Treinador e professor veem nome e idade por outra
 * porta (`criancas_basico`, em data/chamada.ts).
 */

// ─── documentos ───────────────────────────────────────────────────────

/** A lista fixa da ficha. A ordem e a das telas (o indice do rascunho). */
export const DOCUMENTOS = [
  { tipo: 'rg_certidao', nome: 'RG ou certidão de nascimento' },
  { tipo: 'comprovante_residencia', nome: 'Comprovante de residência' },
  { tipo: 'isencao_responsabilidade', nome: 'Isenção de responsabilidade' },
  { tipo: 'direito_imagem', nome: 'Direito de imagem' },
] as const

// ─── datas, sem Intl (o Hermes do Expo Go cai com pt-BR) ─────────────

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "DD/MM/AAAA" -> "AAAA-MM-DD", ou null se a data nao existe. */
export function paraISO(br: string) {
  const [dia, mes, ano] = br.split('/').map((n) => Number(n))
  if (!dia || !mes || !ano || ano < 1900) return null
  const d = new Date(ano, mes - 1, dia)
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** "AAAA-MM-DD" -> "DD/MM/AAAA". */
export function paraBR(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Idade hoje, a partir de "AAAA-MM-DD". */
export function idadeDe(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
  return idade
}

/** "março de 2024" */
export function mesPorExtenso(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}

// ─── a crianca como as telas da Secretaria a mostram ─────────────────

export type Participante = {
  id: string
  nome: string
  iniciais: string
  idade: number
  turma: TurmaEstudo
  unidadeId: string
  unidade: string
  desde: string
  observacao: string
  fotoPath: string | null
  /** endereco temporario (1 hora) da foto, ja assinado */
  fotoUrl: string | null
  posicao: string | null
  /** presencas / chamadas encerradas da turma dele nas ultimas 8 semanas */
  frequencia: number | null
  presencas: number
  chamadas: number
  /** uma por semana, da mais antiga para a mais recente; null = sem chamada */
  semanas: (boolean | null)[]
  documentosEntregues: number
  temResponsavel: boolean
}

const SEMANAS = 8

/** Abaixo disto a crianca esta "em queda" — a mesma regra em todas as telas. */
export const LIMITE_BAIXA_FREQUENCIA = 60

/** Em queda: abaixo do limite. Quem ainda nao teve chamada nao entra na conta. */
export const emQueda = (p: Participante) =>
  p.frequencia !== null && p.frequencia < LIMITE_BAIXA_FREQUENCIA

type LinhaCrianca = {
  id: string
  nome: string
  nascimento: string
  unidade_id: string
  posicao: string | null
  foto_path: string | null
  observacao: string | null
  desde: string
  unidades: { nome: string } | null
  documentos: { tipo: string }[]
  responsaveis: { id: string }[]
}

async function lerParticipantes(id?: string): Promise<Participante[]> {
  const criancas = (await todasAsLinhas((de, ate) => {
    let consulta = supabase
      .from('criancas')
      .select(
        'id, nome, nascimento, unidade_id, posicao, foto_path, observacao, desde, unidades(nome), documentos(tipo), responsaveis(id)',
      )
      .eq('ativa', true)
    if (id) consulta = consulta.eq('id', id)
    return consulta.order('nome').order('id').range(de, ate)
  })) as unknown as LinhaCrianca[]

  // As fotos moram no bucket privado: um pedido so assina todas.
  const caminhos = criancas.flatMap((c) => (c.foto_path ? [c.foto_path] : []))
  const fotos = new Map<string, string>()
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage
      .from('fichas')
      .createSignedUrls(caminhos, 3600)
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) fotos.set(a.path, a.signedUrl)
  }

  // A frequencia sai das chamadas ENCERRADAS das ultimas 8 semanas (56
  // dias contando hoje): so a chamada que subiu conta, e a falta e quem
  // ninguem marcou. Tudo em data local "AAAA-MM-DD", sem fuso no meio.
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (SEMANAS * 7 - 1))
  const desdeISO = dataParaISO(inicio)
  const chamadas = await todasAsLinhas<{
    id: string
    data: string
    unidade_id: string
    turma: string
  }>((de, ate) =>
    supabase
      .from('chamadas')
      .select('id, data, unidade_id, turma')
      .eq('estado', 'encerrada')
      .gte('data', desdeISO)
      .order('id')
      .range(de, ate),
  )
  const marcas = await porLotes(
    chamadas.map((c) => c.id),
    (lote) =>
      todasAsLinhas<{ chamada_id: string; crianca_id: string }>((de, ate) =>
        supabase
          .from('chamada_marcas')
          .select('chamada_id, crianca_id')
          .in('chamada_id', lote)
          .order('chamada_id')
          .order('crianca_id')
          .range(de, ate),
      ),
  )
  const presente = new Set(marcas.map((m) => `${m.chamada_id}:${m.crianca_id}`))
  const semanaDe = (data: string) =>
    Math.floor(Math.round((deISO(data).getTime() - inicio.getTime()) / 86400000) / 7)

  return criancas.map((c) => {
    const idade = idadeDe(c.nascimento)
    const turma = turmaDaIdade(idade)
    const daTurma = chamadas.filter(
      (ch) =>
        ch.unidade_id === c.unidade_id &&
        ch.turma === (turma === 'Maiores' ? 'maiores' : 'pequenos') &&
        ch.data >= c.desde,
    )
    const semanas: (boolean | null)[] = Array(SEMANAS).fill(null)
    let presencas = 0
    for (const ch of daTurma) {
      const veio = presente.has(`${ch.id}:${c.id}`)
      if (veio) presencas++
      const i = semanaDe(ch.data)
      semanas[i] = (semanas[i] ?? false) || veio
    }
    return {
      id: c.id,
      nome: c.nome,
      iniciais: iniciaisDe(c.nome),
      idade,
      turma,
      unidadeId: c.unidade_id,
      unidade: c.unidades?.nome ?? '',
      desde: mesPorExtenso(c.desde),
      observacao: c.observacao ?? '',
      fotoPath: c.foto_path,
      fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
      posicao: c.posicao,
      frequencia: daTurma.length ? Math.round((presencas / daTurma.length) * 100) : null,
      presencas,
      chamadas: daTurma.length,
      semanas,
      documentosEntregues: new Set(c.documentos.map((d) => d.tipo)).size,
      temResponsavel: c.responsaveis.length > 0,
    }
  })
}

type EstadoParticipantes = {
  lista: Participante[]
  carregando: boolean
  erro: string | null
  /** "HH:MM" da ultima carga */
  atualizadoEm: string
}

const horaAgora = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * As criancas ativas com frequencia, para as listas da Secretaria. Com
 * `id`, so aquela crianca (o perfil).
 */
export function useParticipantes(id?: string) {
  const [estado, setEstado] = useState<EstadoParticipantes>({
    lista: [],
    carregando: true,
    erro: null,
    atualizadoEm: '',
  })

  const buscar = useCallback(
    () =>
      lerParticipantes(id).then(
        (lista): EstadoParticipantes => ({
          lista,
          carregando: false,
          erro: null,
          atualizadoEm: horaAgora(),
        }),
        (): EstadoParticipantes => ({
          lista: [],
          carregando: false,
          erro: 'Não foi possível carregar as fichas.',
          atualizadoEm: '',
        }),
      ),
    [id],
  )
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

// ─── a ficha: abrir e salvar ─────────────────────────────────────────

const RELACAO_BANCO: Record<Contato['relacao'], string> = {
  Mãe: 'mae',
  Pai: 'pai',
  Avó: 'avo',
  Outro: 'outro',
}
const RELACAO_TELA: Record<string, Contato['relacao']> = {
  mae: 'Mãe',
  pai: 'Pai',
  avo: 'Avó',
  outro: 'Outro',
}
const POSICAO_BANCO = {
  Goleiro: 'goleiro',
  Defesa: 'defesa',
  Meio: 'meio',
  Ataque: 'ataque',
} as const
const POSICAO_TELA: Record<string, NonNullable<typeof FICHA_VAZIA.funcao>> = {
  goleiro: 'Goleiro',
  defesa: 'Defesa',
  meio: 'Meio',
  ataque: 'Ataque',
}

/** Abre uma ficha existente no rascunho, para editar. */
export async function abrirFicha(id: string) {
  const [crianca, responsaveis, documentos] = await Promise.all([
    supabase
      .from('criancas')
      .select('id, nome, nascimento, unidade_id, posicao, foto_path, observacao')
      .eq('id', id)
      .single(),
    supabase
      .from('responsaveis')
      .select('nome, relacao, telefone, whatsapp, principal')
      .eq('crianca_id', id)
      .order('criado_em'),
    supabase.from('documentos').select('tipo').eq('crianca_id', id),
  ])
  if (crianca.error) throw crianca.error
  const c = crianca.data
  const tipos = new Set((documentos.data ?? []).map((d) => d.tipo))
  rascunhoFicha.definir({
    ...FICHA_VAZIA,
    id: c.id,
    nome: c.nome,
    nascimento: paraBR(c.nascimento),
    unidadeId: c.unidade_id,
    fotoPath: c.foto_path ?? undefined,
    funcao: c.posicao ? POSICAO_TELA[c.posicao] : null,
    observacao: c.observacao ?? '',
    contatos: (responsaveis.data ?? []).map((r) => ({
      nome: r.nome,
      relacao: RELACAO_TELA[r.relacao] ?? 'Outro',
      telefone: r.telefone,
      whatsapp: r.whatsapp,
      principal: r.principal,
    })),
    documentos: DOCUMENTOS.flatMap((d, i) => (tipos.has(d.tipo) ? [i] : [])),
  })
}

export function novaFicha() {
  rascunhoFicha.definir({ ...FICHA_VAZIA })
}

/** Manda um arquivo do aparelho para o bucket privado `fichas`. */
async function enviarArquivo(caminho: string, uri: string, tipo?: string) {
  const resposta = await fetch(uri)
  const dados = await resposta.arrayBuffer()
  const { error } = await supabase.storage
    .from('fichas')
    .upload(caminho, dados, { contentType: tipo ?? 'application/octet-stream', upsert: true })
  if (error) throw error
}

const extensao = (anexo: Anexo) =>
  anexo.nome.includes('.')
    ? anexo.nome.split('.').pop()!.toLowerCase()
    : anexo.tipo === 'application/pdf'
      ? 'pdf'
      : 'jpg'

/**
 * Grava o rascunho inteiro: a crianca, a foto, os responsaveis e os
 * documentos. Devolve o id. Um responsavel principal so por ficha — o
 * banco tambem garante isso (indice unico).
 */
export async function salvarFicha() {
  const f = rascunhoFicha.ler()
  const nascimento = paraISO(f.nascimento)
  if (!f.nome.trim()) throw new Error('Escreva o nome da criança.')
  if (!nascimento) throw new Error('A data de nascimento precisa ser DD/MM/AAAA.')
  if (!f.unidadeId) throw new Error('Escolha a unidade.')

  const dados = {
    nome: f.nome.trim(),
    nascimento,
    unidade_id: f.unidadeId,
    posicao: f.funcao ? POSICAO_BANCO[f.funcao] : null,
    observacao: f.observacao.trim() || null,
  }

  let id = f.id
  if (id) {
    const { error } = await supabase.from('criancas').update(dados).eq('id', id)
    if (error) throw new Error('Não foi possível salvar a ficha.')
  } else {
    const { data, error } = await supabase.from('criancas').insert(dados).select('id').single()
    if (error || !data) throw new Error('Não foi possível criar a ficha.')
    id = data.id
    rascunhoFicha.definir({ id })
  }

  // foto: so sobe se a pessoa escolheu uma nova agora
  if (f.fotoUri) {
    const caminho = `criancas/${id}/foto.jpg`
    await enviarArquivo(caminho, f.fotoUri, 'image/jpeg')
    await supabase.from('criancas').update({ foto_path: caminho }).eq('id', id)
  } else if (!f.fotoPath) {
    await supabase.from('criancas').update({ foto_path: null }).eq('id', id)
  }

  // responsaveis: a lista da tela e a verdade; troca a antiga inteira
  await supabase.from('responsaveis').delete().eq('crianca_id', id)
  const contatos = f.contatos.filter((c) => c.nome.trim() && c.telefone.trim())
  // um principal so: se nenhum foi marcado, o primeiro vira o principal
  const temPrincipal = contatos.some((c) => c.principal)
  if (contatos.length) {
    const { error } = await supabase.from('responsaveis').insert(
      contatos.map((c, i) => ({
        crianca_id: id,
        nome: c.nome.trim(),
        relacao: RELACAO_BANCO[c.relacao],
        telefone: c.telefone.trim(),
        whatsapp: c.whatsapp,
        principal: temPrincipal ? c.principal : i === 0,
      })),
    )
    if (error) throw new Error('A ficha foi salva, mas os responsáveis não. Abra e salve de novo.')
  }

  // documentos: marca os entregues, apaga os que deixaram de estar
  const entregues = new Set(f.documentos)
  for (const [i, d] of DOCUMENTOS.entries()) {
    if (!entregues.has(i)) {
      await supabase.from('documentos').delete().eq('crianca_id', id).eq('tipo', d.tipo)
      continue
    }
    const anexo = f.anexos[i]
    let arquivo_path: string | undefined
    if (anexo?.uri) {
      arquivo_path = `criancas/${id}/documentos/${d.tipo}.${extensao(anexo)}`
      await enviarArquivo(arquivo_path, anexo.uri, anexo.tipo)
    }
    await supabase.from('documentos').upsert(
      {
        crianca_id: id,
        tipo: d.tipo,
        entregue_em: hojeISO(),
        ...(arquivo_path ? { arquivo_path } : {}),
      },
      { onConflict: 'crianca_id,tipo', ignoreDuplicates: !arquivo_path },
    )
  }

  return id as string
}

/** Endereco temporario (1 hora) para mostrar a foto do bucket privado. */
export function useFotoFicha(caminho: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    if (!caminho) return
    supabase.storage
      .from('fichas')
      .createSignedUrl(caminho, 3600)
      .then(({ data }) => {
        if (ativo) setUrl(data?.signedUrl ?? null)
      })
    return () => {
      ativo = false
    }
  }, [caminho])
  return caminho ? url : null
}

/**
 * Exclui a ficha de vez: a crianca, responsaveis, documentos, presencas e
 * emprestimos (o banco apaga junto), e os arquivos dela no Storage. So o
 * ADM — o banco recusa os outros, mesmo a Secretaria.
 */
export async function excluirFicha(id: string) {
  const { data, error } = await supabase.from('criancas').delete().eq('id', id).select('id')
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'Falta rodar o SQL de exclusão no Supabase.'
        : 'Não foi possível excluir a ficha.',
    )
  }
  // o banco nao apagou nada: quem pediu nao e ADM
  if (!data?.length) throw new Error('Só a coordenação (acesso total) exclui fichas.')

  const pasta = `criancas/${id}`
  const [raiz, docs] = await Promise.all([
    supabase.storage.from('fichas').list(pasta),
    supabase.storage.from('fichas').list(`${pasta}/documentos`),
  ])
  const arquivos = [
    ...(raiz.data ?? []).filter((f) => f.id).map((f) => `${pasta}/${f.name}`),
    ...(docs.data ?? []).map((f) => `${pasta}/documentos/${f.name}`),
  ]
  if (arquivos.length) await supabase.storage.from('fichas').remove(arquivos)
}
