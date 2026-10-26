import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { iniciaisDe } from '@/data/jogo'
import { supabase } from '@/lib/supabase'

/**
 * A Chamada, no banco (supabase/migrations: chamadas, chamada_marcas...).
 *
 * UMA por turma, unidade e dia, feita a varias maos. Cada marca guarda quem
 * marcou; as marcas de quem esta marcando junto chegam na hora pelo Realtime.
 * A chamada sobe uma vez, quando alguem que esta marcando encerra (a funcao
 * `encerrar_chamada` do banco confere isso). Encerrada, ela se corrige ate o
 * fim do dia, e a correcao fica registrada com quem corrigiu.
 *
 * Quem pode o que nao e decidido aqui: as politicas do banco (RLS) recusam o
 * que o perfil nao pode. Aqui so se mostra e se pede.
 */
export type Turma = 'pequenos' | 'maiores'
export const TURMAS: readonly Turma[] = ['pequenos', 'maiores']
export const NOME_TURMA: Record<Turma, string> = { pequenos: 'Pequenos', maiores: 'Maiores' }
// O horario ainda e fixo: vira dado quando os treinos forem para o banco.
export const HORARIO: Record<Turma, string> = { pequenos: '08h', maiores: '10h' }

export type Unidade = { id: string; nome: string }
export type Crianca = { id: string; nome: string; idade: number; turma: Turma; unidade_id: string }
export type Pessoa = { nome: string; iniciais: string }

export type Chamada = {
  id: string
  data: string
  unidade_id: string
  turma: Turma
  estado: 'andamento' | 'encerrada'
  encerrada_em: string | null
  /** id de quem esta marcando (ou marcou) */
  participantes: string[]
  /** id da crianca -> id de quem marcou */
  marcas: Record<string, string>
  correcoes: { por: string; em: string }[]
}

export type Avulso = { id: string; nome: string }

/** "2026-10-02" no relogio do aparelho — o mesmo dia do banco (Brasilia). */
export function hojeLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "10h05" — sem Intl, que derruba o Hermes do Expo Go em pt-BR. */
export function horaDe(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}

/** "você e Rafael", a partir dos ids. */
export function juntos(ids: string[], eu: string | null, equipe: Record<string, Pessoa>) {
  return ids.map((id) => (id === eu ? 'você' : (equipe[id]?.nome.split(' ')[0] ?? '…'))).join(' e ')
}

// ─── leitura ──────────────────────────────────────────────────────────

async function lerChamadas(filtro: {
  ids?: string[]
  data?: string
  /** so as de dias anteriores a este */
  antesDe?: string
  unidade?: string
  estado?: Chamada['estado']
}) {
  let consulta = supabase
    .from('chamadas')
    .select('id, data, unidade_id, turma, estado, encerrada_em')
  if (filtro.ids) consulta = consulta.in('id', filtro.ids)
  if (filtro.data) consulta = consulta.eq('data', filtro.data)
  if (filtro.antesDe) consulta = consulta.lt('data', filtro.antesDe)
  if (filtro.unidade) consulta = consulta.eq('unidade_id', filtro.unidade)
  if (filtro.estado) consulta = consulta.eq('estado', filtro.estado)
  const { data: base, error } = await consulta
  if (error) throw error
  if (!base?.length) return []

  const ids = base.map((c) => c.id)
  const [participantes, marcas, correcoes] = await Promise.all([
    supabase
      .from('chamada_participantes')
      .select('chamada_id, usuario_id, entrou_em')
      .in('chamada_id', ids)
      .order('entrou_em'),
    supabase
      .from('chamada_marcas')
      .select('chamada_id, crianca_id, marcado_por')
      .in('chamada_id', ids),
    supabase
      .from('chamada_correcoes')
      .select('chamada_id, corrigida_por, corrigida_em')
      .in('chamada_id', ids)
      .order('corrigida_em'),
  ])
  for (const r of [participantes, marcas, correcoes]) if (r.error) throw r.error

  return base.map<Chamada>((c) => ({
    ...c,
    turma: c.turma as Turma,
    estado: c.estado as Chamada['estado'],
    participantes: (participantes.data ?? [])
      .filter((p) => p.chamada_id === c.id)
      .map((p) => p.usuario_id),
    marcas: Object.fromEntries(
      (marcas.data ?? [])
        .filter((m) => m.chamada_id === c.id)
        .map((m) => [m.crianca_id, m.marcado_por]),
    ),
    correcoes: (correcoes.data ?? [])
      .filter((r) => r.chamada_id === c.id)
      .map((r) => ({ por: r.corrigida_por, em: r.corrigida_em })),
  }))
}

