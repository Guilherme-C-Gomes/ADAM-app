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
  /** o que o banco recusou de vez (nao e falta de sinal), em portugues para a tela */
  falhas: string[]
  /** a mensagem crua do banco de cada falha, so para depurar */
  brutas: string[]
  enviando: boolean
}

const CHAVE = 'adam.fila-chamada'
const fila = criarRascunho<Fila>({
  acoes: [],
  resolvidas: {},
  falhas: [],
  brutas: [],
  enviando: false,
})

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
          brutas: lido.brutas ?? [],
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
  const { acoes, resolvidas, falhas, brutas } = fila.ler()
  await AsyncStorage.setItem(CHAVE, JSON.stringify({ acoes, resolvidas, falhas, brutas })).catch(
    () => {},
  )
}

/** A acao falhou por falta de conexao (e nao porque o banco recusou)? */
export function semConexao(e: unknown) {
  const texto = String((e as { message?: string } | null)?.message ?? e ?? '')
  return /network|fetch|internet|timed? ?out|load failed|connection|offline/i.test(texto)
}

export const ehLocal = (id: string) => id.startsWith('local-')
export const idLocal = (data: string, unidadeId: string, turma: Turma) =>
  `local-${data}-${unidadeId}-${turma}`

// a acao que esta indo para o banco agora: ela nao se anula na fila, porque
// ja saiu do celular (ver enfileirar)
let emVoo: Acao | null = null
// a rodada de envio em curso, para quem quiser esperar ela terminar
let rodando: Promise<void> | null = null

/** Tira a acao enviada da fila DE AGORA, pela identidade (nao pela posicao). */
const sem = (acoes: Acao[], acao: Acao) => acoes.filter((a) => a !== acao)

const daChamada = (a: Acao, chamada: string, resolvidas: Record<string, string>) =>
  (resolvidas[a.chamada] ?? a.chamada) === chamada

/** Ha algo desta chamada ainda na fila do celular (pelo id local ou o do banco)? */
export async function temNaFila(chamada: string) {
  await carregar()
  const { acoes, resolvidas } = fila.ler()
  return acoes.some((a) => daChamada(a, chamada, resolvidas))
}

