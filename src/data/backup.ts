import { File, Paths } from 'expo-file-system'
import { useFocusEffect } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useState } from 'react'
import { Platform } from 'react-native'

import { todasAsLinhas } from '@/lib/consulta'
import { URL_SITE } from '@/lib/site'
import { supabase } from '@/lib/supabase'

/**
 * Copias de seguranca (so a conta de suporte). A automatica roda 3 vezes por dia na
 * Vercel (api/backup.ts) e vai para a pasta do Google Drive da ADAM; cada
 * uma deixa uma linha na tabela `backups`, que esta tela mostra.
 *
 * Alem dela, o ADM pode pedir uma agora, ou baixar uma copia dos dados para
 * o proprio aparelho (para guardar num pendrive antes das ferias).
 */

/**
 * So a conta de suporte da ADAM ve a tela de copias e pede copia (pedido da
 * coordenacao em 15/10/2026); os outros ADMs nem veem a linha. O servidor
 * confere de novo (api/backup.ts). Pelo e-mail, que e unico no Supabase.
 */
export const RESPONSAVEL_BACKUP = 'suporte.ti@adam.ong.br'

export const cuidaDoBackup = (email: string | null | undefined) =>
  (email ?? '').trim().toLowerCase() === RESPONSAVEL_BACKUP

export type RegistroBackup = {
  id: number
  feitoEm: string
  origem: 'agendado' | 'manual'
  ok: boolean
  linhas: number | null
  arquivosNovos: number | null
  arquivosPendentes: number | null
  arquivo: string | null
  erro: string | null
}

/** As ultimas copias. `faltaSql` = a tabela ainda nao existe no banco. */
export function useBackups() {
  const [estado, setEstado] = useState<{
    lista: RegistroBackup[]
    carregando: boolean
    faltaSql: boolean
    erro: string | null
  }>({ lista: [], carregando: true, faltaSql: false, erro: null })

  const buscar = useCallback(async () => {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('feito_em', { ascending: false })
      .limit(15)
    if (error) {
      const faltaSql = error.code === 'PGRST205' || error.code === '42P01'
      return {
        lista: [],
        carregando: false,
        faltaSql,
        erro: faltaSql ? null : 'Não foi possível ler as cópias.',
      }
    }
    return {
      lista: (data ?? []).map((b) => ({
        id: b.id as number,
        feitoEm: b.feito_em as string,
        origem: b.origem as RegistroBackup['origem'],
        ok: b.ok as boolean,
        linhas: (b.linhas as number | null) ?? null,
        arquivosNovos: (b.arquivos_novos as number | null) ?? null,
        arquivosPendentes: (b.arquivos_pendentes as number | null) ?? null,
        arquivo: (b.arquivo as string | null) ?? null,
        erro: (b.erro as string | null) ?? null,
      })),
      carregando: false,
      faltaSql: false,
      erro: null,
    }
  }, [])

  const recarregar = useCallback(() => buscar().then(setEstado), [buscar])
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )
  return { ...estado, recarregar }
}

/** Pede uma copia agora, igual a agendada (banco + fotos novas no Drive). */
export async function fazerCopiaAgora() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Entre de novo para fazer a cópia.')
  let resposta: Response
  try {
    resposta = await fetch(`${URL_SITE}/api/backup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Sem conexão com o servidor. Confira a internet.')
  }
  const corpo = (await resposta.json().catch(() => null)) as {
    ok?: boolean
    erro?: string
    linhas?: number
    arquivos_novos?: number
    arquivos_pendentes?: number
  } | null
  if (!corpo?.ok) throw new Error(corpo?.erro ?? 'A cópia não foi feita.')
  return corpo
}

/** As mesmas tabelas da copia automatica (o ADM le todas pelo RLS). */
const TABELAS = [
  'unidades',
  'usuarios',
  'criancas',
  'responsaveis',
  'documentos',
  'livro_tipos',
  'livros',
  'emprestimos',
  'aulas',
  'exercicios',
  'treinos',
  'treino_comissao',
  'treino_exercicios',
  'treino_avaliacoes',
  'escala',
  'jogos',
  'jogo_convocados',
  'jogo_comissao',
  'chamadas',
  'chamada_participantes',
  'chamada_marcas',
  'chamada_avulsos',
  'chamada_correcoes',
]

/**
 * Baixa os dados para este aparelho (as fotos e os documentos ficam na
 * copia do Drive). No navegador vira um download; no celular, abre o
 * "Compartilhar" para salvar em Arquivos, Drive ou mandar para alguem.
 */
export async function baixarCopiaAqui() {
  const tabelas: Record<string, unknown[]> = {}
  for (const nome of TABELAS) {
    try {
      tabelas[nome] = await todasAsLinhas<Record<string, unknown>>((de, ate) =>
        supabase.from(nome).select('*').range(de, ate),
      )
    } catch {
      // tabela que ainda nao existe (SQL que nao rodou): fica de fora
    }
  }
  const agora = new Date()
  const dois = (n: number) => String(n).padStart(2, '0')
  const nome = `adam-copia-${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}_${dois(agora.getHours())}h${dois(agora.getMinutes())}.json`
  const conteudo = JSON.stringify(
    { sistema: 'ADAM', versao: 1, feito_em: agora.toISOString(), origem: 'aparelho', tabelas },
    null,
    1,
  )

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = nome
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return nome
  }

  const arquivo = new File(Paths.cache, nome)
  arquivo.create({ overwrite: true })
  arquivo.write(conteudo)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: nome })
  }
  return nome
}