/**
 * Assina as tabelas da chamada e chama `aoMudar` a cada alteracao. As
 * exclusoes so chegam filtradas porque `chamada_marcas` tem replica
 * identity full (ver a migracao).
 */
function acompanhar(
  nome: string,
  filtros: { tabela: string; filtro?: string }[],
  aoMudar: () => void,
) {
  let canal = supabase.channel(`${nome}-${Math.random().toString(36).slice(2)}`)
  for (const { tabela, filtro } of filtros) {
    canal = canal.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tabela, ...(filtro ? { filter: filtro } : {}) },
      aoMudar,
    )
  }
  canal.subscribe()
  return () => {
    supabase.removeChannel(canal)
  }
}

type Estado<T> = { dados: T; carregando: boolean; erro: string | null }

/**
 * Busca que falhou (o sinal caiu) nao apaga o que ja esta na tela: fica o
 * que havia, so com o erro anotado para o aviso.
 */
function mantendo<T>(erro: string) {
  return (antes: Estado<T>): Estado<T> => ({ ...antes, carregando: false, erro })
}

// ─── o que a chamada precisa ter no celular sem internet ─────────────
// Unidades, criancas (nome, idade, turma) e nomes da equipe ficam guardados
// a cada vez que chegam do banco; sem conexao, a tela usa o que guardou e a
// chamada continua (data/chamada-offline.ts).

const podeGuardar = Platform.OS !== 'web' || typeof window !== 'undefined'

function lembrar(chave: string, valor: unknown) {
  if (!podeGuardar) return
  AsyncStorage.setItem(`adam.guardado.${chave}`, JSON.stringify(valor)).catch(() => {})
}

async function lembrado<T>(chave: string): Promise<T | null> {
  if (!podeGuardar) return null
  try {
    const texto = await AsyncStorage.getItem(`adam.guardado.${chave}`)
    return texto ? (JSON.parse(texto) as T) : null
  } catch {
    return null
  }
}

/**
 * Tira um item excluido (ou desativado) da lista guardada no celular. Sem
 * isto, a crianca ou a unidade apagada voltava na proxima vez que a tela
 * caisse no guardado por falta de sinal. A proxima busca com sinal grava a
 * lista inteira de novo.
 */
export async function esquecerNoCelular(chave: 'criancas' | 'unidades', id: string) {
  const lista = await lembrado<{ id: string }[]>(chave)
  if (!lista) return
  const resto = lista.filter((item) => item.id !== id)
  if (resto.length === lista.length || !podeGuardar) return
  await AsyncStorage.setItem(`adam.guardado.${chave}`, JSON.stringify(resto)).catch(() => {})
}

/** Chamada que so existe no celular (feita sem sinal) — nao se busca no banco. */
const soNoCelular = (id: string) => id.startsWith('local-')

/** A equipe (para mostrar quem marcou). Ativos leem os nomes da equipe. */
export function useEquipe() {
  const [equipe, setEquipe] = useState<Record<string, Pessoa>>({})
  useEffect(() => {
    let ativo = true
    supabase
      .from('usuarios')
      .select('id, nome')
      .then(async ({ data }) => {
        if (!ativo) return
        if (data) {
          const equipe = Object.fromEntries(
            data.map((u) => [u.id, { nome: u.nome, iniciais: iniciaisDe(u.nome) }]),
          )
          lembrar('equipe', equipe)
          setEquipe(equipe)
          return
        }
        const guardada = await lembrado<Record<string, Pessoa>>('equipe')
        if (ativo && guardada) setEquipe(guardada)
      })
    return () => {
      ativo = false
    }
  }, [])
  return equipe
}

