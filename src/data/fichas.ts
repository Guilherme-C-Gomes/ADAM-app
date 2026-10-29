import { useCallback, useEffect, useState } from 'react'

import { turmaDaIdade, type TurmaEstudo } from '@/data/estudo'
import { iniciaisDe } from '@/data/jogo'
import { FICHA_VAZIA, rascunhoFicha, type Anexo } from '@/data/rascunhos'
import { esquecerNoCelular } from '@/data/chamada'
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

/**
 * A turma do banco ("pequenos" | "maiores") que a crianca tinha no dia
 * `data`: o mesmo que `turma_da_idade` do SQL (anos completos de
 * `age(data, nascimento)`, 12 ou mais vai para os Maiores), so que na data
 * da chamada em vez de hoje. Tudo "AAAA-MM-DD", sem fuso.
 */
function turmaNaData(nascimento: string, data: string) {
  const anos =
    Number(data.slice(0, 4)) -
    Number(nascimento.slice(0, 4)) -
    (data.slice(5, 10) < nascimento.slice(5, 10) ? 1 : 0)
  return anos >= 12 ? 'maiores' : 'pequenos'
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
  /**
   * presencas / chamadas encerradas das ultimas 8 semanas que eram dela
   * (unidade dela, turma da idade no dia, entre `desde` e a saida) ou em
   * que ela foi marcada
   */
  frequencia: number | null
  presencas: number
  chamadas: number
  /** uma por semana, da mais antiga para a mais recente; null = sem chamada */
  semanas: (boolean | null)[]
  documentosEntregues: number
  temResponsavel: boolean
  /** false = saiu da ADAM (a ficha e o historico ficam) */
  ativa: boolean
  /** "AAAA-MM-DD" da saida, se saiu */
  saiuEm: string | null
  motivoSaida: string | null
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
  ativa: boolean
  saiu_em?: string | null
  motivo_saida?: string | null
}

/**
 * As fichas. Sem `id`: as ativas (ou, com `saidas`, so as de quem saiu).
 * Com `id`: aquela, ativa ou nao — o perfil de quem saiu continua abrindo.
 * `*` le a linha inteira, inclusive colunas que um SQL novo acrescenta
 * (saiu_em), sem quebrar enquanto ele nao roda.
 */
