import { useCallback, useEffect, useState } from 'react'

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
  return ids
    .map((id) => (id === eu ? 'você' : (equipe[id]?.nome.split(' ')[0] ?? '…')))
    .join(' e ')
}

// ─── leitura ──────────────────────────────────────────────────────────

async function lerChamadas(filtro: { ids?: string[]; data?: string; unidade?: string }) {
  let consulta = supabase
    .from('chamadas')
    .select('id, data, unidade_id, turma, estado, encerrada_em')
  if (filtro.ids) consulta = consulta.in('id', filtro.ids)
  if (filtro.data) consulta = consulta.eq('data', filtro.data)
  if (filtro.unidade) consulta = consulta.eq('unidade_id', filtro.unidade)
  const { data: base, error } = await consulta
  if (error) throw error
  if (!base?.length) return []

  const ids = base.map((c) => c.id)
  const [participantes, marcas, correcoes] = await Promise.all([
    supabase.from('chamada_participantes').select('chamada_id, usuario_id, entrou_em').in('chamada_id', ids).order('entrou_em'),
    supabase.from('chamada_marcas').select('chamada_id, crianca_id, marcado_por').in('chamada_id', ids),
    supabase.from('chamada_correcoes').select('chamada_id, corrigida_por, corrigida_em').in('chamada_id', ids).order('corrigida_em'),
  ])
  for (const r of [participantes, marcas, correcoes]) if (r.error) throw r.error

  return base.map<Chamada>((c) => ({
    ...c,
    turma: c.turma as Turma,
    estado: c.estado as Chamada['estado'],
    participantes: (participantes.data ?? []).filter((p) => p.chamada_id === c.id).map((p) => p.usuario_id),
    marcas: Object.fromEntries(
      (marcas.data ?? []).filter((m) => m.chamada_id === c.id).map((m) => [m.crianca_id, m.marcado_por]),
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
function acompanhar(nome: string, filtros: { tabela: string; filtro?: string }[], aoMudar: () => void) {
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

/** A equipe (para mostrar quem marcou). Ativos leem os nomes da equipe. */
export function useEquipe() {
  const [equipe, setEquipe] = useState<Record<string, Pessoa>>({})
  useEffect(() => {
    let ativo = true
    supabase
      .from('usuarios')
      .select('id, nome')
      .then(({ data }) => {
        if (!ativo || !data) return
        setEquipe(Object.fromEntries(data.map((u) => [u.id, { nome: u.nome, iniciais: iniciaisDe(u.nome) }])))
      })
    return () => {
      ativo = false
    }
  }, [])
  return equipe
}

export function useUnidades() {
  const [estado, setEstado] = useState<Estado<Unidade[]>>({ dados: [], carregando: true, erro: null })
  useEffect(() => {
    let ativo = true
    supabase
      .from('unidades')
      .select('id, nome')
      .order('nome')
      .then(({ data, error }) => {
        if (!ativo) return
        setEstado({ dados: data ?? [], carregando: false, erro: error ? 'Não foi possível carregar as unidades.' : null })
      })
    return () => {
      ativo = false
    }
  }, [])
  return estado
}

/**
 * Nome, idade e turma de cada crianca ativa — pela funcao do banco, que e o
 * que treinador e professor podem ver (a ficha inteira eles nao leem).
 */
export function useCriancas() {
  const [estado, setEstado] = useState<Estado<Crianca[]>>({ dados: [], carregando: true, erro: null })
  useEffect(() => {
    let ativo = true
    supabase.rpc('criancas_basico').then(({ data, error }) => {
      if (!ativo) return
      setEstado({
        dados: (data ?? []).map((c: Crianca) => ({ ...c, turma: c.turma as Turma })),
        carregando: false,
        erro: error ? 'Não foi possível carregar as crianças.' : null,
      })
    })
    return () => {
      ativo = false
    }
  }, [])
  return estado
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
        (lista) => ({
          dados: Object.fromEntries(lista.map((c) => [c.turma, c])) as Partial<Record<Turma, Chamada>>,
          carregando: false,
          erro: null,
        }),
        () => ({ dados: {}, carregando: false, erro: 'Não foi possível carregar a chamada.' }),
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

/** Uma chamada, ao vivo: as marcas de quem marca junto chegam sozinhas. */
export function useChamada(id: string) {
  const [estado, setEstado] = useState<Estado<Chamada | null>>({ dados: null, carregando: true, erro: null })

  const buscar = useCallback(
    () =>
      lerChamadas({ ids: [id] }).then(
        ([c]) => ({ dados: c ?? null, carregando: false, erro: c ? null : 'Chamada não encontrada.' }),
        () => ({ dados: null, carregando: false, erro: 'Não foi possível carregar a chamada.' }),
      ),
    [id],
  )

  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])

  useEffect(() => {
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
        .then(({ data }) => data ?? []),
    [chamadaId],
  )

  const recarregar = useCallback(() => buscar().then(setLista), [buscar])

  useEffect(() => {
    let ativo = true
    buscar().then((novos) => {
      if (ativo) setLista(novos)
    })
    return () => {
      ativo = false
    }
  }, [buscar])

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
  const { error } = await supabase.from('chamada_marcas').insert({ chamada_id: chamadaId, crianca_id: criancaId })
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

/** Aplica a diferenca entre antes e depois e registra quem corrigiu. */
export async function salvarCorrecao(chamadaId: string, antes: Record<string, string>, depois: Record<string, string>) {
  const entraram = Object.keys(depois).filter((id) => !antes[id])
  const sairam = Object.keys(antes).filter((id) => !depois[id])
  for (const id of entraram) await marcar(chamadaId, id)
  for (const id of sairam) await desmarcar(chamadaId, id)
  const { error } = await supabase.rpc('registrar_correcao', { p_chamada: chamadaId })
  if (error) throw error
}

export async function adicionarAvulso(chamadaId: string, nome: string) {
  const { error } = await supabase.from('chamada_avulsos').insert({ chamada_id: chamadaId, nome })
  if (error) throw error
}

export async function removerAvulso(id: string) {
  const { error } = await supabase.from('chamada_avulsos').delete().eq('id', id)
  if (error) throw error
}
