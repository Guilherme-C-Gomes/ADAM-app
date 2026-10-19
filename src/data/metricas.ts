import { useCallback, useEffect, useState } from 'react'

import { DIAS_CURTOS, MESES } from '@/data/calendario'
import type { Turma } from '@/data/chamada'
import { porLotes, todasAsLinhas } from '@/lib/consulta'
import { supabase } from '@/lib/supabase'

/**
 * Os numeros da Secretaria, do Relatorio e da Home, contados no banco.
 *
 * Regras, para os numeros baterem entre si:
 * - so conta chamada ENCERRADA (a que subiu); a que esta em andamento nao
 *   e verdade ainda;
 * - "foi" = a ficha tem marca de presenca numa chamada do periodo; crianca
 *   sem ficha (avulsa) conta a parte, pelo nome;
 * - unidade escolhida filtra a chamada pela unidade dela e a ficha pela
 *   unidade da crianca;
 * - o que o banco ainda nao guarda (jogos, saidas, avaliacao do treino) nao
 *   vira numero: a tela diz que ainda nao e registrado.
 */

// ─── periodos, com a data de hoje de verdade (sem Intl) ──────────────

export type Periodo = 'Semana' | 'Mês' | 'Trimestre' | 'Ano' | 'Personalizado'
export const PERIODOS: Periodo[] = ['Semana', 'Mês', 'Trimestre', 'Ano', 'Personalizado']

export type FiltroPeriodo = {
  periodo: Periodo
  /** 0 = o periodo de hoje; -1 = o anterior; nunca positivo */
  passo: number
  /** so no Personalizado, "AAAA-MM-DD" */
  de: string
  ate: string
}

export type Recorte = { rotulo: string; inicio: string; fim: string }
export type Intervalo = { inicio: string; fim: string; rotulo: string; recortes: Recorte[] }

const dois = (n: number) => String(n).padStart(2, '0')
const MESES_CURTOS = MESES.map((m) => m.slice(0, 3).toLowerCase())

export const paraISO = (d: Date) =>
  `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
export const deISO = (s: string) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}
const somarDias = (s: string, dias: number) => {
  const d = deISO(s)
  return paraISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias))
}
const diasEntre = (de: string, ate: string) =>
  Math.round((deISO(ate).getTime() - deISO(de).getTime()) / 86400000)
export const hojeISO = () => paraISO(new Date())
/** "05/09" */
const curta = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`

