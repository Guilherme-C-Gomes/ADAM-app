/// <reference types="node" />
/**
 * ADAM · copia de seguranca (e o "despertador" do Supabase).
 *
 * Roda 3 vezes por dia, agendada na Vercel (vercel.json > crons), e quando a
 * conta de suporte (suporte.ti) toca em "Fazer copia agora" no app. Cada vez:
 *
 * 0. o despertador: uma consulta pequena com a chave publica, antes de tudo
 *    e sem depender das outras variaveis — mesmo com a copia por configurar
 *    ou o Drive fora do ar, o Supabase gratuito ve uso e nao pausa (ele pausa
 *    depois de uns dias parado, como aconteceu em 13/10/2026);
 * 1. le TODAS as tabelas do banco, pagina por pagina;
 * 2. manda a copia completa (um .json) para a pasta do Google Drive da ADAM,
 *    pelo Apps Script em backup/apps-script.gs;
 * 3. manda as fotos e documentos que ainda nao estao no Drive (aos poucos,
 *    para caber no tempo; o que sobrar vai na proxima vez);
 * 4. anota o resultado na tabela `backups`, que o app mostra ao ADM.
 *
 * Variaveis na Vercel (Settings > Environment Variables), nunca no codigo:
 * - SUPABASE_URL           endereco do projeto do ADAM
 * - SUPABASE_PUBLISHABLE_KEY  a chave publica do app (sb_publishable_...): so
 *                          o despertador usa
 * - SUPABASE_SECRET_KEY    chave secreta (sb_secret_...): le tudo, passa o RLS
 * - CRON_SECRET            senha longa; a Vercel manda no agendamento, e o
 *                          Apps Script confere a mesma
 * - BACKUP_DRIVE_URL       o endereco do Apps Script publicado
 */
import { createClient } from '@supabase/supabase-js'

/** Ordem de restaurar: quem e referenciado vem antes. */
const TABELAS: { nome: string; chave: string[] }[] = [
  { nome: 'unidades', chave: ['id'] },
  { nome: 'usuarios', chave: ['id'] },
  { nome: 'criancas', chave: ['id'] },
  { nome: 'responsaveis', chave: ['id'] },
  { nome: 'documentos', chave: ['id'] },
  { nome: 'livro_tipos', chave: ['nome'] },
  { nome: 'livros', chave: ['id'] },
  { nome: 'emprestimos', chave: ['id'] },
  { nome: 'aulas', chave: ['id'] },
  { nome: 'exercicios', chave: ['id'] },
  { nome: 'treinos', chave: ['id'] },
  { nome: 'treino_comissao', chave: ['treino_id', 'usuario_id'] },
  { nome: 'treino_exercicios', chave: ['treino_id', 'exercicio_id'] },
  { nome: 'treino_avaliacoes', chave: ['treino_id'] },
  { nome: 'escala', chave: ['id'] },
  { nome: 'jogos', chave: ['id'] },
  { nome: 'jogo_convocados', chave: ['jogo_id', 'crianca_id'] },
  { nome: 'jogo_comissao', chave: ['jogo_id', 'usuario_id'] },
  { nome: 'chamadas', chave: ['id'] },
  { nome: 'chamada_participantes', chave: ['chamada_id', 'usuario_id'] },
  { nome: 'chamada_marcas', chave: ['chamada_id', 'crianca_id'] },
  { nome: 'chamada_avulsos', chave: ['id'] },
  { nome: 'chamada_correcoes', chave: ['id'] },
]

const BUCKETS = ['fichas', 'capas', 'materiais', 'perfis']
const PAGINA = 1000
// por vez, para caber no tempo da funcao; o resto vai na proxima copia
const MAX_ARQUIVOS = 40
const MAX_BYTES = 20 * 1024 * 1024

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const urlDoBanco = () => process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL

/** Uma leitura pequena: conta como uso para o Supabase. true se ele respondeu. */
async function despertar() {
  const url = urlDoBanco()
  const chave = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !chave) return false
  try {
    const resposta = await fetch(`${url}/rest/v1/unidades?select=id&limit=1`, {
      headers: { apikey: chave },
      signal: AbortSignal.timeout(15000),
    })
    return resposta.ok
  } catch {
    return false
  }
}

function cliente() {
  const url = urlDoBanco()
  const chave = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!url || !chave) throw new Error('Falta SUPABASE_URL ou SUPABASE_SECRET_KEY na Vercel.')
  // a publicavel no lugar da secreta passa no login mas o RLS esconde o
  // perfil — o ADM leva um "so a coordenacao" sem saber por que
  if (chave.startsWith('sb_publishable_'))
    throw new Error(
      'A SUPABASE_SECRET_KEY na Vercel está com a chave pública (sb_publishable_). Troque pela secreta (sb_secret_).',
    )
  if (!chave.startsWith('sb_secret_') && !chave.startsWith('eyJ'))
    throw new Error(
      'A SUPABASE_SECRET_KEY na Vercel não é uma chave secreta (precisa começar com sb_secret_).',
    )
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
}
type Admin = ReturnType<typeof cliente>