/**
 * As unidades. `recarregar` (a tela volta ao foco) busca de novo: a unidade
 * excluida em Ajustes some das outras abas sem precisar fechar o app.
 */
export function useUnidades() {
  const [estado, setEstado] = useState<Estado<Unidade[]>>({
    dados: [],
    carregando: true,
    erro: null,
  })

  const buscar = useCallback(
    () =>
      supabase
        .from('unidades')
        .select('id, nome')
        .order('nome')
        .then(async ({ data, error }): Promise<(antes: Estado<Unidade[]>) => Estado<Unidade[]>> => {
          if (!error) {
            lembrar('unidades', data ?? [])
            return () => ({ dados: data ?? [], carregando: false, erro: null })
          }
          const guardadas = await lembrado<Unidade[]>('unidades')
          if (guardadas) return () => ({ dados: guardadas, carregando: false, erro: null })
          // sem sinal e sem nada guardado: o que ja estava na tela fica
          return (antes) =>
            antes.dados.length
              ? { ...antes, carregando: false }
              : { dados: [], carregando: false, erro: 'Não foi possível carregar as unidades.' }
        }),
    [],
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

/**
 * Nome, idade e turma de cada crianca ativa — pela funcao do banco, que e o
 * que treinador e professor podem ver (a ficha inteira eles nao leem).
 */
export function useCriancas() {
  const [estado, setEstado] = useState<Estado<Crianca[]>>({
    dados: [],
    carregando: true,
    erro: null,
  })

  // `recarregar` na volta ao foco: crianca excluida ou desativada na
  // Secretaria sai da chamada sem precisar fechar o app
  const buscar = useCallback(
    () =>
      supabase
        .rpc('criancas_basico')
        .then(async ({ data, error }): Promise<(antes: Estado<Crianca[]>) => Estado<Crianca[]>> => {
          if (!error) {
            const dados = ((data ?? []) as Crianca[]).map((c) => ({
              ...c,
              turma: c.turma as Turma,
            }))
            lembrar('criancas', dados)
            return () => ({ dados, carregando: false, erro: null })
          }
          const guardadas = await lembrado<Crianca[]>('criancas')
          if (guardadas) return () => ({ dados: guardadas, carregando: false, erro: null })
          return (antes) =>
            antes.dados.length
              ? { ...antes, carregando: false }
              : { dados: [], carregando: false, erro: 'Não foi possível carregar as crianças.' }
        }),
    [],
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

/** As chamadas de hoje de uma unidade, por turma, ao vivo. */
export function useChamadasDoDia(unidadeId: string | null) {
  const [estado, setEstado] = useState<Estado<Partial<Record<Turma, Chamada>>>>({
    dados: {},
    carregando: true,
    erro: null,
  })

  // A busca so devolve os dados; quem guarda no estado e o retorno da
  // promessa. Assim nenhum setState roda direto no corpo do efeito.
  const buscar = useCallback(
    () =>
      lerChamadas({ data: hojeLocal(), unidade: unidadeId ?? undefined }).then(
        (lista) => (): Estado<Partial<Record<Turma, Chamada>>> => ({
          dados: Object.fromEntries(lista.map((c) => [c.turma, c])) as Partial<
            Record<Turma, Chamada>
          >,
          carregando: false,
          erro: null,
        }),
        () => mantendo<Partial<Record<Turma, Chamada>>>('Não foi possível carregar a chamada.'),
      ),
    [unidadeId],
  )

  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])

  useEffect(() => {
    if (!unidadeId) return
    let ativo = true
    const aplicar = () =>
      buscar().then((novo) => {
        if (ativo) setEstado(novo)
      })
    aplicar()
    const parar = acompanhar(
      'chamadas-do-dia',
      [
        { tabela: 'chamadas', filtro: `unidade_id=eq.${unidadeId}` },
        { tabela: 'chamada_participantes' },
        { tabela: 'chamada_marcas' },
      ],
      aplicar,
    )
    return () => {
      ativo = false
      parar()
    }
  }, [unidadeId, buscar])

  return { ...estado, recarregar }
}

/**
 * As chamadas de dias anteriores que ficaram em andamento numa unidade. A
 * tela do dia so mostra as de hoje; sem esta lista, quem esqueceu de
 * encerrar nao achava mais a chamada, e ela nunca chegava nas metricas.
 */
export function useChamadasAbertas(unidadeId: string | null) {
  const [estado, setEstado] = useState<Estado<Chamada[]>>({
    dados: [],
    carregando: true,
    erro: null,
  })

  const buscar = useCallback(
    () =>
      lerChamadas({
        antesDe: hojeLocal(),
        unidade: unidadeId ?? undefined,
        estado: 'andamento',
      }).then(
        (lista) => (): Estado<Chamada[]> => ({
          dados: [...lista].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)),
          carregando: false,
          erro: null,
        }),
        () => mantendo<Chamada[]>('Não foi possível carregar as chamadas abertas.'),
      ),
    [unidadeId],
  )

  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])

  useEffect(() => {
    if (!unidadeId) return
    let ativo = true
    const aplicar = () =>
      buscar().then((novo) => {
        if (ativo) setEstado(novo)
      })
    aplicar()
    const parar = acompanhar(
      'chamadas-abertas',
      [{ tabela: 'chamadas', filtro: `unidade_id=eq.${unidadeId}` }, { tabela: 'chamada_marcas' }],
      aplicar,
    )
    return () => {
      ativo = false
      parar()
    }
  }, [unidadeId, buscar])

  return { ...estado, recarregar }
}

