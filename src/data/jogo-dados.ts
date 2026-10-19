import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Turma } from '@/data/chamada'
import { iniciaisDe, type Categoria, type CategoriaExercicio, type Modalidade } from '@/data/jogo'
import { deISO, hojeISO, intervaloDo, paraISO, type Periodo } from '@/data/metricas'
import { criarRascunho } from '@/hooks/use-rascunho'
import { todasAsLinhas } from '@/lib/consulta'
import { supabase } from '@/lib/supabase'

/**
 * O setor Jogo no banco (SQL 20261008120000_jogo.sql): treinos com a lista
 * de exercicios e a avaliacao, a biblioteca de exercicios, a escala semanal
 * dos tecnicos e os jogos com convocacao, comissao, tatica e placar.
 *
 * Treinos, biblioteca, escala e equipe ficam numa memoria so, compartilhada
 * pelas telas (o que muda numa aparece em todas). Jogos se leem por periodo
 * e um a um.
 */

export const FALTA_SQL_JOGO = 'Falta rodar o SQL do Jogo no Supabase.'

/** Erro de tabela ou ligacao que ainda nao existe no banco. */
const semTabela = (e: unknown) => {
  const codigo = (e as { code?: string } | null)?.code
  return codigo === '42P01' || codigo === 'PGRST200' || codigo === 'PGRST205'
}

// ─── tipos ───────────────────────────────────────────────────────────

export type PessoaEquipe = { id: string; nome: string; iniciais: string; funcao: string | null }

export type Exercicio = {
  id: string
  nome: string
  categoria: CategoriaExercicio
  duracaoMin: number
  material: string | null
  descricao: string | null
  video: string | null
}

export type ItemTreino = { exercicioId: string; ordem: number; duracaoMin: number; feito: boolean }

export type Treino = {
  id: string
  /** "AAAA-MM-DD" */
  data: string
  /** "08:00" */
  hora: string
  unidadeId: string
  turma: Turma
  local: string | null
  /** null = "a definir" (R7) */
  responsavelId: string | null
  comissao: string[]
  exercicios: ItemTreino[]
  encerrado: boolean
  avaliado: boolean
}

export type LinhaEscala = {
  id: string
  unidadeId: string
  /** 0 = domingo ... 6 = sabado */
  diaSemana: number
  hora: string
  turma: Turma
  tecnicoId: string | null
}

export type Notas = {
  treino: number | null
  entenderam: number | null
  dificuldade: number | null
}

export type UltimaAvaliacao = Notas & { data: string; turma: Turma }

export type Jogo = {
  id: string
  campeonato: string | null
  adversario: string
  categoria: string
  modalidade: Modalidade
  data: string
  hora: string
  local: string
  formacao: string | null
  golsAdam: number | null
  golsAdversario: number | null
}

export type Situacao = 'campo' | 'banco'

/** O que o Jogo sabe da crianca: o mesmo da chamada, mais a posicao (R4). */
export type Atleta = {
  id: string
  nome: string
  iniciais: string
  idade: number
  unidadeId: string
  posicao: 'goleiro' | 'defesa' | 'meio' | 'ataque' | null
}

export const NOME_POSICAO: Record<NonNullable<Atleta['posicao']>, string> = {
  goleiro: 'Goleiro',
  defesa: 'Defesa',
  meio: 'Meio',
  ataque: 'Ataque',
}

// ─── conversoes ──────────────────────────────────────────────────────

const hora5 = (h: unknown) => String(h ?? '').slice(0, 5)
const MODALIDADE_TELA: Record<string, Modalidade> = { campo: 'Campo', society: 'Society' }
const MODALIDADE_BANCO: Record<Modalidade, string> = { Campo: 'campo', Society: 'society' }

/** "08:00" vira "08h"; "08:30" vira "08h30". */
export const horaCurta = (h: string) =>
  h.endsWith(':00') ? `${h.slice(0, 2)}h` : h.slice(0, 5).replace(':', 'h')

/** "12/09" */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

type LinhaTreino = {
  id: string
  data: string
  hora: string
  unidade_id: string
  turma: Turma
  local: string | null
  responsavel_id: string | null
  encerrado_em: string | null
  treino_exercicios: { exercicio_id: string; ordem: number; duracao_min: number; feito: boolean }[]
  treino_comissao: { usuario_id: string }[]
  treino_avaliacoes: { treino_id: string } | { treino_id: string }[] | null
}

const CAMPOS_TREINO =
  'id, data, hora, unidade_id, turma, local, responsavel_id, encerrado_em, treino_exercicios(exercicio_id, ordem, duracao_min, feito), treino_comissao(usuario_id), treino_avaliacoes(treino_id)'

