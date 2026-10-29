/// <reference types="node" />
/**
 * O que as funcoes do formulario de inscricao dividem: o Supabase com a
 * chave secreta, o "ip com sal" e as respostas.
 *
 * As funcoes (api/inscricao/*) rodam neste projeto, o `adam`, que ja tem as
 * variaveis do backup. O site do formulario (pasta inscricao/, projeto
 * adam-inscricao) so tem a pagina e repassa /api/* para ca (inscricao/
 * vercel.json): assim a chave secreta mora num lugar so.
 * - SUPABASE_URL         endereco do projeto do ADAM
 * - SUPABASE_SECRET_KEY  chave secreta (sb_secret_...): grava a inscricao,
 *                        passa o RLS. So o servidor a ve; o navegador nunca.
 *
 * Esta pasta comeca com "_": a Vercel nao a publica como funcao.
 */
import { createHash } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

export const BUCKET = 'inscricoes'

/** Os arquivos que o formulario aceita, e o tamanho maximo de cada um. */
export const CAMPOS_DE_ARQUIVO = {
  foto: 'Foto da criança',
  rg_certidao: 'RG ou certidão de nascimento',
  comprovante_residencia: 'Comprovante de residência',
  atestado_medico: 'Atestado médico',
  matricula_escolar: 'Atestado de matrícula escolar',
  ficha_govbr: 'Ficha assinada no gov.br',
} as const
export type CampoDeArquivo = keyof typeof CAMPOS_DE_ARQUIVO
export const TIPOS_ACEITOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}
export const TAMANHO_MAXIMO = 10 * 1024 * 1024

export function admin() {
  const url = process.env.SUPABASE_URL
  const chave = process.env.SUPABASE_SECRET_KEY
  if (!url || !chave) throw new Error('configuracao')
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** O ip de quem envia, com sal: limita tentativas sem guardar o ip. */
export function ipComSal(request: Request) {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'sem-ip'
  return createHash('sha256')
    .update(`${process.env.SUPABASE_SECRET_KEY ?? ''}|${ip}`)
    .digest('hex')
    .slice(0, 32)
}

export const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

/** Erro para a mae ler; o detalhe tecnico fica so no log da Vercel. */
export function falha(mensagem: string, status = 400, detalhe?: unknown) {
  if (detalhe) console.error(mensagem, detalhe)
  return resposta({ erro: mensagem }, status)
}

export async function lerJson(request: Request, limite = 1_000_000): Promise<unknown> {
  const texto = await request.text()
  if (texto.length > limite) throw new Error('grande')
  return JSON.parse(texto)
}

/**
 * Por enquanto toda inscricao pelo link e para Atibaia: a mae nao escolhe
 * unidade. A unidade de nome "Atibaia" (ou, sem ela, a primeira cadastrada).
 */
export async function unidadeDaInscricao() {
  const { data, error } = await admin().from('unidades').select('id, nome').order('nome')
  if (error) throw error
  const lista = (data ?? []) as { id: string; nome: string }[]
  return lista.find((u) => /atibaia/i.test(u.nome)) ?? lista[0] ?? null
}

/** Poe a unidade na ficha que veio do navegador, antes de conferir. */
export function comUnidade(ficha: unknown, unidadeId: string) {
  const f = (ficha && typeof ficha === 'object' ? ficha : {}) as Record<string, unknown>
  const crianca = (f.crianca && typeof f.crianca === 'object' ? f.crianca : {}) as Record<
    string,
    unknown
  >
  return { ...f, crianca: { ...crianca, unidadeId } }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
