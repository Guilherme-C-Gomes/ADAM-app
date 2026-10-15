import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

import {
  adicionarAvulso,
  desmarcar,
  encerrar,
  entrarNaChamada,
  hojeLocal,
  marcar,
  type Chamada,
  type Turma,
} from '@/data/chamada'
import { criarRascunho } from '@/hooks/use-rascunho'

/**
 * A chamada sem internet.
 *
 * Na praca o sinal cai. Quando uma acao da chamada nao chega ao banco por
 * falta de conexao, ela entra numa fila guardada no celular (sobrevive a
 * fechar o app) e a tela ja mostra o resultado. A fila sobe sozinha, na
 * ordem, quando a conexao volta: ao reabrir o app e a cada 20 segundos.
 *
 * Da para ate COMECAR uma chamada sem sinal: ela nasce "local" no celular
 * e vira a chamada do banco quando sobe — mas precisa subir no mesmo dia
 * (o banco so abre chamada de hoje). Correcao de chamada encerrada continua
 * precisando de internet.
 */

export type Acao =
  | { tipo: 'abrir'; chamada: string; unidadeId: string; turma: Turma; data: string }
  | { tipo: 'marcar' | 'desmarcar'; chamada: string; criancaId: string; por: string }
  | { tipo: 'encerrar'; chamada: string }
  | { tipo: 'avulso'; chamada: string; nome: string }

type Fila = {
  acoes: Acao[]
  /** chamada local que ja virou do banco: local -> id real */
  resolvidas: Record<string, string>
  /** o que o banco recusou de vez (nao e falta de sinal) */
  falhas: string[]
  enviando: boolean
}

const CHAVE = 'adam.fila-chamada'
const fila = criarRascunho<Fila>({ acoes: [], resolvidas: {}, falhas: [], enviando: false })

// no web, a pre-renderizacao roda no Node, sem armazenamento
const temArmazenamento = Platform.OS !== 'web' || typeof window !== 'undefined'

let carregada: Promise<void> | null = null
function carregar() {
  carregada ??= (async () => {
    if (!temArmazenamento) return
    try {
      const salvo = await AsyncStorage.getItem(CHAVE)
      if (salvo) {
        const lido = JSON.parse(salvo) as Partial<Fila>
        fila.definir({
          acoes: lido.acoes ?? [],
          resolvidas: lido.resolvidas ?? {},
          falhas: lido.falhas ?? [],
        })
      }
    } catch {
      // armazenamento ilegivel: comeca vazia
    }
  })()
  return carregada
}

async function guardar(parcial: Partial<Fila>) {
  fila.definir(parcial)
  if (!temArmazenamento) return
  const { acoes, resolvidas, falhas } = fila.ler()
  await AsyncStorage.setItem(CHAVE, JSON.stringify({ acoes, resolvidas, falhas })).catch(() => {})
}

/** A acao falhou por falta de conexao (e nao porque o banco recusou)? */
export function semConexao(e: unknown) {
  const texto = String((e as { message?: string } | null)?.message ?? e ?? '')
  return /network|fetch|internet|timed? ?out|load failed|connection|offline/i.test(texto)
}

export const ehLocal = (id: string) => id.startsWith('local-')
export const idLocal = (data: string, unidadeId: string, turma: Turma) =>
  `local-${data}-${unidadeId}-${turma}`

/** Poe uma acao na fila e ja tenta mandar (se a conexao voltou, sobe). */
export async function enfileirar(acao: Acao) {
  await carregar()
  let acoes = [...fila.ler().acoes]
  // marcar e desmarcar a mesma crianca antes de subir: um anula o outro
  if (acao.tipo === 'marcar' || acao.tipo === 'desmarcar') {
    const oposto = acao.tipo === 'marcar' ? 'desmarcar' : 'marcar'
    const i = acoes.findIndex(
      (a) =>
        a.tipo === oposto &&
        a.chamada === acao.chamada &&
        (a as { criancaId: string }).criancaId === acao.criancaId,
    )
    if (i >= 0) {
      acoes.splice(i, 1)
      await guardar({ acoes })
      return
    }
  }
  if (
    acao.tipo === 'abrir' &&
    acoes.some((a) => a.tipo === 'abrir' && a.chamada === acao.chamada)
  ) {
    return
  }
  acoes = [...acoes, acao]
  await guardar({ acoes })
  sincronizar()
}