const NEGADO = 'Só o agendamento ou a conta de suporte (suporte.ti).'

/** So esta conta pede copia pelo app (src/data/backup.ts tem a mesma). */
const RESPONSAVEL_BACKUP = 'suporte.ti@adam.ong.br'

/**
 * Agendamento da Vercel (senha do cron) ou a conta de suporte logada (token da sessao).
 * Quando recusa um login, diz por que — e o erro de configuracao aparece
 * como tal, nao como "voce nao e ADM".
 */
async function quemPede(
  request: Request,
  admin: Admin,
): Promise<{ origem: 'agendado' | 'manual' } | { erro: string }> {
  const auth = request.headers.get('authorization') ?? ''
  const segredo = process.env.CRON_SECRET
  if (segredo && auth === `Bearer ${segredo}`) return { origem: 'agendado' }
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return { erro: NEGADO }
  const { data, error } = await admin.auth.getUser(token)
  if (!data.user) {
    if (error && /api ?key/i.test(error.message))
      return { erro: 'A SUPABASE_SECRET_KEY na Vercel não vale para este projeto do Supabase.' }
    return { erro: 'Sua sessão não foi reconhecida. Saia e entre de novo no app.' }
  }
  const { data: perfil, error: erroPerfil } = await admin
    .from('usuarios')
    .select('permissao, ativo')
    .eq('id', data.user.id)
    .maybeSingle()
  // com a chave secreta o perfil sempre aparece (ela passa pelo RLS); sem
  // perfil, a chave cadastrada nao e a secreta deste projeto
  if (erroPerfil || !perfil)
    return {
      erro: 'A SUPABASE_SECRET_KEY na Vercel não lê o banco: confira se é a chave secreta (sb_secret_) deste projeto.',
    }
  const eOSuporte = (data.user.email ?? '').toLowerCase() === RESPONSAVEL_BACKUP
  return eOSuporte && perfil.ativo && perfil.permissao === 'acesso_total'
    ? { origem: 'manual' }
    : { erro: NEGADO }
}

const tabelaAusente = (e: unknown) => {
  const codigo = (e as { code?: string } | null)?.code
  return codigo === '42P01' || codigo === 'PGRST205'
}

async function lerTabela(admin: Admin, nome: string, chave: string[]) {
  const linhas: Record<string, unknown>[] = []
  for (let de = 0; ; de += PAGINA) {
    let q = admin.from(nome).select('*')
    for (const c of chave) q = q.order(c)
    const { data, error } = await q.range(de, de + PAGINA - 1)
    if (error) throw error
    linhas.push(...(data ?? []))
    if (!data || data.length < PAGINA) return linhas
  }
}

async function lerContas(admin: Admin) {
  const contas: Record<string, unknown>[] = []
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error) throw error
    for (const u of data.users) {
      contas.push({
        id: u.id,
        email: u.email,
        criado_em: u.created_at,
        ultimo_acesso: u.last_sign_in_at,
        user_metadata: u.user_metadata,
      })
    }
    if (data.users.length < 1000) return contas
  }
}

type Arquivo = { bucket: string; caminho: string; tamanho: number; mime: string }

async function listarArquivos(admin: Admin, bucket: string, pasta = ''): Promise<Arquivo[]> {
  const achados: Arquivo[] = []
  for (let offset = 0; ; offset += PAGINA) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(pasta, { limit: PAGINA, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    for (const item of data ?? []) {
      const caminho = pasta ? `${pasta}/${item.name}` : item.name
      // sem id = pasta: entra nela
      if (item.id === null) achados.push(...(await listarArquivos(admin, bucket, caminho)))
      else
        achados.push({
          bucket,
          caminho,
          tamanho: Number(item.metadata?.size ?? 0),
          mime: String(item.metadata?.mimetype ?? 'application/octet-stream'),
        })
    }
    if (!data || data.length < PAGINA) return achados
  }
}

/** O nome no Drive guarda o caminho inteiro: fichas__criancas__<id>__foto.jpg */
const nomeNoDrive = (a: Pick<Arquivo, 'bucket' | 'caminho'>) =>
  `${a.bucket}__${a.caminho.replace(/\//g, '__')}`

/**
 * O endereco do Apps Script. Aceita o URL inteiro (.../exec) ou so o ID da
 * implantacao (AKfy...), que o Apps Script mostra logo acima do URL e e
 * facil de copiar no lugar dele.
 */
function enderecoDoDrive() {
  const valor = process.env.BACKUP_DRIVE_URL?.trim()
  if (!valor) throw new Error('Falta BACKUP_DRIVE_URL na Vercel (o endereço do Apps Script).')
  return /^https?:\/\//i.test(valor) ? valor : `https://script.google.com/macros/s/${valor}/exec`
}

async function drive(acao: string, dados: Record<string, unknown> = {}) {
  const resposta = await fetch(enderecoDoDrive(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: process.env.CRON_SECRET, acao, ...dados }),
    redirect: 'follow',
  })
  const texto = await resposta.text()
  let corpo: { ok?: boolean; erro?: string; [k: string]: unknown }
  try {
    corpo = JSON.parse(texto)
  } catch {
    throw new Error('O Apps Script não respondeu. Confira se ele foi publicado como app da Web.')
  }
  if (!corpo.ok) {
    throw new Error(
      corpo.erro === 'senha'
        ? 'A senha do Apps Script não bate com o CRON_SECRET da Vercel.'
        : `Drive: ${corpo.erro ?? 'erro desconhecido'}`,
    )
  }
  return corpo
}