export function intervaloDo(f: FiltroPeriodo, hoje = new Date()): Intervalo {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()

  if (f.periodo === 'Semana') {
    // semana de segunda a domingo
    const segunda = new Date(ano, mes, hoje.getDate() - ((hoje.getDay() + 6) % 7) + f.passo * 7)
    const inicio = paraISO(segunda)
    const fim = somarDias(inicio, 6)
    const recortes = Array.from({ length: 7 }, (_, i) => {
      const dia = somarDias(inicio, i)
      return { rotulo: DIAS_CURTOS[deISO(dia).getDay()], inicio: dia, fim: dia }
    })
    return { inicio, fim, rotulo: `semana de ${curta(inicio)} a ${curta(fim)}`, recortes }
  }

  if (f.periodo === 'Mês') {
    const primeiro = new Date(ano, mes + f.passo, 1)
    const inicio = paraISO(primeiro)
    const fim = paraISO(new Date(primeiro.getFullYear(), primeiro.getMonth() + 1, 0))
    const ultimoDia = Number(fim.slice(8, 10))
    const faixas = [
      [1, 7],
      [8, 14],
      [15, 21],
      [22, ultimoDia],
    ]
    const recortes = faixas.map(([a, b]) => ({
      rotulo: `${a}–${b}`,
      inicio: somarDias(inicio, a - 1),
      fim: somarDias(inicio, b - 1),
    }))
    return {
      inicio,
      fim,
      rotulo: `${MESES[primeiro.getMonth()]} de ${primeiro.getFullYear()}`,
      recortes,
    }
  }

  if (f.periodo === 'Trimestre') {
    // os 3 meses que terminam no mes de hoje (ou 3, 6... meses antes)
    const ultimoMes = new Date(ano, mes + f.passo * 3, 1)
    const recortes = [2, 1, 0].map((volta) => {
      const m = new Date(ultimoMes.getFullYear(), ultimoMes.getMonth() - volta, 1)
      return {
        rotulo: MESES_CURTOS[m.getMonth()],
        inicio: paraISO(m),
        fim: paraISO(new Date(m.getFullYear(), m.getMonth() + 1, 0)),
      }
    })
    const inicio = recortes[0].inicio
    const fim = recortes[2].fim
    // atravessando o ano, os dois anos aparecem: "nov/2025 a jan/2026"
    const rotulo =
      inicio.slice(0, 4) === fim.slice(0, 4)
        ? `${recortes[0].rotulo} a ${recortes[2].rotulo} de ${fim.slice(0, 4)}`
        : `${recortes[0].rotulo}/${inicio.slice(0, 4)} a ${recortes[2].rotulo}/${fim.slice(0, 4)}`
    return { inicio, fim, rotulo, recortes }
  }

  if (f.periodo === 'Ano') {
    const a = ano + f.passo
    const recortes = [0, 3, 6, 9].map((m) => ({
      rotulo: `${MESES_CURTOS[m]}–${MESES_CURTOS[m + 2]}`,
      inicio: paraISO(new Date(a, m, 1)),
      fim: paraISO(new Date(a, m + 3, 0)),
    }))
    return { inicio: `${a}-01-01`, fim: `${a}-12-31`, rotulo: String(a), recortes }
  }

  // Personalizado: as setas andam o mesmo tamanho do intervalo escolhido
  const de = f.de || paraISO(new Date(ano, mes, 1))
  const ate = f.ate && f.ate >= de ? f.ate : de
  const tamanho = diasEntre(de, ate) + 1
  const inicio = somarDias(de, f.passo * tamanho)
  const fim = somarDias(ate, f.passo * tamanho)
  const partes = Math.min(tamanho, tamanho <= 7 ? tamanho : 4)
  const recortes = Array.from({ length: partes }, (_, i) => {
    const a = somarDias(inicio, Math.floor((i * tamanho) / partes))
    const b = somarDias(inicio, Math.floor(((i + 1) * tamanho) / partes) - 1)
    return { rotulo: curta(a), inicio: a, fim: b }
  })
  const rotulo =
    inicio === fim
      ? `${curta(inicio)}/${inicio.slice(0, 4)}`
      : `${curta(inicio)} a ${curta(fim)}/${fim.slice(0, 4)}`
  return { inicio, fim, rotulo, recortes }
}

// ─── os numeros do periodo ──────────────────────────────────────────

export type Metricas = {
  intervalo: Intervalo
  anterior: Intervalo
  /** fichas ativas hoje (na unidade escolhida) */
  ativas: number
  /** fichas com presenca em ao menos uma chamada encerrada do periodo */
  foram: number
  /**
   * A base do "foram X de N": fichas (na unidade escolhida) que estavam na
   * ADAM em algum dia do periodo — entraram ate o fim dele e nao tinham
   * saido antes do inicio — mais quem foi marcado. Assim X nunca passa de N,
   * mesmo com quem saiu depois ou trocou de unidade.
   */
  noPeriodo: number
  foramAntes: number
  /** criancas sem ficha que vieram (nomes distintos das chamadas avulsas) */
  semFicha: number
  /** null = recorte que ainda nao chegou */
  recortes: { rotulo: string; valor: number | null }[]
  chamadas: { total: number; pequenos: number; maiores: number; dias: number }
  /** treinos da escala (tabela treinos) e quantos tinham tecnico definido */
  treinos: { planejados: number; comResponsavel: number }
  equipe: { marcaram: number; comAcesso: number }
  /** fichas novas: crianca que entrou (campo "desde") no periodo */
  entraram: number
  /** criancas que sairam no periodo (null = o SQL das saidas ainda nao rodou) */
  sairam: number | null
  /** de quem tem 3 meses ou mais de ADAM, quantos vieram nos ultimos 30 dias */
  continuidade: { base: number; continuam: number; ate: string }
  /**
   * Jogos do periodo (de todas as unidades: jogo nao tem unidade). null =
   * o SQL do Jogo ainda nao rodou, entao nao ha o que contar.
   */
  jogos: {
    total: number
    ganhos: number
    empates: number
    perdidos: number
    semResultado: number
    campeonatos: { nome: string; jogos: number; pontos: number; comResultado: number }[]
  } | null
  /** Avaliacoes e exercicios dos treinos do periodo. null = SQL do Jogo nao rodou. */
  qualidade: {
    avaliados: number
    treino: number | null
    entenderam: number | null
    dificuldade: number | null
    comExercicios: number
    exerciciosPlanejados: number
    exerciciosFeitos: number
  } | null
}

type LinhaChamada = { id: string; data: string; turma: Turma; unidade_id: string }
type LinhaCrianca = {
  id: string
  unidade_id: string
  desde: string
  ativa: boolean
  saiu_em?: string | null
}