function paraTreino(t: LinhaTreino): Treino {
  const avaliacao = t.treino_avaliacoes
  return {
    id: t.id,
    data: t.data,
    hora: hora5(t.hora),
    unidadeId: t.unidade_id,
    turma: t.turma,
    local: t.local,
    responsavelId: t.responsavel_id,
    comissao: (t.treino_comissao ?? []).map((c) => c.usuario_id),
    exercicios: (t.treino_exercicios ?? [])
      .map((e) => ({
        exercicioId: e.exercicio_id,
        ordem: e.ordem,
        duracaoMin: e.duracao_min,
        feito: e.feito,
      }))
      .sort((a, b) => a.ordem - b.ordem),
    encerrado: !!t.encerrado_em,
    avaliado: Array.isArray(avaliacao) ? avaliacao.length > 0 : !!avaliacao,
  }
}

function paraJogo(j: Record<string, unknown>): Jogo {
  return {
    id: j.id as string,
    campeonato: (j.campeonato as string | null) ?? null,
    adversario: j.adversario as string,
    categoria: j.categoria as string,
    modalidade: MODALIDADE_TELA[j.modalidade as string] ?? 'Campo',
    data: j.data as string,
    hora: hora5(j.hora),
    local: j.local as string,
    formacao: (j.formacao as string | null) ?? null,
    golsAdam: (j.gols_adam as number | null) ?? null,
    golsAdversario: (j.gols_adversario as number | null) ?? null,
  }
}

const somarDias = (iso: string, dias: number) => {
  const d = deISO(iso)
  return paraISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias))
}

// ─── memoria compartilhada: treinos, biblioteca, escala, equipe ─────

type EstadoJogo = {
  treinos: Treino[]
  exercicios: Exercicio[]
  escala: LinhaEscala[]
  equipe: PessoaEquipe[]
  ultimaAvaliacao: UltimaAvaliacao | null
  carregando: boolean
  erro: string | null
}

const memoria = criarRascunho<EstadoJogo>({
  treinos: [],
  exercicios: [],
  escala: [],
  equipe: [],
  ultimaAvaliacao: null,
  carregando: true,
  erro: null,
})

let carregando: Promise<void> | null = null

export function carregarJogo() {
  carregando ??= lerJogo().finally(() => {
    carregando = null
  })
  return carregando
}

async function lerJogo() {
  try {
    // de duas semanas atras em diante: o de hoje, os proximos e os recentes
    const desde = somarDias(hojeISO(), -14)
    const [treinos, exercicios, escala, equipe, ultima] = await Promise.all([
      todasAsLinhas<LinhaTreino>((de, ate) =>
        supabase
          .from('treinos')
          .select(CAMPOS_TREINO)
          .gte('data', desde)
          .order('data')
          .order('hora')
          .order('id')
          .range(de, ate),
      ),
      todasAsLinhas<Record<string, unknown>>((de, ate) =>
        supabase.from('exercicios').select('*').order('nome').order('id').range(de, ate),
      ),
      supabase.from('escala').select('*').order('dia_semana').order('hora'),
      supabase.from('usuarios').select('id, nome, funcao').eq('ativo', true).order('nome'),
      supabase
        .from('treinos')
        .select('data, turma, treino_avaliacoes!inner(nota_treino, entenderam, dificuldade)')
        .order('data', { ascending: false })
        .order('hora', { ascending: false })
        .limit(1),
    ])
    if (escala.error) throw escala.error
    // sem a equipe, nomes e comissao sairiam como "ninguem": melhor o erro
    if (equipe.error) throw equipe.error

    const ult = ultima.data?.[0] as
      | {
          data: string
          turma: Turma
          treino_avaliacoes:
            | { nota_treino: number | null; entenderam: number | null; dificuldade: number | null }
            | {
                nota_treino: number | null
                entenderam: number | null
                dificuldade: number | null
              }[]
        }
      | undefined
    const notas = ult
      ? Array.isArray(ult.treino_avaliacoes)
        ? ult.treino_avaliacoes[0]
        : ult.treino_avaliacoes
      : null

    memoria.definir({
      treinos: treinos.map(paraTreino),
      exercicios: exercicios.map((e) => ({
        id: e.id as string,
        nome: e.nome as string,
        categoria: e.categoria as CategoriaExercicio,
        duracaoMin: e.duracao_min as number,
        material: (e.material as string | null) ?? null,
        descricao: (e.descricao as string | null) ?? null,
        video: (e.video as string | null) ?? null,
      })),
      escala: (escala.data ?? []).map((l) => ({
        id: l.id as string,
        unidadeId: l.unidade_id as string,
        diaSemana: l.dia_semana as number,
        hora: hora5(l.hora),
        turma: l.turma as Turma,
        tecnicoId: (l.tecnico_id as string | null) ?? null,
      })),
      equipe: (equipe.data ?? []).map((u) => ({
        id: u.id as string,
        nome: u.nome as string,
        iniciais: iniciaisDe(u.nome as string),
        funcao: (u.funcao as string | null) ?? null,
      })),
      ultimaAvaliacao:
        ult && notas
          ? {
              data: ult.data,
              turma: ult.turma,
              treino: notas.nota_treino,
              entenderam: notas.entenderam,
              dificuldade: notas.dificuldade,
            }
          : null,
      carregando: false,
      erro: null,
    })
  } catch (e) {
    memoria.definir({
      carregando: false,
      erro: semTabela(e) ? FALTA_SQL_JOGO : 'Não foi possível carregar o Jogo.',
    })
  }
}