/** Poe uma acao na fila e ja tenta mandar (se a conexao voltou, sobe). */
export async function enfileirar(acao: Acao) {
  await carregar()
  let acoes = [...fila.ler().acoes]
  // marcar e desmarcar a mesma crianca antes de subir: um anula o outro.
  // A que ja esta indo para o banco nao conta: ela chega la de qualquer
  // jeito, entao o oposto precisa ir depois dela.
  if (acao.tipo === 'marcar' || acao.tipo === 'desmarcar') {
    const oposto = acao.tipo === 'marcar' ? 'desmarcar' : 'marcar'
    let i = -1
    for (let j = acoes.length - 1; j >= 0 && i < 0; j--) {
      const a = acoes[j]
      if (
        a !== emVoo &&
        a.tipo === oposto &&
        a.chamada === acao.chamada &&
        a.criancaId === acao.criancaId
      ) {
        i = j
      }
    }
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

/** Recusa que ja nasce em portugues, pronta para a tela. */
const recusa = (texto: string) => Object.assign(new Error(texto), { paraTela: true })

const OQUE: Record<Acao['tipo'], string> = {
  abrir: 'Abrir a chamada',
  marcar: 'Uma marca de presença',
  desmarcar: 'Um desmarque',
  encerrar: 'Encerrar a chamada',
  avulso: 'Um nome sem ficha',
}

/** A recusa do banco (em ingles, tecnica) virada em frase para a tela. */
export function motivoEmPortugues(acao: Acao, e: unknown) {
  const erro = (e ?? {}) as { message?: string; code?: string; paraTela?: boolean }
  const bruta = String(erro.message ?? e ?? '')
  if (erro.paraTela) return bruta
  const oque = acao.tipo === 'avulso' ? `O nome "${acao.nome}"` : OQUE[acao.tipo]
  let porque = 'o banco não aceitou.'
  if (/so quem esta marcando encerra/i.test(bruta)) {
    porque = 'só quem está marcando encerra uma chamada em andamento.'
  } else if (/acesso inativo/i.test(bruta)) {
    porque = 'seu acesso está inativo. Fale com a coordenação.'
  } else if (erro.code === '42501' || /row-level security|permission denied/i.test(bruta)) {
    porque = 'a chamada já foi encerrada ou você não está marcando nela.'
  } else if (erro.code === '23503' || /foreign key/i.test(bruta)) {
    porque = 'a criança ou a chamada não existe mais no banco.'
  } else if (erro.code === '22P02' || /invalid input syntax/i.test(bruta)) {
    porque = 'a chamada não foi encontrada no banco.'
  }
  return `${oque} não subiu: ${porque}`
}

/**
 * Manda a fila, na ordem. Para no primeiro "sem conexao". Se ja estiver
 * mandando, devolve a mesma rodada (quem espera, espera ela acabar).
 */
export async function sincronizar(): Promise<void> {
  await carregar()
  if (fila.ler().enviando) return rodando ?? undefined
  if (!fila.ler().acoes.length) return
  rodando = enviar()
  return rodando
}

async function enviar() {
  fila.definir({ enviando: true })
  try {
    for (;;) {
      // sempre a fila de agora: enquanto uma acao vai, outras entram
      const acao = fila.ler().acoes[0]
      if (!acao) break
      emVoo = acao
      const real = (id: string) => fila.ler().resolvidas[id] ?? id
      try {
        if (acao.tipo === 'abrir') {
          if (acao.data !== hojeLocal()) {
            throw recusa(
              'Uma chamada feita sem internet não subiu no mesmo dia. Avise a coordenação.',
            )
          }
          const id = await entrarNaChamada(acao.unidadeId, acao.turma)
          const agora = fila.ler()
          await guardar({
            acoes: sem(agora.acoes, acao),
            resolvidas: { ...agora.resolvidas, [acao.chamada]: id },
          })
          continue
        }
        const chamada = real(acao.chamada)
        if (ehLocal(chamada)) throw recusa('A chamada desta marca ainda não abriu no banco.')
        if (acao.tipo === 'marcar') await marcar(chamada, acao.criancaId)
        else if (acao.tipo === 'desmarcar') await desmarcar(chamada, acao.criancaId)
        else if (acao.tipo === 'encerrar') await encerrar(chamada)
        else if (acao.tipo === 'avulso') await adicionarAvulso(chamada, acao.nome)
        await guardar({ acoes: sem(fila.ler().acoes, acao) })
      } catch (e) {
        // a recusa nossa nao e falta de sinal, mesmo dizendo "internet" no
        // texto (senao a fila parava para sempre nela)
        if (!(e as { paraTela?: boolean } | null)?.paraTela && semConexao(e)) break
        // o banco recusou de vez: anota em portugues (e a crua, para depurar)
        // e segue com o resto
        const agora = fila.ler()
        await guardar({
          acoes: sem(agora.acoes, acao),
          falhas: [...agora.falhas, motivoEmPortugues(acao, e)].slice(-10),
          brutas: [...agora.brutas, String((e as { message?: string } | null)?.message ?? e)].slice(
            -10,
          ),
        })
      } finally {
        emVoo = null
      }
    }
  } finally {
    emVoo = null
    rodando = null
    fila.definir({ enviando: false })
  }
}

export async function esquecerFalhas() {
  await guardar({ falhas: [], brutas: [] })
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
  const minhas = acoes.filter((a) => daChamada(a, c.id, resolvidas))
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
        a.tipo === 'avulso' && daChamada(a, chamada, resolvidas),
    )
    .map((a) => a.nome)