async function lerParticipantes(id?: string, saidas = false): Promise<Participante[]> {
  const criancas = (await todasAsLinhas((de, ate) => {
    let consulta = supabase
      .from('criancas')
      .select('*, unidades(nome), documentos(tipo), responsaveis(id)')
    consulta = id ? consulta.eq('id', id) : consulta.eq('ativa', !saidas)
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
    // A chamada conta para a crianca se ela foi marcada ali (presenca
    // registrada nunca some), ou se era a chamada dela naquele dia: a
    // unidade dela e a turma da idade que ela tinha NA DATA da chamada
    // (quem fez 12 anos no meio das 8 semanas muda de turma ali). Antes do
    // `desde` e a partir do dia da saida a falta nao conta: ela nao estava
    // mais na ADAM (quem e desativada hoje nao leva falta pela chamada de hoje).
    const daTurma = chamadas.filter(
      (ch) =>
        presente.has(`${ch.id}:${c.id}`) ||
        (ch.data >= c.desde &&
          (!c.saiu_em || ch.data < c.saiu_em) &&
          ch.unidade_id === c.unidade_id &&
          ch.turma === turmaNaData(c.nascimento, ch.data)),
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
      ativa: c.ativa,
      saiuEm: c.saiu_em ?? null,
      motivoSaida: c.motivo_saida ?? null,
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
export function useParticipantes(id?: string, saidas = false) {
  const [estado, setEstado] = useState<EstadoParticipantes>({
    lista: [],
    carregando: true,
    erro: null,
    atualizadoEm: '',
  })

  const buscar = useCallback(
    () =>
      lerParticipantes(id, saidas).then(
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
    [id, saidas],
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

// O parentesco e escrito; a coluna antiga `relacao` (enum) segue preenchida
// a partir dele, para quem ainda le dela.
function relacaoDo(parentesco: string) {
  const p = parentesco
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (p === 'mae') return 'mae'
  if (p === 'pai') return 'pai'
  if (p === 'avo') return 'avo'
  return 'outro'
}
const RELACAO_TELA: Record<string, string> = { mae: 'Mãe', pai: 'Pai', avo: 'Avó', outro: '' }
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

/**
 * Abre uma ficha existente no rascunho, para editar. Se qualquer parte nao
 * vier (a crianca, os responsaveis ou os documentos), nada entra no
 * rascunho: abrir com listas vazias faria o "Salvar" apagar o que existe.
 */
export async function abrirFicha(id: string) {
  const [crianca, responsaveis, documentos] = await Promise.all([
    supabase
      .from('criancas')
      .select('id, nome, nascimento, unidade_id, posicao, foto_path, observacao')
      .eq('id', id)
      .single(),
    supabase
      .from('responsaveis')
      .select('nome, relacao, parentesco, telefone, whatsapp, principal')
      .eq('crianca_id', id)
      .order('criado_em'),
    supabase.from('documentos').select('tipo').eq('crianca_id', id),
  ])
  if (crianca.error || !crianca.data) throw new Error('Não foi possível abrir a ficha.')
  if (responsaveis.error || !responsaveis.data) {
    throw new Error('Não foi possível ler os responsáveis desta ficha.')
  }
  if (documentos.error || !documentos.data) {
    throw new Error('Não foi possível ler os documentos desta ficha.')
  }
  const c = crianca.data
  const tipos = new Set(documentos.data.map((d) => d.tipo))
  rascunhoFicha.definir({
    ...FICHA_VAZIA,
    id: c.id,
    nome: c.nome,
    nascimento: paraBR(c.nascimento),
    unidadeId: c.unidade_id,
    fotoPath: c.foto_path ?? undefined,
    funcao: c.posicao ? POSICAO_TELA[c.posicao] : null,
    observacao: c.observacao ?? '',
    contatos: responsaveis.data.map((r) => ({
      nome: r.nome,
      parentesco: r.parentesco ?? RELACAO_TELA[r.relacao] ?? '',
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

  // Daqui para baixo a crianca ja esta no banco (e o id no rascunho): se
  // um passo falha, para ali, o rascunho fica e "Salvar" de novo refaz
  // tudo. Nada e apagado antes do substituto estar gravado.
  const falhou = (parte: string) =>
    new Error(`A ficha foi salva, mas ${parte} não. Toque em salvar de novo.`)

  // foto: so sobe se a pessoa escolheu uma nova agora
  if (f.fotoUri) {
    const caminho = `criancas/${id}/foto.jpg`
    try {
      await enviarArquivo(caminho, f.fotoUri, 'image/jpeg')
    } catch {
      throw falhou('a foto')
    }
    const { error } = await supabase.from('criancas').update({ foto_path: caminho }).eq('id', id)
    if (error) throw falhou('a foto')
  } else if (!f.fotoPath) {
    const { error } = await supabase.from('criancas').update({ foto_path: null }).eq('id', id)
    if (error) throw falhou('a retirada da foto')
  }

  // responsaveis: a lista da tela e a verdade. Grava os novos primeiro,
  // depois apaga os antigos e so entao marca o principal (o indice unico
  // nao deixa dois principais convivendo).
  const antigos = await supabase.from('responsaveis').select('id').eq('crianca_id', id)
  if (antigos.error || !antigos.data) throw falhou('os responsáveis')
  const idsAntigos = antigos.data.map((r) => r.id as string)
  const preenchidos = f.contatos.filter((c) => c.nome.trim() && c.telefone.trim())
  const contatos = preenchidos.map((c) => ({
    crianca_id: id,
    nome: c.nome.trim(),
    relacao: relacaoDo(c.parentesco),
    parentesco: c.parentesco.trim() || null,
    telefone: c.telefone.trim(),
    whatsapp: c.whatsapp,
    principal: false,
  }))
  // um principal so: se nenhum foi marcado, o primeiro vira o principal
  const indicePrincipal = Math.max(
    0,
    preenchidos.findIndex((c) => c.principal),
  )
  let idsNovos: string[] = []
  let idPrincipal: string | null = null
  if (contatos.length) {
    const { data, error } = await supabase
      .from('responsaveis')
      .insert(contatos)
      .select('id, nome, relacao, telefone')
    if (error || !data || data.length !== contatos.length) throw falhou('os responsáveis')
    idsNovos = data.map((r) => r.id as string)
    const p = contatos[indicePrincipal]
    idPrincipal =
      (data.find((r) => r.nome === p.nome && r.relacao === p.relacao && r.telefone === p.telefone)
        ?.id as string | undefined) ?? null
  }
  if (idsAntigos.length) {
    const { error } = await supabase.from('responsaveis').delete().in('id', idsAntigos)
    if (error) {
      // desfaz os novos, para nao ficar a lista em dobro
      if (idsNovos.length) await supabase.from('responsaveis').delete().in('id', idsNovos)
      throw falhou('os responsáveis')
    }
  }
  if (idPrincipal) {
    const { error } = await supabase
      .from('responsaveis')
      .update({ principal: true })
      .eq('id', idPrincipal)
    if (error) throw falhou('o responsável principal')
  } else if (contatos.length) {
    throw falhou('o responsável principal')
  }

  // documentos: grava os entregues (e os arquivos) primeiro; so depois
  // apaga os que deixaram de estar marcados
  const entregues = new Set(f.documentos)
  for (const [i, d] of DOCUMENTOS.entries()) {
    if (!entregues.has(i)) continue
    const anexo = f.anexos[i]
    let arquivo_path: string | undefined
    if (anexo?.uri) {
      arquivo_path = `criancas/${id}/documentos/${d.tipo}.${extensao(anexo)}`
      try {
        await enviarArquivo(arquivo_path, anexo.uri, anexo.tipo)
      } catch {
        throw falhou(`o arquivo de "${d.nome}"`)
      }
    }
    const { error } = await supabase.from('documentos').upsert(
      {
        crianca_id: id,
        tipo: d.tipo,
        entregue_em: hojeISO(),
        ...(arquivo_path ? { arquivo_path } : {}),
      },
      { onConflict: 'crianca_id,tipo', ignoreDuplicates: !arquivo_path },
    )
    if (error) throw falhou(`o documento "${d.nome}"`)
  }
  const retirados = DOCUMENTOS.filter((_, i) => !entregues.has(i)).map((d) => d.tipo)
  if (retirados.length) {
    const { error } = await supabase
      .from('documentos')
      .delete()
      .eq('crianca_id', id)
      .in('tipo', retirados)
    if (error) throw falhou('a lista de documentos')
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
 * Exclui a ficha de vez: a crianca, responsaveis, documentos, presencas,
 * emprestimos e convocacoes (o banco apaga junto), e os arquivos dela no
 * Storage. So quem administra a Secretaria (ADM ou Secretaria com
 * "Coordenar setor") — o banco recusa os outros.
 */
export async function excluirFicha(id: string) {
  const { count, error } = await supabase.from('criancas').delete({ count: 'exact' }).eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'Falta rodar o SQL de exclusão no Supabase.'
        : 'Não foi possível excluir a ficha.',
    )
  }
  // o banco nao apagou nada: quem pediu nao administra a Secretaria
  if (!count) throw new Error('Só a coordenação da Secretaria pode excluir.')

  // a crianca saiu do banco: sai tambem da lista guardada para a chamada
  // sem internet, senao ela voltaria na proxima chamada sem sinal
  await esquecerNoCelular('criancas', id)

  // A linha ja foi: arquivo que nao sai agora nao desfaz a exclusao (fica
  // orfao no bucket privado, sem ninguem que aponte para ele).
  try {
    const pasta = `criancas/${id}`
    const [raiz, docs] = await Promise.all([
      supabase.storage.from('fichas').list(pasta),
      supabase.storage.from('fichas').list(`${pasta}/documentos`),
    ])
    const arquivos = [
      ...(raiz.data ?? []).filter((f) => f.id).map((f) => `${pasta}/${f.name}`),
      ...(docs.data ?? []).filter((f) => f.id).map((f) => `${pasta}/documentos/${f.name}`),
    ]
    if (arquivos.length) await supabase.storage.from('fichas').remove(arquivos)
  } catch {
    // sem rede no meio: a ficha ja saiu, os arquivos ficam sem dono
  }
}

/** Quem pode mexer na ficha e a Secretaria e o ADM (RLS `ve_dados_sensiveis`). */
const SO_SECRETARIA = 'Só a Secretaria e a coordenação podem mudar a ficha.'

/**
 * A crianca saiu da ADAM: a ficha fica inativa (some da chamada, da
 * convocacao e do emprestimo), com a data e o motivo. Presencas e
 * emprestimos continuam contando no periodo em que ela estava. ADM e
 * Secretaria fazem; excluir de vez e so de quem administra a Secretaria.
 */
export async function marcarSaida(id: string, saiuEm: string, motivo: string) {
  const { count, error } = await supabase
    .from('criancas')
    .update(
      { ativa: false, saiu_em: saiuEm, motivo_saida: motivo.trim() || null },
      { count: 'exact' },
    )
    .eq('id', id)
  if (error) {
    throw new Error(
      error.code === '42703' || error.code === 'PGRST204'
        ? 'Falta rodar o SQL de backup e saídas no Supabase.'
        : 'Não foi possível registrar a saída.',
    )
  }
  // RLS que recusa um update nao da erro: so nao muda nenhuma linha
  if (!count) throw new Error(SO_SECRETARIA)
  // inativa nao entra mais na chamada, nem na guardada para quando cair o sinal
  await esquecerNoCelular('criancas', id)
}

/** O motivo que fica quando a ficha e desativada sem ninguem escrever um. */
export const MOTIVO_DESATIVADA = 'Desativada no cadastro'

/**
 * "Desativar crianca" do cadastro: e a mesma saida, com a data de hoje. Ela
 * deixa as listas, a chamada e as contagens de ativas a partir de hoje; o
 * historico fica e reativar desfaz.
 */
export function desativarFicha(id: string, motivo: string) {
  return marcarSaida(id, hojeISO(), motivo.trim() || MOTIVO_DESATIVADA)
}

/** Voltou para a ADAM: a ficha volta a valer, sem a data de saida. */
export async function reativarFicha(id: string) {
  const { count, error } = await supabase
    .from('criancas')
    .update({ ativa: true, saiu_em: null, motivo_saida: null }, { count: 'exact' })
    .eq('id', id)
  if (error) throw new Error('Não foi possível reativar a ficha.')
  if (!count) throw new Error(SO_SECRETARIA)
}

export type SituacaoFicha = { ativa: boolean; saiuEm: string | null; motivo: string | null }

/**
 * Ativa ou nao, para o "Desativar / Reativar" do cadastro. `*` pelo mesmo
 * motivo de `lerParticipantes`: saiu_em so existe depois do SQL das saidas.
 */
export function useSituacaoFicha(id: string | null | undefined) {
  const [estado, setEstado] = useState<{ id: string; situacao: SituacaoFicha | null } | null>(null)

  const buscar = useCallback(
    () =>
      id
        ? supabase
            .from('criancas')
            .select('*')
            .eq('id', id)
            .maybeSingle()
            .then(({ data, error }) => ({
              id,
              situacao:
                error || !data
                  ? null
                  : {
                      ativa: !!data.ativa,
                      saiuEm: (data.saiu_em as string | null | undefined) ?? null,
                      motivo: (data.motivo_saida as string | null | undefined) ?? null,
                    },
            }))
        : Promise.resolve(null),
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

  const valeAgora = !!id && estado?.id === id
  return {
    situacao: valeAgora ? estado.situacao : null,
    carregando: !!id && !valeAgora,
    recarregar,
  }
}