/** Treinos, biblioteca, escala e equipe — recarregados quando a tela ganha foco. */
export function useJogo() {
  useFocusEffect(
    useCallback(() => {
      carregarJogo()
    }, []),
  )
  return memoria.useValor()
}

/** O nome de quem e o id; null vira "a definir". */
export function nomeNaEquipe(equipe: PessoaEquipe[], id: string | null) {
  if (!id) return null
  return equipe.find((p) => p.id === id)?.nome ?? 'sem acesso ao app'
}

// ─── rascunhos dos formularios ───────────────────────────────────────

/** Tela 11f · Planejar treino. R19: esta lista e a que vai para o campo. */
export const rascunhoTreino = criarRascunho({
  id: null as string | null,
  unidadeId: null as string | null,
  turma: 'pequenos' as Turma,
  data: '',
  hora: '08:00',
  local: '',
  responsavelId: null as string | null,
  comissao: [] as string[],
  exercicios: [] as { exercicioId: string; duracaoMin: number }[],
})

/** Abre o formulario: um treino que ja existe, ou um novo para o proximo sabado. */
export function abrirPlano(treino?: Treino) {
  if (treino) {
    rascunhoTreino.definir({
      id: treino.id,
      unidadeId: treino.unidadeId,
      turma: treino.turma,
      data: treino.data,
      hora: treino.hora,
      local: treino.local ?? '',
      responsavelId: treino.responsavelId,
      comissao: treino.comissao,
      exercicios: treino.exercicios.map((e) => ({
        exercicioId: e.exercicioId,
        duracaoMin: e.duracaoMin,
      })),
    })
    return
  }
  const hoje = new Date()
  const sabado = paraISO(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + ((6 - hoje.getDay() + 7) % 7)),
  )
  rascunhoTreino.definir({
    id: null,
    unidadeId: null,
    turma: 'pequenos',
    data: sabado,
    hora: '08:00',
    local: '',
    responsavelId: null,
    comissao: [],
    exercicios: [],
  })
}

/** Tela 11g · Adicionar jogo. */
export const rascunhoJogo = criarRascunho({
  id: null as string | null,
  campeonato: '',
  adversario: '',
  categoria: 'Sub-14' as Categoria,
  data: '',
  hora: '15:00',
  local: '',
  modalidade: 'Campo' as Modalidade,
})

export function novoJogo() {
  const hoje = new Date()
  const domingo = paraISO(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + ((7 - hoje.getDay()) % 7 || 7)),
  )
  rascunhoJogo.definir({
    id: null,
    campeonato: '',
    adversario: '',
    categoria: 'Sub-14',
    data: domingo,
    hora: '15:00',
    local: '',
    modalidade: 'Campo',
  })
}

/** Tela 11j · novo exercicio: a categoria vem da tela 11z. */
export const rascunhoExercicio = criarRascunho({
  categoria: 'Físico' as CategoriaExercicio,
})

/** Tela 11x · filtros da lista de jogos. */
export const rascunhoFiltroJogos = criarRascunho({
  categoria: 'Todas' as Categoria | 'Todas',
  periodo: 'Mês' as Extract<Periodo, 'Semana' | 'Mês' | 'Ano'>,
  passo: 0,
})

// ─── treinos: gravar ─────────────────────────────────────────────────

/**
 * Troca as linhas de uma ligacao (lista de exercicios, comissao) sem nunca
 * deixa-la vazia no meio do caminho: primeiro grava as novas (upsert pela
 * chave primaria), so depois tira as que sairam. Se algo falhar, fica a
 * lista antiga ou uma mistura, nunca nada. Devolve false se falhou.
 */