const dentro = (data: string, i: { inicio: string; fim: string }) =>
  data >= i.inicio && data <= i.fim

export async function lerMetricas(
  f: FiltroPeriodo & { unidadeId: string | null },
): Promise<Metricas> {
  const intervalo = intervaloDo(f)
  const anterior = intervaloDo({ ...f, passo: f.passo - 1 })
  const hoje = hojeISO()
  const fimEfetivo = intervalo.fim < hoje ? intervalo.fim : hoje
  const inicio30 = somarDias(fimEfetivo, -29)
  // um pedido so cobre o periodo, o anterior e os 30 dias da continuidade
  const desde = [anterior.inicio, inicio30].sort()[0]
  const u = f.unidadeId

  const [chamadas, criancas, treinos, equipe] = await Promise.all([
    todasAsLinhas<LinhaChamada>((de, ate) => {
      let q = supabase
        .from('chamadas')
        .select('id, data, turma, unidade_id')
        .eq('estado', 'encerrada')
        .gte('data', desde)
        .lte('data', intervalo.fim)
      if (u) q = q.eq('unidade_id', u)
      return q.order('id').range(de, ate)
    }),
    todasAsLinhas<LinhaCrianca>((de, ate) =>
      // `*`: inclui saiu_em quando o SQL das saidas ja rodou, sem quebrar antes
      supabase.from('criancas').select('*').order('id').range(de, ate),
    ),
    todasAsLinhas<{ id: string; responsavel_id: string | null }>((de, ate) => {
      let q = supabase
        .from('treinos')
        .select('id, responsavel_id')
        .gte('data', intervalo.inicio)
        .lte('data', intervalo.fim)
      if (u) q = q.eq('unidade_id', u)
      return q.order('id').range(de, ate)
    }),
    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('ativo', true),
  ])

  const dataDa = new Map(chamadas.map((c) => [c.id, c.data]))
  const doPeriodo = chamadas.filter((c) => dentro(c.data, intervalo))
  const idsDoPeriodo = doPeriodo.map((c) => c.id)

  const [marcas, participantes, avulsos] = await Promise.all([
    porLotes(
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
    ),
    porLotes(idsDoPeriodo, (lote) =>
      todasAsLinhas<{ usuario_id: string }>((de, ate) =>
        supabase
          .from('chamada_participantes')
          .select('usuario_id')
          .in('chamada_id', lote)
          .order('chamada_id')
          .order('usuario_id')
          .range(de, ate),
      ),
    ),
    porLotes(idsDoPeriodo, (lote) =>
      todasAsLinhas<{ nome: string }>((de, ate) =>
        supabase
          .from('chamada_avulsos')
          .select('nome')
          .in('chamada_id', lote)
          .order('id')
          .range(de, ate),
      ),
    ),
  ])

  const presentesEntre = (i: { inicio: string; fim: string }) =>
    new Set(
      marcas.filter((m) => dentro(dataDa.get(m.chamada_id) ?? '', i)).map((m) => m.crianca_id),
    )

  const daUnidade = criancas.filter((c) => !u || c.unidade_id === u)
  const ativas = daUnidade.filter((c) => c.ativa)

  // Jogo (SQL de 08/10). Tabela que ainda nao existe vira null: a tela diz
  // que nao e registrado, em vez de mostrar zero.
  const idsTreinos = treinos.map((t) => t.id)
  const [jogosLidos, avaliacoes, exercicios] = await Promise.all([
    supabase
      .from('jogos')
      .select('campeonato, gols_adam, gols_adversario')
      .gte('data', intervalo.inicio)
      .lte('data', intervalo.fim),
    tolerante(() =>
      porLotes(idsTreinos, (lote) =>
        todasAsLinhas<{
          nota_treino: number | null
          entenderam: number | null
          dificuldade: number | null
        }>((de, ate) =>
          supabase
            .from('treino_avaliacoes')
            .select('nota_treino, entenderam, dificuldade')
            .in('treino_id', lote)
            .order('treino_id')
            .range(de, ate),
        ),
      ),
    ),
    tolerante(() =>
      porLotes(idsTreinos, (lote) =>
        todasAsLinhas<{ treino_id: string; feito: boolean }>((de, ate) =>
          supabase
            .from('treino_exercicios')
            .select('treino_id, feito')
            .in('treino_id', lote)
            .order('treino_id')
            .order('exercicio_id')
            .range(de, ate),
        ),
      ),
    ),
  ])

  let jogos: Metricas['jogos'] = null
  if (!jogosLidos.error) {
    const lista = (jogosLidos.data ?? []) as {
      campeonato: string | null
      gols_adam: number | null
      gols_adversario: number | null
    }[]
    const comPlacar = lista.filter((j) => j.gols_adam !== null && j.gols_adversario !== null)
    const pontos = (j: (typeof lista)[number]) =>
      j.gols_adam === null || j.gols_adversario === null
        ? 0
        : j.gols_adam > j.gols_adversario
          ? 3
          : j.gols_adam === j.gols_adversario
            ? 1
            : 0
    const porCampeonato = new Map<string, typeof lista>()
    for (const j of lista) {
      const nome = j.campeonato?.trim() || 'Amistosos'
      porCampeonato.set(nome, [...(porCampeonato.get(nome) ?? []), j])
    }
    jogos = {
      total: lista.length,
      ganhos: comPlacar.filter((j) => j.gols_adam! > j.gols_adversario!).length,
      empates: comPlacar.filter((j) => j.gols_adam === j.gols_adversario).length,
      perdidos: comPlacar.filter((j) => j.gols_adam! < j.gols_adversario!).length,
      semResultado: lista.length - comPlacar.length,
      campeonatos: [...porCampeonato.entries()]
        .map(([nome, js]) => ({
          nome,
          jogos: js.length,
          pontos: js.reduce((soma, j) => soma + pontos(j), 0),
          comResultado: js.filter((j) => j.gols_adam !== null && j.gols_adversario !== null).length,
        }))
        .sort((a, b) => b.jogos - a.jogos),
    }
  }

  const mediaDe = (notas: (number | null)[]) => {
    const validas = notas.filter((n): n is number => n !== null)
    return validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : null
  }
  const qualidade: Metricas['qualidade'] =
    avaliacoes && exercicios
      ? {
          avaliados: avaliacoes.length,
          treino: mediaDe(avaliacoes.map((a) => a.nota_treino)),
          entenderam: mediaDe(avaliacoes.map((a) => a.entenderam)),
          dificuldade: mediaDe(avaliacoes.map((a) => a.dificuldade)),
          comExercicios: new Set(exercicios.map((e) => e.treino_id)).size,
          exerciciosPlanejados: exercicios.length,
          exerciciosFeitos: exercicios.filter((e) => e.feito).length,
        }
      : null

  // continuidade: 3 meses ou mais de ADAM ate o fim do periodo
  const limite3Meses = somarDias(fimEfetivo, -90)
  const base = ativas.filter((c) => c.desde <= limite3Meses)
  const vieram30 = presentesEntre({ inicio: inicio30, fim: fimEfetivo })

  // "foram X de N": N sai das mesmas fichas que podiam ter ido. Ficha
  // inativa sem data de saida (SQL das saidas nao rodou) so entra se foi.
  const foram = presentesEntre(intervalo)
  const noPeriodo = new Set(foram)
  for (const c of daUnidade) {
    const estava = c.ativa || (!!c.saiu_em && c.saiu_em >= intervalo.inicio)
    if (estava && c.desde <= intervalo.fim) noPeriodo.add(c.id)
  }

  return {
    intervalo,
    anterior,
    ativas: ativas.length,
    foram: foram.size,
    noPeriodo: noPeriodo.size,
    foramAntes: presentesEntre(anterior).size,
    semFicha: new Set(avulsos.map((a) => a.nome.trim().toLowerCase())).size,
    recortes: intervalo.recortes.map((r) => ({
      rotulo: r.rotulo,
      valor: r.inicio > hoje ? null : presentesEntre(r).size,
    })),
    chamadas: {
      total: doPeriodo.length,
      pequenos: doPeriodo.filter((c) => c.turma === 'pequenos').length,
      maiores: doPeriodo.filter((c) => c.turma === 'maiores').length,
      dias: new Set(doPeriodo.map((c) => c.data)).size,
    },
    treinos: {
      planejados: treinos.length,
      comResponsavel: treinos.filter((t) => t.responsavel_id).length,
    },
    equipe: {
      marcaram: new Set(participantes.map((p) => p.usuario_id)).size,
      comAcesso: equipe.count ?? 0,
    },
    entraram: daUnidade.filter((c) => dentro(c.desde, intervalo)).length,
    sairam:
      criancas.length && !('saiu_em' in criancas[0])
        ? null
        : daUnidade.filter((c) => c.saiu_em && dentro(c.saiu_em, intervalo)).length,
    continuidade: {
      base: base.length,
      continuam: base.filter((c) => vieram30.has(c.id)).length,
      ate: limite3Meses,
    },
    jogos,
    qualidade,
  }
}