/** "2026-10-15_09h05", no horario de Brasilia. */
function carimbo() {
  const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  return agora.slice(0, 16).replace(' ', '_').replace(':', 'h')
}

async function copiar(request: Request) {
  // 0. o despertador vem antes de qualquer conferencia
  const acordou = await despertar()

  let admin: Admin
  try {
    admin = cliente()
  } catch (e) {
    return json({ ok: false, acordou, erro: (e as Error).message }, 500)
  }

  const pedido = await quemPede(request, admin)
  if ('erro' in pedido) return json({ ok: false, acordou, erro: pedido.erro }, 401)
  const { origem } = pedido

  const registro = {
    origem,
    ok: false,
    tabelas: 0,
    linhas: 0,
    arquivos_novos: 0,
    arquivos_pendentes: 0,
    arquivo: null as string | null,
    erro: null as string | null,
  }

  try {
    // 1. o banco inteiro (e o "despertador")
    const dados: Record<string, Record<string, unknown>[]> = {}
    const ausentes: string[] = []
    for (const t of TABELAS) {
      try {
        dados[t.nome] = await lerTabela(admin, t.nome, t.chave)
      } catch (e) {
        if (!tabelaAusente(e)) throw e
        ausentes.push(t.nome)
      }
    }
    const contas = await lerContas(admin)
    registro.tabelas = Object.keys(dados).length
    registro.linhas = Object.values(dados).reduce((soma, l) => soma + l.length, 0)

    // 2. a copia do banco no Drive
    registro.arquivo = `adam-banco-${carimbo()}.json`
    await drive('salvar-banco', {
      nome: registro.arquivo,
      conteudo: JSON.stringify({
        sistema: 'ADAM',
        versao: 1,
        feito_em: new Date().toISOString(),
        origem,
        tabelas_ausentes: ausentes,
        ordem: TABELAS.map((t) => t.nome),
        chaves: Object.fromEntries(TABELAS.map((t) => [t.nome, t.chave])),
        contas,
        tabelas: dados,
      }),
    })

    // 3. fotos e documentos que ainda nao estao no Drive
    const noDrive = new Set(((await drive('listar-arquivos')).nomes as string[]) ?? [])
    const todos: Arquivo[] = []
    for (const b of BUCKETS) {
      try {
        todos.push(...(await listarArquivos(admin, b)))
      } catch {
        // bucket que ainda nao existe (SQL que nao rodou): segue
      }
    }
    const faltam = todos.filter((a) => !noDrive.has(nomeNoDrive(a)))
    let bytes = 0
    for (const a of faltam) {
      if (registro.arquivos_novos >= MAX_ARQUIVOS) break
      if (registro.arquivos_novos > 0 && bytes + a.tamanho > MAX_BYTES) break
      const { data, error } = await admin.storage.from(a.bucket).download(a.caminho)
      if (error || !data) continue
      const base64 = Buffer.from(await data.arrayBuffer()).toString('base64')
      await drive('salvar-arquivo', { nome: nomeNoDrive(a), mime: a.mime, base64 })
      registro.arquivos_novos++
      bytes += a.tamanho
    }
    registro.arquivos_pendentes = faltam.length - registro.arquivos_novos
    registro.ok = true
  } catch (e) {
    registro.erro = (e as Error).message ?? String(e)
  }

  // 4. o resultado fica anotado (se a tabela ja existir)
  await admin
    .from('backups')
    .insert(registro)
    .then(
      () => undefined,
      () => undefined,
    )

  return json({ ...registro, acordou }, registro.ok ? 200 : 500)
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export function GET(request: Request) {
  return copiar(request)
}

export function POST(request: Request) {
  return copiar(request)
}