/** Uma chamada, ao vivo: as marcas de quem marca junto chegam sozinhas. */
export function useChamada(id: string) {
  const [estado, setEstado] = useState<Estado<Chamada | null>>({
    dados: null,
    carregando: !soNoCelular(id),
    erro: null,
  })

  const buscar = useCallback(
    () =>
      lerChamadas({ ids: [id] }).then(
        ([c]) =>
          (): Estado<Chamada | null> => ({
            dados: c ?? null,
            carregando: false,
            erro: c ? null : 'Chamada não encontrada.',
          }),
        () => mantendo<Chamada | null>('Não foi possível carregar a chamada.'),
      ),
    [id],
  )

  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])

  useEffect(() => {
    if (soNoCelular(id)) return
    let ativo = true
    const aplicar = () =>
      buscar().then((novo) => {
        if (ativo) setEstado(novo)
      })
    aplicar()
    const parar = acompanhar(
      'chamada',
      [
        { tabela: 'chamadas', filtro: `id=eq.${id}` },
        { tabela: 'chamada_participantes', filtro: `chamada_id=eq.${id}` },
        { tabela: 'chamada_marcas', filtro: `chamada_id=eq.${id}` },
      ],
      aplicar,
    )
    return () => {
      ativo = false
      parar()
    }
  }, [id, buscar])

  return { ...estado, recarregar }
}

export function useAvulsos(chamadaId: string) {
  const [lista, setLista] = useState<Avulso[]>([])

  const buscar = useCallback(
    () =>
      supabase
        .from('chamada_avulsos')
        .select('id, nome')
        .eq('chamada_id', chamadaId)
        .order('criado_em')
        // erro (sem rede): null, e a lista que ja estava na tela fica
        .then(({ data, error }) => (error ? null : (data ?? []))),
    [chamadaId],
  )

  const recarregar = useCallback(
    () =>
      buscar().then((novos) => {
        if (novos) setLista(novos)
      }),
    [buscar],
  )

  // busca ao abrir e a cada vez que a tela volta ao foco: quem digitou um
  // nome em "Sem ficha" volta para a lista e ve a contagem certa
  useFocusEffect(
    useCallback(() => {
      if (soNoCelular(chamadaId)) return
      let ativo = true
      buscar().then((novos) => {
        if (ativo && novos) setLista(novos)
      })
      return () => {
        ativo = false
      }
    }, [buscar, chamadaId]),
  )

  return { lista, recarregar }
}

// ─── escrita ──────────────────────────────────────────────────────────

/** Comeca a chamada (se ninguem comecou) ou entra na que esta em andamento. */
export async function entrarNaChamada(unidadeId: string, turma: Turma) {
  const { data, error } = await supabase.rpc('entrar_na_chamada', {
    p_unidade: unidadeId,
    p_turma: turma,
  })
  if (error) throw error
  return data as string
}