/** Le e devolve null se a tabela ainda nao existe (SQL que nao rodou). */
async function tolerante<T>(ler: () => Promise<T>): Promise<T | null> {
  try {
    return await ler()
  } catch {
    return null
  }
}

/**
 * Os numeros do periodo escolhido. Trocar o filtro mostra o carregando de
 * novo (a chave muda); `recarregar` atualiza sem piscar.
 */
export function useMetricas(f: FiltroPeriodo & { unidadeId: string | null }) {
  const { unidadeId, periodo, passo, de, ate } = f
  const chave = `${unidadeId}|${periodo}|${passo}|${de}|${ate}`
  const [estado, setEstado] = useState<{
    dados: Metricas | null
    erro: string | null
    chave: string
  }>({ dados: null, erro: null, chave: '' })

  const buscar = useCallback(
    () =>
      lerMetricas({ unidadeId, periodo, passo, de, ate }).then(
        (dados) => ({ dados, erro: null, chave }),
        () => ({ dados: null, erro: 'Não foi possível calcular os números.', chave }),
      ),
    [unidadeId, periodo, passo, de, ate, chave],
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

  const carregando = estado.chave !== chave
  return {
    dados: carregando ? null : estado.dados,
    erro: carregando ? null : estado.erro,
    carregando,
    recarregar,
  }
}

// ─── Home: o ultimo treino e o proximo ──────────────────────────────

export type UltimoTreino = {
  data: string
  /** as chamadas daquele dia: quem era esperado sai daqui */
  turmas: { unidadeId: string; turma: Turma }[]
  presentes: Set<string>
}

export type ProximoTreino = { data: string; hora: string; unidadeId: string }

async function lerHoje(unidadeId: string | null) {
  let ultimaQ = supabase.from('chamadas').select('data').eq('estado', 'encerrada')
  if (unidadeId) ultimaQ = ultimaQ.eq('unidade_id', unidadeId)
  let proximoQ = supabase.from('treinos').select('data, hora, unidade_id').gte('data', hojeISO())
  if (unidadeId) proximoQ = proximoQ.eq('unidade_id', unidadeId)

  const [ultima, proximo] = await Promise.all([
    ultimaQ.order('data', { ascending: false }).limit(1),
    proximoQ.order('data').order('hora').limit(1),
  ])
  if (ultima.error) throw ultima.error

  let ultimo: UltimoTreino | null = null
  const data = ultima.data?.[0]?.data as string | undefined
  if (data) {
    let doDiaQ = supabase
      .from('chamadas')
      .select('id, unidade_id, turma')
      .eq('estado', 'encerrada')
      .eq('data', data)
    if (unidadeId) doDiaQ = doDiaQ.eq('unidade_id', unidadeId)
    const { data: doDia, error } = await doDiaQ
    if (error) throw error
    const ids = (doDia ?? []).map((c) => c.id as string)
    const marcas = await todasAsLinhas<{ crianca_id: string }>((de, ate) =>
      supabase
        .from('chamada_marcas')
        .select('crianca_id')
        .in('chamada_id', ids)
        .order('chamada_id')
        .order('crianca_id')
        .range(de, ate),
    )
    ultimo = {
      data,
      turmas: (doDia ?? []).map((c) => ({
        unidadeId: c.unidade_id as string,
        turma: c.turma as Turma,
      })),
      presentes: new Set(marcas.map((m) => m.crianca_id)),
    }
  }

  const p = proximo.data?.[0]
  return {
    ultimo,
    proximo: p
      ? {
          data: p.data as string,
          hora: String(p.hora).slice(0, 5),
          unidadeId: p.unidade_id as string,
        }
      : null,
  }
}

export function useTreinosDeHoje(unidadeId: string | null) {
  const [estado, setEstado] = useState<{
    ultimo: UltimoTreino | null
    proximo: ProximoTreino | null
    erro: string | null
    chave: string | null
  }>({ ultimo: null, proximo: null, erro: null, chave: null })
  const chave = unidadeId ?? 'todas'

  const buscar = useCallback(
    () =>
      lerHoje(unidadeId).then(
        (r) => ({ ...r, erro: null, chave }),
        () => ({ ultimo: null, proximo: null, erro: 'Não foi possível ler os treinos.', chave }),
      ),
    [unidadeId, chave],
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

  return { ...estado, carregando: estado.chave !== chave, recarregar }
}
