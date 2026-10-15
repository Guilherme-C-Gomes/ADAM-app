import { useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback } from 'react'

import type { Turma } from '@/data/chamada'
import { iniciaisDe } from '@/data/jogo'
import { hojeISO, paraISO, deISO } from '@/data/metricas'
import { criarRascunho } from '@/hooks/use-rascunho'
import { todasAsLinhas } from '@/lib/consulta'
import { supabase } from '@/lib/supabase'

/**
 * O setor Estudo, no banco (telas 13 a 13s). Duas frentes, uma aba cada:
 * Biblioteca (o livro que a crianca leva para casa) e Devocional (a aula).
 *
 * Quem mexe: ADM e professor (`cuida_do_estudo` no banco). O professor ve
 * da crianca so nome, idade e turma (`criancas_basico`) e, para cobrar livro
 * atrasado, so o numero principal da familia (`contato_principal`).
 *
 * Os dados ficam numa memoria so, compartilhada pelas telas: o que muda
 * numa (emprestar, devolver, salvar) aparece igual em todas.
 */

export const ABAS_ESTUDO = ['Biblioteca', 'Devocional'] as const
export type AbaEstudo = (typeof ABAS_ESTUDO)[number]

// ─── turma (usada tambem pela Secretaria) ────────────────────────────

export type TurmaEstudo = 'Pequenos' | 'Maiores'

/** R1: a turma sai da idade. 12 ou mais vai para os Maiores. */
export function turmaDaIdade(idade: number): TurmaEstudo {
  return idade >= 12 ? 'Maiores' : 'Pequenos'
}

// ─── datas ───────────────────────────────────────────────────────────

/** "AAAA-MM-DD" daqui a `dias` dias. */
export function daquiA(dias: number) {
  const d = new Date()
  return paraISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias))
}

/** Dias de `de` ate `ate` (positivo se `ate` vem depois). */
export function diasEntre(de: string, ate: string) {
  return Math.round((deISO(ate).getTime() - deISO(de).getTime()) / 86400000)
}

/** "12/09" */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// ─── Biblioteca ──────────────────────────────────────────────────────

export type Livro = {
  id: string
  titulo: string
  tipo: string
  exemplares: number
  capaPath: string | null
  /** endereco temporario da capa (bucket privado) */
  capaUrl: string | null
  /** cor da capa desenhada quando nao ha foto */
  cor: string
}

export type Emprestimo = {
  id: string
  livroId: string
  criancaId: string
  emprestadoEm: string
  /** "AAAA-MM-DD" */
  entrega: string
  atrasado: boolean
  diasAtraso: number
}

/** O que o Estudo sabe da crianca: o mesmo que a chamada (sem dado sensivel). */
export type CriancaEstudo = {
  id: string
  nome: string
  iniciais: string
  idade: number
  turma: TurmaEstudo
}

/** Os tipos que o SQL do Estudo cria; valem ate ele rodar. */
const TIPOS_PADRAO = [
  'Bíblia infantil',
  'Devocional',
  'História bíblica',
  'Didático',
  'Literatura infantil',
]

const CORES = [
  '#5B2A86',
  '#2F5D8A',
  '#8A2F4E',
  '#2F7A5B',
  '#8A6A2F',
  '#3A0A52',
  '#2F4E8A',
  '#6A2F8A',
]
const corDe = (id: string) => CORES[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES.length]

type EstadoBiblioteca = {
  livros: Livro[]
  /** so os abertos (o livro ainda nao voltou) */
  emprestimos: Emprestimo[]
  tipos: string[]
  criancas: Record<string, CriancaEstudo>
  carregando: boolean
  erro: string | null
}

const biblioteca = criarRascunho<EstadoBiblioteca>({
  livros: [],
  emprestimos: [],
  tipos: [],
  criancas: {},
  carregando: true,
  erro: null,
})

let carregandoBiblioteca: Promise<void> | null = null

/** Le tudo da biblioteca de novo. Pedidos ao mesmo tempo viram um so. */
export function carregarBiblioteca() {
  carregandoBiblioteca ??= lerBiblioteca().finally(() => {
    carregandoBiblioteca = null
  })
  return carregandoBiblioteca
}