/** Manda a fila, na ordem. Para no primeiro "sem conexao". */
export async function sincronizar() {
  await carregar()
  if (fila.ler().enviando || !fila.ler().acoes.length) return
  fila.definir({ enviando: true })
  try {
    for (;;) {
      const { acoes, resolvidas, falhas } = fila.ler()
      const acao = acoes[0]
      if (!acao) break
      const real = (id: string) => resolvidas[id] ?? id
      try {
        if (acao.tipo === 'abrir') {
          if (acao.data !== hojeLocal()) {
            throw new Error(
              'Uma chamada feita sem internet não subiu no mesmo dia. Avise a coordenação.',
            )
          }
          const id = await entrarNaChamada(acao.unidadeId, acao.turma)
          await guardar({
            acoes: acoes.slice(1),
            resolvidas: { ...resolvidas, [acao.chamada]: id },
          })
          continue
        }
        const chamada = real(acao.chamada)
        if (ehLocal(chamada)) throw new Error('A chamada desta marca ainda não abriu no banco.')
        if (acao.tipo === 'marcar') await marcar(chamada, acao.criancaId)
        else if (acao.tipo === 'desmarcar') await desmarcar(chamada, acao.criancaId)
        else if (acao.tipo === 'encerrar') await encerrar(chamada)
        else if (acao.tipo === 'avulso') await adicionarAvulso(chamada, acao.nome)
        await guardar({ acoes: acoes.slice(1) })
      } catch (e) {
        if (semConexao(e)) break
        // o banco recusou de vez: anota e segue com o resto
        const motivo =
          e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
        await guardar({ acoes: acoes.slice(1), falhas: [...falhas, motivo].slice(-10) })
      }
    }
  } finally {
    fila.definir({ enviando: false })
  }
}

export async function esquecerFalhas() {
  await guardar({ falhas: [] })
}

/**
 * A fila, para as telas — e o motor: manda ao abrir o app, ao voltar para
 * ele e a cada 20 segundos enquanto houver algo guardado.
 */
export function useFilaChamada() {
  const estado = fila.useValor()
  const pendentes = estado.acoes.length

  useEffect(() => {
    carregar().then(sincronizar)
    const assinatura = AppState.addEventListener('change', (s) => {
      if (s === 'active') sincronizar()
    })
    return () => assinatura.remove()
  }, [])

  useEffect(() => {
    if (!pendentes) return
    const relogio = setInterval(sincronizar, 20_000)
    return () => clearInterval(relogio)
  }, [pendentes])

  return estado
}

/** A chamada do banco com o que ainda esta na fila por cima (a tela mostra ja). */
export function comAFila(c: Chamada, acoes: Acao[], resolvidas: Record<string, string>): Chamada {
  const minhas = acoes.filter((a) => (resolvidas[a.chamada] ?? a.chamada) === c.id)
  if (!minhas.length) return c
  const marcas = { ...c.marcas }
  let estado = c.estado
  for (const a of minhas) {
    if (a.tipo === 'marcar') marcas[a.criancaId] = a.por
    else if (a.tipo === 'desmarcar') delete marcas[a.criancaId]
    else if (a.tipo === 'encerrar') estado = 'encerrada'
  }
  return { ...c, marcas, estado }
}

/** A chamada que so existe no celular, montada a partir da fila. */
export function chamadaLocal(id: string, acoes: Acao[], eu: string): Chamada | null {
  const abrir = acoes.find((a) => a.tipo === 'abrir' && a.chamada === id) as
    Extract<Acao, { tipo: 'abrir' }> | undefined
  if (!abrir) return null
  return comAFila(
    {
      id,
      data: abrir.data,
      unidade_id: abrir.unidadeId,
      turma: abrir.turma,
      estado: 'andamento',
      encerrada_em: null,
      participantes: [eu],
      marcas: {},
      correcoes: [],
    },
    acoes,
    {},
  )
}

/** Os nomes de quem veio sem ficha que ainda estao na fila. */
export const avulsosNaFila = (acoes: Acao[], chamada: string, resolvidas: Record<string, string>) =>
  acoes
    .filter(
      (a): a is Extract<Acao, { tipo: 'avulso' }> =>
        a.tipo === 'avulso' && (resolvidas[a.chamada] ?? a.chamada) === chamada,
    )
    .map((a) => a.nome)