async function trocarLigacoes(
  tabela: string,
  colunaDono: string,
  dono: string,
  colunaItem: string,
  todas: Record<string, unknown>[],
) {
  // o mesmo item duas vezes estouraria a chave primaria: vale o primeiro
  const linhas = todas.filter(
    (l, i) => todas.findIndex((o) => o[colunaItem] === l[colunaItem]) === i,
  )
  if (linhas.length) {
    const { error } = await supabase
      .from(tabela)
      .upsert(linhas, { onConflict: `${colunaDono},${colunaItem}` })
    if (error) return false
  }
  let apagar = supabase.from(tabela).delete().eq(colunaDono, dono)
  if (linhas.length) {
    apagar = apagar.not(colunaItem, 'in', `(${linhas.map((l) => l[colunaItem]).join(',')})`)
  }
  const { error } = await apagar
  return !error
}

/**
 * Grava o plano do rascunho: o treino, a lista de exercicios e (so quem
 * edita a escala) a comissao. Exercicio que ja estava marcado como feito
 * continua feito.
 */
export async function salvarTreino(editaEscala: boolean) {
  const p = rascunhoTreino.ler()
  if (!p.unidadeId) throw new Error('Escolha a unidade.')
  if (!p.data) throw new Error('Escolha a data do treino.')

  const linha = {
    data: p.data,
    hora: p.hora,
    unidade_id: p.unidadeId,
    turma: p.turma,
    local: p.local.trim() || null,
    responsavel_id: p.responsavelId,
  }
  let id = p.id
  if (id) {
    const { error } = await supabase.from('treinos').update(linha).eq('id', id)
    if (error)
      throw new Error(semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível salvar o treino.')
  } else {
    const { data, error } = await supabase.from('treinos').insert(linha).select('id').single()
    if (error || !data) {
      throw new Error(semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível criar o treino.')
    }
    id = data.id as string
    // o treino ja existe: se um passo abaixo falhar, o "tente de novo" edita
    // este mesmo treino em vez de criar outro
    rascunhoTreino.definir({ id })
  }

  // a lista: o que ja estava feito continua feito
  const { data: antes, error: erroAntes } = await supabase
    .from('treino_exercicios')
    .select('exercicio_id, feito')
    .eq('treino_id', id)
  if (erroAntes) {
    await carregarJogo()
    throw new Error('O treino foi salvo, mas a lista de exercícios não. Tente de novo.')
  }
  const feitos = new Set((antes ?? []).filter((e) => e.feito).map((e) => e.exercicio_id as string))
  const listaOk = await trocarLigacoes(
    'treino_exercicios',
    'treino_id',
    id,
    'exercicio_id',
    p.exercicios.map((e, i) => ({
      treino_id: id,
      exercicio_id: e.exercicioId,
      ordem: i,
      duracao_min: e.duracaoMin,
      feito: feitos.has(e.exercicioId),
    })),
  )
  if (!listaOk) {
    await carregarJogo()
    throw new Error('O treino foi salvo, mas a lista de exercícios não. Tente de novo.')
  }

  if (editaEscala) {
    const comissaoOk = await trocarLigacoes(
      'treino_comissao',
      'treino_id',
      id,
      'usuario_id',
      p.comissao.map((usuario_id) => ({ treino_id: id, usuario_id })),
    )
    if (!comissaoOk) {
      await carregarJogo()
      throw new Error('O treino foi salvo, mas a comissão não. Tente de novo.')
    }
  }

  await carregarJogo()
  return id
}

export async function marcarExercicio(treinoId: string, exercicioId: string, feito: boolean) {
  const { error } = await supabase
    .from('treino_exercicios')
    .update({ feito })
    .eq('treino_id', treinoId)
    .eq('exercicio_id', exercicioId)
  if (error) throw new Error('Não foi possível marcar o exercício.')
  memoria.definir({
    treinos: memoria.ler().treinos.map((t) =>
      t.id === treinoId
        ? {
            ...t,
            exercicios: t.exercicios.map((e) =>
              e.exercicioId === exercicioId ? { ...e, feito } : e,
            ),
          }
        : t,
    ),
  })
}

/** A avaliacao ja gravada de um treino (para rever sem apagar o que havia). */
export async function lerAvaliacao(
  treinoId: string,
): Promise<(Notas & { observacoes: string }) | null> {
  const { data, error } = await supabase
    .from('treino_avaliacoes')
    .select('nota_treino, entenderam, dificuldade, observacoes')
    .eq('treino_id', treinoId)
    .maybeSingle()
  if (error)
    throw new Error(semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível ler a avaliação.')
  if (!data) return null
  return {
    treino: (data.nota_treino as number | null) ?? null,
    entenderam: (data.entenderam as number | null) ?? null,
    dificuldade: (data.dificuldade as number | null) ?? null,
    observacoes: (data.observacoes as string | null) ?? '',
  }
}

/** Encerra o treino; a avaliacao e opcional (R8: "Pular por agora"). */
export async function encerrarTreino(
  treinoId: string,
  avaliacao: (Notas & { observacoes: string }) | null,
) {
  // treino ja encerrado (rever a avaliacao) guarda a hora em que encerrou
  const { error } = await supabase
    .from('treinos')
    .update({ encerrado_em: new Date().toISOString() })
    .eq('id', treinoId)
    .is('encerrado_em', null)
  if (error) throw new Error('Não foi possível encerrar o treino.')
  if (avaliacao) {
    const { error: erroNota } = await supabase.from('treino_avaliacoes').upsert({
      treino_id: treinoId,
      nota_treino: avaliacao.treino,
      entenderam: avaliacao.entenderam,
      dificuldade: avaliacao.dificuldade,
      observacoes: avaliacao.observacoes.trim() || null,
    })
    if (erroNota) throw new Error('O treino foi encerrado, mas a avaliação não foi salva.')
  }
  await carregarJogo()
}

/** As avaliacoes de um mes (tela 11s): cada treino avaliado, com as notas. */
export async function lerAvaliacoesDoMes(ano: number, mes: number) {
  const inicio = paraISO(new Date(ano, mes, 1))
  const fim = paraISO(new Date(ano, mes + 1, 0))
  const { data, error } = await supabase
    .from('treinos')
    .select('id, data, hora, turma, treino_avaliacoes!inner(nota_treino, entenderam, dificuldade)')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false })
    .order('hora', { ascending: false })
  if (error)
    throw new Error(semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível ler as avaliações.')
  return (data ?? []).map((t) => {
    const a = Array.isArray(t.treino_avaliacoes) ? t.treino_avaliacoes[0] : t.treino_avaliacoes
    return {
      id: t.id as string,
      data: t.data as string,
      turma: t.turma as Turma,
      treino: (a?.nota_treino as number | null) ?? null,
      entenderam: (a?.entenderam as number | null) ?? null,
      dificuldade: (a?.dificuldade as number | null) ?? null,
    }
  })
}

// ─── biblioteca de exercicios ────────────────────────────────────────

export async function salvarExercicio(dados: {
  id?: string
  nome: string
  categoria: CategoriaExercicio
  duracaoMin: number
  material: string
  descricao: string
  video: string
}) {
  const linha = {
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    duracao_min: dados.duracaoMin,
    material: dados.material.trim() || null,
    descricao: dados.descricao.trim() || null,
    video: dados.video.trim().replace(/^https?:\/\//, '') || null,
  }
  const pedido = dados.id
    ? supabase.from('exercicios').update(linha).eq('id', dados.id).select('id').single()
    : supabase.from('exercicios').insert(linha).select('id').single()
  const { data, error } = await pedido
  if (error || !data) {
    throw new Error(semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível salvar o exercício.')
  }
  await carregarJogo()
  return data.id as string
}

// ─── escala semanal ──────────────────────────────────────────────────

export async function adicionarHorario(dados: {
  unidadeId: string
  diaSemana: number
  hora: string
  turma: Turma
}) {
  const { error } = await supabase.from('escala').insert({
    unidade_id: dados.unidadeId,
    dia_semana: dados.diaSemana,
    hora: dados.hora,
    turma: dados.turma,
  })
  if (error) {
    throw new Error(
      error.code === '23505'
        ? 'Esse horário já está na escala.'
        : semTabela(error)
          ? FALTA_SQL_JOGO
          : 'Não foi possível adicionar o horário.',
    )
  }
  await carregarJogo()
}

export async function definirTecnico(linhaId: string, tecnicoId: string | null) {
  const { error } = await supabase
    .from('escala')
    .update({ tecnico_id: tecnicoId })
    .eq('id', linhaId)
  if (error) throw new Error('Não foi possível salvar o técnico.')
  await carregarJogo()
}

export async function removerHorario(linhaId: string) {
  const { error } = await supabase.from('escala').delete().eq('id', linhaId)
  if (error) throw new Error('Não foi possível tirar o horário.')
  await carregarJogo()
}

/** Quem a escala diz que cobre esse dia, hora e turma na unidade. */
export function tecnicoDaEscala(
  escala: LinhaEscala[],
  unidadeId: string | null,
  data: string,
  hora: string,
  turma: Turma,
) {
  if (!unidadeId || !data) return null
  const dia = deISO(data).getDay()
  return (
    escala.find(
      (l) =>
        l.unidadeId === unidadeId && l.diaSemana === dia && l.hora === hora && l.turma === turma,
    )?.tecnicoId ?? null
  )
}

/**
 * O responsavel que o plano mostra e grava. null no banco e "a definir"; a
 * escala so entra como padrao num plano novo (sem treino gravado), para nao
 * desfazer um "Deixar a definir" escolhido no dia.
 */
export function responsavelDoPlano(
  plano: {
    id: string | null
    responsavelId: string | null
    data: string
    hora: string
    turma: Turma
  },
  escala: LinhaEscala[],
  unidadeId: string | null,
) {
  if (plano.id || plano.responsavelId) return plano.responsavelId
  return tecnicoDaEscala(escala, unidadeId, plano.data, plano.hora, plano.turma)
}

// ─── jogos ───────────────────────────────────────────────────────────

/** Os jogos do periodo do filtro (tela 11 · Jogos). */
export function useJogos() {
  const filtro = rascunhoFiltroJogos.useValor()
  const { categoria, periodo, passo } = filtro
  const intervalo = intervaloDo({ periodo, passo, de: '', ate: '' })
  const chave = `${categoria}|${periodo}|${passo}`
  const [estado, setEstado] = useState<{
    lista: Jogo[]
    erro: string | null
    chave: string
  }>({ lista: [], erro: null, chave: '' })

  const buscar = useCallback(async () => {
    let q = supabase
      .from('jogos')
      .select('*')
      .gte('data', intervalo.inicio)
      .lte('data', intervalo.fim)
    if (categoria !== 'Todas') q = q.eq('categoria', categoria)
    const { data, error } = await q.order('data').order('hora')
    return {
      lista: (data ?? []).map(paraJogo),
      erro: error
        ? semTabela(error)
          ? FALTA_SQL_JOGO
          : 'Não foi possível carregar os jogos.'
        : null,
      chave,
    }
  }, [intervalo.inicio, intervalo.fim, categoria, chave])

  // so a resposta do pedido mais recente vale: uma antiga que chega depois
  // (o filtro mudou no meio) nao pode cobrir a nova
  const ultimo = useRef(0)
  const recarregar = useCallback(() => {
    const vez = ++ultimo.current
    return buscar().then((r) => {
      if (vez === ultimo.current) setEstado(r)
    })
  }, [buscar])
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  return {
    ...estado,
    carregando: estado.chave !== chave,
    intervalo,
    filtro,
    recarregar,
  }
}

export type DetalheJogo = {
  jogo: Jogo
  convocados: { criancaId: string; situacao: Situacao }[]
  comissao: string[]
}

async function lerDetalheJogo(id: string): Promise<DetalheJogo | null> {
  const { data, error } = await supabase
    .from('jogos')
    .select('*, jogo_convocados(crianca_id, situacao), jogo_comissao(usuario_id)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    jogo: paraJogo(data),
    convocados: ((data.jogo_convocados ?? []) as { crianca_id: string; situacao: Situacao }[]).map(
      (c) => ({ criancaId: c.crianca_id, situacao: c.situacao }),
    ),
    comissao: ((data.jogo_comissao ?? []) as { usuario_id: string }[]).map((c) => c.usuario_id),
  }
}

/** Um jogo com convocados e comissao, recarregado quando a tela ganha foco. */
export function useDetalheJogo(id: string | undefined) {
  const [estado, setEstado] = useState<{
    dados: DetalheJogo | null
    erro: string | null
    de: string | null
  }>({ dados: null, erro: null, de: null })

  const buscar = useCallback(
    () =>
      id
        ? lerDetalheJogo(id).then(
            (dados) => ({ dados, erro: null, de: id }),
            (e) => ({
              dados: null,
              erro: semTabela(e) ? FALTA_SQL_JOGO : 'Não foi possível abrir o jogo.',
              de: id,
            }),
          )
        : Promise.resolve({ dados: null, erro: null, de: null }),
    [id],
  )
  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )
  return { ...estado, carregando: estado.de !== (id ?? null), recarregar }
}

export async function salvarJogo() {
  const j = rascunhoJogo.ler()
  if (!j.adversario.trim()) throw new Error('Escreva o adversário.')
  if (!j.local.trim()) throw new Error('Escreva o local.')
  if (!j.data) throw new Error('Escolha a data.')
  const linha = {
    campeonato: j.campeonato.trim() || null,
    adversario: j.adversario.trim(),
    categoria: j.categoria,
    modalidade: MODALIDADE_BANCO[j.modalidade],
    data: j.data,
    hora: j.hora,
    local: j.local.trim(),
  }
  const pedido = j.id
    ? supabase.from('jogos').update(linha).eq('id', j.id).select('id').single()
    : supabase.from('jogos').insert(linha).select('id').single()
  const { data, error } = await pedido
  if (error || !data) {
    throw new Error(semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível salvar o jogo.')
  }
  return data.id as string
}

export async function atualizarJogo(
  id: string,
  dados: Partial<{ formacao: string; golsAdam: number | null; golsAdversario: number | null }>,
) {
  const linha: Record<string, unknown> = {}
  if (dados.formacao !== undefined) linha.formacao = dados.formacao
  if (dados.golsAdam !== undefined) linha.gols_adam = dados.golsAdam
  if (dados.golsAdversario !== undefined) linha.gols_adversario = dados.golsAdversario
  const { error } = await supabase.from('jogos').update(linha).eq('id', id)
  if (error) throw new Error('Não foi possível salvar.')
}

export async function convocar(jogoId: string, criancaIds: string[]) {
  if (!criancaIds.length) return
  const { error } = await supabase.from('jogo_convocados').upsert(
    criancaIds.map((crianca_id) => ({ jogo_id: jogoId, crianca_id, situacao: 'banco' })),
    { onConflict: 'jogo_id,crianca_id', ignoreDuplicates: true },
  )
  if (error) throw new Error('Não foi possível convocar.')
}

export async function definirSituacao(jogoId: string, criancaId: string, situacao: Situacao) {
  const { error } = await supabase
    .from('jogo_convocados')
    .update({ situacao })
    .eq('jogo_id', jogoId)
    .eq('crianca_id', criancaId)
  if (error) throw new Error('Não foi possível mudar.')
}

export async function desconvocar(jogoId: string, criancaId: string) {
  const { error } = await supabase
    .from('jogo_convocados')
    .delete()
    .eq('jogo_id', jogoId)
    .eq('crianca_id', criancaId)
  if (error) throw new Error('Não foi possível tirar da convocação.')
}

export async function salvarComissaoDoJogo(jogoId: string, usuarioIds: string[]) {
  const ok = await trocarLigacoes(
    'jogo_comissao',
    'jogo_id',
    jogoId,
    'usuario_id',
    usuarioIds.map((usuario_id) => ({ jogo_id: jogoId, usuario_id })),
  )
  if (!ok) throw new Error('Não foi possível salvar a comissão.')
}

// ─── atletas (criancas, sem dado sensivel) ───────────────────────────

/** Nome, idade, unidade e posicao — a porta que treinador tambem le. */
export function useAtletas() {
  const [estado, setEstado] = useState<{
    lista: Atleta[]
    carregando: boolean
    erro: string | null
  }>({
    lista: [],
    carregando: true,
    erro: null,
  })
  useEffect(() => {
    let ativo = true
    supabase.rpc('criancas_basico').then(({ data, error }) => {
      if (!ativo) return
      // lista vazia por erro nao e "ninguem elegivel": a tela mostra o erro
      if (error) {
        setEstado({
          lista: [],
          carregando: false,
          erro: semTabela(error) ? FALTA_SQL_JOGO : 'Não foi possível carregar as crianças.',
        })
        return
      }
      setEstado({
        erro: null,
        lista: ((data ?? []) as Record<string, unknown>[]).map((c) => ({
          id: c.id as string,
          nome: c.nome as string,
          iniciais: iniciaisDe(c.nome as string),
          idade: c.idade as number,
          unidadeId: c.unidade_id as string,
          posicao: (c.posicao as Atleta['posicao']) ?? null,
        })),
        carregando: false,
      })
    })
    return () => {
      ativo = false
    }
  }, [])
  return estado
}

// ─── escala por data (o calendario da aba Escala) ────────────────────

/** O que o calendario precisa de cada treino do mes. */
export type TreinoDoMes = {
  id: string
  data: string
  hora: string
  unidadeId: string
  turma: Turma
  responsavelId: string | null
}

/** Os treinos de um mes inteiro (passado ou futuro), para o calendario. */
export function useTreinosDoMes(ano: number, mes: number) {
  const chave = `${ano}-${mes}`
  const [estado, setEstado] = useState<{ lista: TreinoDoMes[]; erro: string | null; de: string }>({
    lista: [],
    erro: null,
    de: '',
  })

  const buscar = useCallback(async () => {
    const inicio = paraISO(new Date(ano, mes, 1))
    const fim = paraISO(new Date(ano, mes + 1, 0))
    try {
      const linhas = await todasAsLinhas<Record<string, unknown>>((de, ate) =>
        supabase
          .from('treinos')
          .select('id, data, hora, unidade_id, turma, responsavel_id')
          .gte('data', inicio)
          .lte('data', fim)
          .order('data')
          .order('hora')
          .order('id')
          .range(de, ate),
      )
      return {
        lista: linhas.map((t) => ({
          id: t.id as string,
          data: t.data as string,
          hora: hora5(t.hora),
          unidadeId: t.unidade_id as string,
          turma: t.turma as Turma,
          responsavelId: (t.responsavel_id as string | null) ?? null,
        })),
        erro: null,
        de: chave,
      }
    } catch {
      return { lista: [], erro: 'Não foi possível carregar os treinos do mês.', de: chave }
    }
  }, [ano, mes, chave])

  // so a resposta do pedido mais recente vale (trocar de mes rapido)
  const ultimo = useRef(0)
  const recarregar = useCallback(() => {
    const vez = ++ultimo.current
    return buscar().then((r) => {
      if (vez === ultimo.current) setEstado(r)
    })
  }, [buscar])
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )
  return { ...estado, carregando: estado.de !== chave, recarregar }
}

/**
 * Um horario de um dia: um treino ja marcado, ou um horario fixo da escala
 * semanal que cai naquele dia e ainda nao virou treino (vale o tecnico da
 * escala como padrao).
 */
export type HorarioDoDia = {
  chave: string
  data: string
  hora: string
  turma: Turma
  unidadeId: string
  treinoId: string | null
  responsavelId: string | null
}

export function horariosDoDia(
  data: string,
  escala: LinhaEscala[],
  treinos: TreinoDoMes[],
): HorarioDoDia[] {
  const doDia = treinos.filter((t) => t.data === data)
  const semana = deISO(data).getDay()
  const fixos = escala
    .filter((l) => l.diaSemana === semana)
    .filter(
      (l) =>
        !doDia.some((t) => t.unidadeId === l.unidadeId && t.hora === l.hora && t.turma === l.turma),
    )
  return [
    ...doDia.map((t) => ({
      chave: t.id,
      data,
      hora: t.hora,
      turma: t.turma,
      unidadeId: t.unidadeId,
      treinoId: t.id,
      responsavelId: t.responsavelId,
    })),
    ...fixos.map((l) => ({
      chave: `escala-${l.id}`,
      data,
      hora: l.hora,
      turma: l.turma,
      unidadeId: l.unidadeId,
      treinoId: null,
      responsavelId: l.tecnicoId,
    })),
  ].sort((a, b) => a.hora.localeCompare(b.hora) || a.turma.localeCompare(b.turma))
}

/** Bolinha de cada dia do mes: verde se todos os horarios tem tecnico, ambar se falta. */
export function marcasDoMes(
  ano: number,
  mes: number,
  escala: LinhaEscala[],
  treinos: TreinoDoMes[],
) {
  const marcas: Record<number, 'ok' | 'pendente'> = {}
  const dias = new Date(ano, mes + 1, 0).getDate()
  for (let dia = 1; dia <= dias; dia++) {
    const horarios = horariosDoDia(paraISO(new Date(ano, mes, dia)), escala, treinos)
    if (!horarios.length) continue
    marcas[dia] = horarios.every((h) => h.responsavelId) ? 'ok' : 'pendente'
  }
  return marcas
}

/**
 * O tecnico daquele dia. Treino marcado: troca o responsavel. Horario fixo
 * da escala: cria o treino do dia ja com o responsavel (os exercicios vem
 * depois, no "Planejar treino").
 */
export async function definirTecnicoDoDia(horario: HorarioDoDia, tecnicoId: string | null) {
  const { error } = horario.treinoId
    ? await supabase
        .from('treinos')
        .update({ responsavel_id: tecnicoId })
        .eq('id', horario.treinoId)
    : await supabase.from('treinos').insert({
        data: horario.data,
        hora: horario.hora,
        unidade_id: horario.unidadeId,
        turma: horario.turma,
        responsavel_id: tecnicoId,
      })
  if (error) throw new Error('Não foi possível salvar o técnico do dia.')
  await carregarJogo()
}