async function lerBiblioteca() {
  try {
    const [livros, emprestimos, tipos, criancas] = await Promise.all([
      todasAsLinhas<{
        id: string
        titulo: string
        tipo: string
        exemplares: number
        capa_path: string | null
      }>((de, ate) =>
        supabase
          .from('livros')
          .select('id, titulo, tipo, exemplares, capa_path')
          .order('titulo')
          .order('id')
          .range(de, ate),
      ),
      todasAsLinhas<{
        id: string
        livro_id: string
        crianca_id: string
        emprestado_em: string
        entrega: string
      }>((de, ate) =>
        supabase
          .from('emprestimos')
          .select('id, livro_id, crianca_id, emprestado_em, entrega')
          .is('devolvido_em', null)
          .order('entrega')
          .order('id')
          .range(de, ate),
      ),
      supabase.from('livro_tipos').select('nome').order('nome'),
      supabase.rpc('criancas_basico'),
    ])

    const caminhos = livros.flatMap((l) => (l.capa_path ? [l.capa_path] : []))
    const capas = new Map<string, string>()
    if (caminhos.length) {
      const { data } = await supabase.storage.from('capas').createSignedUrls(caminhos, 3600)
      for (const a of data ?? []) if (a.path && a.signedUrl) capas.set(a.path, a.signedUrl)
    }

    const hoje = hojeISO()
    // a lista de tipos: a tabela (SQL de 02/10) e, por garantia, os tipos
    // que os livros ja usam. Sem a tabela ainda, os tipos padrao.
    const nomesTipos = new Set<string>(
      tipos.error ? TIPOS_PADRAO : (tipos.data ?? []).map((t: { nome: string }) => t.nome),
    )
    for (const l of livros) nomesTipos.add(l.tipo)

    biblioteca.definir({
      livros: livros.map((l) => ({
        id: l.id,
        titulo: l.titulo,
        tipo: l.tipo,
        exemplares: l.exemplares,
        capaPath: l.capa_path,
        capaUrl: l.capa_path ? (capas.get(l.capa_path) ?? null) : null,
        cor: corDe(l.id),
      })),
      emprestimos: emprestimos.map((e) => ({
        id: e.id,
        livroId: e.livro_id,
        criancaId: e.crianca_id,
        emprestadoEm: e.emprestado_em,
        entrega: e.entrega,
        atrasado: e.entrega < hoje,
        diasAtraso: Math.max(0, diasEntre(e.entrega, hoje)),
      })),
      tipos: [...nomesTipos].sort((a, b) => a.localeCompare(b)),
      criancas: Object.fromEntries(
        ((criancas.data ?? []) as { id: string; nome: string; idade: number }[]).map((c) => [
          c.id,
          {
            id: c.id,
            nome: c.nome,
            iniciais: iniciaisDe(c.nome),
            idade: c.idade,
            turma: turmaDaIdade(c.idade),
          },
        ]),
      ),
      carregando: false,
      erro: null,
    })
  } catch {
    biblioteca.definir({ carregando: false, erro: 'Não foi possível carregar a biblioteca.' })
  }
}

/** A biblioteca, recarregada toda vez que a tela ganha foco. */
export function useBiblioteca() {
  useFocusEffect(
    useCallback(() => {
      carregarBiblioteca()
    }, []),
  )
  return biblioteca.useValor()
}

/** Exemplares na estante agora. */
export function disponiveis(livro: Livro, emprestimos: Emprestimo[]) {
  return livro.exemplares - emprestimos.filter((e) => e.livroId === livro.id).length
}

/** Tela 13g e seus seletores (13l, 13h, 13i). */
export const rascunhoEmprestar = criarRascunho({
  livroId: null as string | null,
  criancaId: null as string | null,
  /** "AAAA-MM-DD"; duas semanas e o padrao */
  entrega: '',
})

export function novoEmprestimo(livroId: string | null = null) {
  rascunhoEmprestar.definir({ livroId, criancaId: null, entrega: daquiA(14) })
}

/** Telas 13j/13k e seus seletores (13o, 13q). */
export const rascunhoLivro = criarRascunho({
  tipo: '' as string,
  /** foto nova, ainda no aparelho */
  capaUri: undefined as string | undefined,
})

export async function emprestar(livroId: string, criancaId: string, entrega: string) {
  // confere a estante no banco na hora: outra pessoa pode ter levado o ultimo
  const [{ data: livro }, { count }] = await Promise.all([
    supabase.from('livros').select('exemplares').eq('id', livroId).single(),
    supabase
      .from('emprestimos')
      .select('id', { count: 'exact', head: true })
      .eq('livro_id', livroId)
      .is('devolvido_em', null),
  ])
  if (livro && (count ?? 0) >= livro.exemplares) {
    throw new Error('Não sobrou exemplar na estante. Alguém levou o último agora há pouco.')
  }
  const { error } = await supabase
    .from('emprestimos')
    .insert({ livro_id: livroId, crianca_id: criancaId, entrega })
  if (error) throw new Error('Não foi possível registrar o empréstimo.')
  await carregarBiblioteca()
}