export async function marcar(chamadaId: string, criancaId: string) {
  const { error } = await supabase
    .from('chamada_marcas')
    .insert({ chamada_id: chamadaId, crianca_id: criancaId })
  // marca repetida (outra pessoa marcou no mesmo instante) nao e erro
  if (error && error.code !== '23505') throw error
}

export async function desmarcar(chamadaId: string, criancaId: string) {
  const { error } = await supabase
    .from('chamada_marcas')
    .delete()
    .eq('chamada_id', chamadaId)
    .eq('crianca_id', criancaId)
  if (error) throw error
}

/** Qualquer um que esteja marcando encerra. E aqui que a chamada sobe. */
export async function encerrar(chamadaId: string) {
  const { error } = await supabase.rpc('encerrar_chamada', { p_chamada: chamadaId })
  if (error) throw error
}

/**
 * A correcao que parou no meio: `etapa` diz onde. Em 'marcas', so
 * `aplicadas` de `total` mudancas chegaram ao banco; em 'registro', todas
 * chegaram mas o registro de quem corrigiu nao. Repetir e seguro: marcar de
 * novo quem ja esta marcado e desmarcar quem ja saiu nao muda nada.
 */
export type CorrecaoIncompleta = Error & {
  etapa: 'marcas' | 'registro'
  aplicadas: number
  total: number
  causa: unknown
}

export const correcaoIncompleta = (e: unknown): e is CorrecaoIncompleta =>
  !!e && typeof e === 'object' && 'etapa' in e && 'aplicadas' in e

/** Aplica a diferenca entre antes e depois e registra quem corrigiu. */
export async function salvarCorrecao(
  chamadaId: string,
  antes: Record<string, string>,
  depois: Record<string, string>,
) {
  const entraram = Object.keys(depois).filter((id) => !antes[id])
  const sairam = Object.keys(antes).filter((id) => !depois[id])
  const total = entraram.length + sairam.length
  let aplicadas = 0
  const parou = (etapa: CorrecaoIncompleta['etapa'], causa: unknown): CorrecaoIncompleta =>
    Object.assign(
      new Error(String((causa as { message?: string } | null)?.message ?? causa ?? '')),
      { etapa, aplicadas, total, causa },
    )
  try {
    for (const id of entraram) {
      await marcar(chamadaId, id)
      aplicadas++
    }
    for (const id of sairam) {
      await desmarcar(chamadaId, id)
      aplicadas++
    }
  } catch (e) {
    throw parou('marcas', e)
  }
  const { error } = await supabase.rpc('registrar_correcao', { p_chamada: chamadaId })
  if (error) throw parou('registro', error)
}

export async function adicionarAvulso(chamadaId: string, nome: string) {
  const { error } = await supabase.from('chamada_avulsos').insert({ chamada_id: chamadaId, nome })
  if (error) throw error
}

export async function removerAvulso(id: string) {
  const { error } = await supabase.from('chamada_avulsos').delete().eq('id', id)
  if (error) throw error
}

/**
 * Exclui a chamada do banco: as marcas, quem marcou, as correcoes e os nomes
 * sem ficha vao junto (o banco apaga em cascata), e ela deixa de contar na
 * frequencia e nas metricas. So quem administra a Chamada (ADM ou qualquer
 * "Coordenar setor"); o banco confere de novo e, para os outros, nao apaga
 * nada.
 */
export async function excluirChamada(id: string) {
  const { count, error } = await supabase.from('chamadas').delete({ count: 'exact' }).eq('id', id)
  if (error) {
    // a mesma conta de "sem conexao" da fila (data/chamada-offline.ts)
    const semSinal = /network|fetch|internet|timed? ?out|load failed|connection|offline/i.test(
      error.message ?? '',
    )
    throw new Error(
      semSinal
        ? 'Excluir a chamada precisa de internet. Tente de novo quando a conexão voltar.'
        : error.code === '23503'
          ? 'Falta rodar o SQL de exclusão da chamada no Supabase.'
          : 'Não foi possível excluir a chamada.',
    )
  }
  // o banco nao apagou nada: quem pediu nao administra a Chamada
  if (!count) throw new Error('Só a coordenação pode excluir uma chamada.')
}