export async function devolver(emprestimoId: string) {
  const { error } = await supabase
    .from('emprestimos')
    .update({ devolvido_em: hojeISO() })
    .eq('id', emprestimoId)
  if (error) throw new Error('Não foi possível registrar a devolução.')
  await carregarBiblioteca()
}

export async function criarTipo(nome: string) {
  const { error } = await supabase.from('livro_tipos').insert({ nome })
  // tipo repetido (outra pessoa criou agora) nao e erro
  if (error && error.code !== '23505') {
    throw new Error(
      error.code === '42P01' || error.code === 'PGRST205'
        ? 'Falta rodar o SQL do Estudo no Supabase (tipos de livro).'
        : 'Não foi possível criar o tipo.',
    )
  }
  await carregarBiblioteca()
}

/** Manda um arquivo do aparelho para um bucket privado. */
async function enviar(bucket: string, caminho: string, uri: string, tipo?: string) {
  const dados = await (await fetch(uri)).arrayBuffer()
  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, dados, { contentType: tipo ?? 'application/octet-stream' })
  if (error) throw error
}

/** Grava o titulo (novo ou existente). A capa nova sobe junto. */
export async function salvarLivro(dados: {
  id?: string
  titulo: string
  tipo: string
  exemplares: number
  capaUri?: string
  capaAntiga?: string | null
}) {
  const linha = { titulo: dados.titulo.trim(), tipo: dados.tipo, exemplares: dados.exemplares }
  let id = dados.id
  if (id) {
    const { error } = await supabase.from('livros').update(linha).eq('id', id)
    if (error) throw new Error('Não foi possível salvar o livro.')
  } else {
    const { data, error } = await supabase.from('livros').insert(linha).select('id').single()
    if (error || !data) throw new Error('Não foi possível cadastrar o livro.')
    id = data.id as string
  }

  if (dados.capaUri) {
    // nome novo a cada troca: o banco so deixa enviar, nao sobrescrever
    const caminho = `livros/${id}/${Date.now()}.jpg`
    await enviar('capas', caminho, dados.capaUri, 'image/jpeg')
    await supabase.from('livros').update({ capa_path: caminho }).eq('id', id)
    if (dados.capaAntiga) await supabase.storage.from('capas').remove([dados.capaAntiga])
  }
  await carregarBiblioteca()
  return id
}

export type Contato = {
  nome: string
  relacao: string
  telefone: string
  whatsapp: boolean
  principal: boolean
}

const RELACAO: Record<string, string> = { mae: 'mãe', pai: 'pai', avo: 'avó', outro: 'responsável' }

/**
 * Quem procurar pelo livro. ADM ve todos os responsaveis; o professor so o
 * numero principal — e o banco so entrega se a crianca esta com livro.
 */
export async function lerContatos(criancaId: string, veTudo: boolean): Promise<Contato[]> {
  if (veTudo) {
    const { data, error } = await supabase
      .from('responsaveis')
      .select('nome, relacao, telefone, whatsapp, principal')
      .eq('crianca_id', criancaId)
      .order('principal', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => ({ ...r, relacao: RELACAO[r.relacao] ?? r.relacao }))
  }
  const { data, error } = await supabase.rpc('contato_principal', { p_crianca: criancaId })
  if (error) throw error
  return ((data ?? []) as Omit<Contato, 'principal'>[]).map((r) => ({
    ...r,
    relacao: RELACAO[r.relacao] ?? r.relacao,
    principal: true,
  }))
}

// ─── Devocional ──────────────────────────────────────────────────────

export type Material = { nome: string; path: string; tamanho?: string }

export type Aula = {
  id: string
  /** "AAAA-MM-DD" */
  data: string
  /** "08:00" */
  hora: string
  unidadeId: string
  turma: Turma
  professorId: string | null
  historia: string | null
  material: Material[]
  levar: string[]
}

export type Professor = { id: string; nome: string; iniciais: string }

type EstadoAulas = {
  aulas: Aula[]
  professores: Professor[]
  carregando: boolean
  erro: string | null
}

const devocional = criarRascunho<EstadoAulas>({
  aulas: [],
  professores: [],
  carregando: true,
  erro: null,
})

let carregandoAulas: Promise<void> | null = null

export function carregarAulas() {
  carregandoAulas ??= lerAulas().finally(() => {
    carregandoAulas = null
  })
  return carregandoAulas
}

async function lerAulas() {
  try {
    // de hoje em diante: a escala e o que vem
    const [aulas, professores] = await Promise.all([
      todasAsLinhas<{
        id: string
        data: string
        hora: string
        unidade_id: string
        turma: Turma
        professor_id: string | null
        historia: string | null
        material: Material[] | null
        levar: string[] | null
      }>((de, ate) =>
        supabase
          .from('aulas')
          .select('id, data, hora, unidade_id, turma, professor_id, historia, material, levar')
          .gte('data', hojeISO())
          .order('data')
          .order('hora')
          .order('id')
          .range(de, ate),
      ),
      supabase
        .from('usuarios')
        .select('id, nome')
        .eq('funcao', 'professor')
        .eq('ativo', true)
        .order('nome'),
    ])
    devocional.definir({
      aulas: aulas.map((a) => ({
        id: a.id,
        data: a.data,
        hora: String(a.hora).slice(0, 5),
        unidadeId: a.unidade_id,
        turma: a.turma,
        professorId: a.professor_id,
        historia: a.historia,
        material: a.material ?? [],
        levar: a.levar ?? [],
      })),
      professores: (professores.data ?? []).map((p) => ({
        id: p.id as string,
        nome: p.nome as string,
        iniciais: iniciaisDe(p.nome as string),
      })),
      carregando: false,
      erro: null,
    })
  } catch {
    devocional.definir({ carregando: false, erro: 'Não foi possível carregar as aulas.' })
  }
}

/** As aulas de hoje em diante, recarregadas quando a tela ganha foco. */
export function useAulas() {
  useFocusEffect(
    useCallback(() => {
      carregarAulas()
    }, []),
  )
  return devocional.useValor()
}

/** Sabado que vem (ou hoje, se hoje e sabado): o dia do devocional. */
export function proximoSabado() {
  const d = new Date()
  return daquiA((6 - d.getDay() + 7) % 7)
}

/** "08:00" vira "08h"; "08:30" vira "08h30". */
export const horaCurta = (h: string) =>
  h.endsWith(':00') ? `${h.slice(0, 2)}h` : h.slice(0, 5).replace(':', 'h')

export type ArquivoNovo = { nome: string; uri: string; tipo?: string; tamanho?: string }

const semAcento = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')

export async function salvarAula(dados: {
  id?: string
  data: string
  hora: string
  unidadeId: string
  turma: Turma
  professorId: string | null
  historia: string
  levar: string[]
  /** o material que ficou (o que saiu da lista e apagado) */
  material: Material[]
  materialAntes: Material[]
  novos: ArquivoNovo[]
}) {
  const linha = {
    data: dados.data,
    hora: dados.hora,
    unidade_id: dados.unidadeId,
    turma: dados.turma,
    professor_id: dados.professorId,
    historia: dados.historia.trim() || null,
    levar: dados.levar,
  }
  let id = dados.id
  if (id) {
    const { error } = await supabase.from('aulas').update(linha).eq('id', id)
    if (error) throw new Error('Não foi possível salvar a aula.')
  } else {
    const { data, error } = await supabase.from('aulas').insert(linha).select('id').single()
    if (error || !data) throw new Error('Não foi possível marcar a aula.')
    id = data.id as string
  }

  const material = [...dados.material]
  for (const arquivo of dados.novos) {
    const caminho = `aulas/${id}/${Date.now()}-${semAcento(arquivo.nome)}`
    try {
      await enviar('materiais', caminho, arquivo.uri, arquivo.tipo)
    } catch {
      throw new Error(
        'A aula foi salva, mas o arquivo não subiu. Confira se o SQL do Estudo já rodou no Supabase.',
      )
    }
    material.push({ nome: arquivo.nome, path: caminho, tamanho: arquivo.tamanho })
  }
  await supabase.from('aulas').update({ material }).eq('id', id)

  const saiu = dados.materialAntes.filter((m) => !material.some((x) => x.path === m.path))
  if (saiu.length) await supabase.storage.from('materiais').remove(saiu.map((m) => m.path))

  await carregarAulas()
  return id
}

/** Abre o PDF (ou a foto) da aula por um endereco temporario. */
export async function abrirMaterial(path: string) {
  const { data, error } = await supabase.storage.from('materiais').createSignedUrl(path, 600)
  if (error || !data) throw new Error('Não foi possível abrir o arquivo.')
  await WebBrowser.openBrowserAsync(data.signedUrl)
}
