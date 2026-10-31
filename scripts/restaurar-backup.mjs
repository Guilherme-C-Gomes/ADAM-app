/**
 * ADAM · restaura uma copia de seguranca num projeto Supabase.
 *
 * Serve para dois casos: o projeto do ADAM se perdeu (restaura num projeto
 * novo), ou para TESTAR que a copia funciona (restaura num projeto de teste,
 * nunca no de verdade).
 *
 * Passo a passo (no computador, com o projeto ADAM-app aberto):
 *
 * 1. No projeto Supabase de DESTINO, rode no SQL Editor todos os arquivos de
 *    supabase/migrations, na ordem do nome. O destino fica com as tabelas,
 *    as regras de acesso e os lugares das fotos — vazio.
 * 2. Baixe do Drive o .json da copia (pasta banco/) e, se quiser as fotos e
 *    os documentos, a pasta arquivos/ inteira.
 * 3. No PowerShell, nesta pasta do projeto:
 *
 *      $env:SUPABASE_URL = "https://<projeto-de-destino>.supabase.co"
 *      $env:SUPABASE_SECRET_KEY = "sb_secret_..."   (do projeto de DESTINO)
 *      $env:SENHA_INICIAL = "uma senha provisoria"
 *      node scripts/restaurar-backup.mjs C:\caminho\adam-banco-....json C:\caminho\arquivos
 *
 *    (a pasta de arquivos e opcional)
 *
 * As contas voltam com o mesmo e-mail, a mesma funcao e o mesmo id (o que
 * cada um marcou continua sendo dele), mas com a SENHA_INICIAL: senha nao
 * sai em copia nenhuma. Cada pessoa troca a sua em Minha conta; o ADM pode
 * redefinir a de quem pedir.
 *
 * Rodar duas vezes nao duplica nada: tudo e gravado por cima, pela chave.
 *
 * SO CONFERIR (nao grava nada, nao precisa de chave):
 *
 *      node scripts/restaurar-backup.mjs --conferir C:\caminho\adam-banco-....json
 *
 * Diz se a copia esta inteira: todas as tabelas, chaves sem repeticao, as
 * ligacoes entre as tabelas (marca sem chamada, responsavel sem crianca...)
 * e as contas da equipe. Bom para fazer de vez em quando com a copia do Drive.
 */
import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const argumentos = process.argv.slice(2)
const soConferir = argumentos[0] === '--conferir'
const [arquivoCopia, pastaArquivos] = soConferir ? argumentos.slice(1) : argumentos
const { SUPABASE_URL, SUPABASE_SECRET_KEY, SENHA_INICIAL } = process.env

/** As tabelas que toda copia precisa ter (mesma lista de api/backup.ts). */
const TABELAS = [
  'unidades', 'usuarios', 'criancas', 'responsaveis', 'documentos', 'livro_tipos', 'livros',
  'emprestimos', 'aulas', 'exercicios', 'treinos', 'treino_comissao', 'treino_exercicios',
  'treino_avaliacoes', 'escala', 'jogos', 'jogo_convocados', 'jogo_comissao', 'chamadas',
  'chamada_participantes', 'chamada_marcas', 'chamada_avulsos', 'chamada_correcoes',
  'inscricoes', 'fichas_matricula',
]
/** Tabelas novas: copia feita antes delas existirem nao tem, e tudo bem. */
const NOVAS = new Set(['inscricoes', 'fichas_matricula'])

/** coluna -> tabela para onde ela aponta (para achar ligacoes quebradas). */
function alvoDa(coluna) {
  const diretas = {
    unidade_id: 'unidades', crianca_id: 'criancas', chamada_id: 'chamadas',
    treino_id: 'treinos', jogo_id: 'jogos', livro_id: 'livros', exercicio_id: 'exercicios',
    usuario_id: 'usuarios', professor_id: 'usuarios', responsavel_id: 'usuarios',
  }
  if (diretas[coluna]) return diretas[coluna]
  if (/_por$/.test(coluna)) return 'usuarios'
  return null
}

function conferir(copia) {
  const problemas = []
  const avisos = []
  if (copia.sistema !== 'ADAM') problemas.push('o arquivo não é uma cópia do ADAM')
  const ausentes = new Set(copia.tabelas_ausentes ?? [])
  console.log(`Cópia de ${copia.feito_em} (${copia.origem ?? '?'})\n`)

  for (const nome of TABELAS) {
    const linhas = copia.tabelas?.[nome]
    if (!Array.isArray(linhas)) {
      if (ausentes.has(nome) || NOVAS.has(nome)) {
        avisos.push(`${nome}: a tabela não existia no banco na hora da cópia`)
      }
      else problemas.push(`${nome}: falta na cópia`)
      continue
    }
    const chave = copia.chaves?.[nome] ?? ['id']
    const vistas = new Set()
    let repetidas = 0
    for (const l of linhas) {
      const k = chave.map((c) => l[c]).join('|')
      if (vistas.has(k)) repetidas++
      vistas.add(k)
    }
    if (repetidas) problemas.push(`${nome}: ${repetidas} linhas com a chave repetida`)
    console.log(`  ${nome.padEnd(24)} ${String(linhas.length).padStart(6)}`)
  }

  // ligacoes: cada *_id precisa existir na tabela para onde aponta
  const ids = {}
  for (const nome of TABELAS) {
    ids[nome] = new Set((copia.tabelas?.[nome] ?? []).map((l) => l.id).filter(Boolean))
  }
  for (const nome of TABELAS) {
    for (const l of copia.tabelas?.[nome] ?? []) {
      for (const [coluna, valor] of Object.entries(l)) {
        const alvo = alvoDa(coluna)
        if (!alvo || valor == null || !ids[alvo]) continue
        if (!ids[alvo].has(valor)) {
          problemas.push(`${nome}.${coluna} aponta para um registro que não está em ${alvo}`)
        }
      }
    }
  }

  const contas = copia.contas ?? []
  const semConta = (copia.tabelas?.usuarios ?? []).filter((u) => !contas.some((c) => c.id === u.id))
  console.log(`  ${'contas (login)'.padEnd(24)} ${String(contas.length).padStart(6)}`)
  if (semConta.length) problemas.push(`${semConta.length} pessoas da equipe sem conta de login na cópia`)

  for (const a of avisos) console.log(`\n⚠ ${a}`)
  const unicos = [...new Set(problemas)]
  if (unicos.length) {
    console.error(`\n✖ A cópia tem ${unicos.length} problema(s):`)
    for (const p of unicos.slice(0, 30)) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log('\n✔ Cópia inteira: todas as tabelas, sem chave repetida e sem ligação quebrada.')
}

function parar(mensagem) {
  console.error(`\n✖ ${mensagem}\n`)
  process.exit(1)
}

if (!arquivoCopia) parar('Diga qual .json restaurar: node scripts/restaurar-backup.mjs <copia.json> [pasta-arquivos]')
if (soConferir) {
  conferir(JSON.parse(readFileSync(arquivoCopia, 'utf8')))
  process.exit(0)
}
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) parar('Defina SUPABASE_URL e SUPABASE_SECRET_KEY do projeto de DESTINO.')
if (!SENHA_INICIAL || SENHA_INICIAL.length < 8) parar('Defina SENHA_INICIAL (8 caracteres ou mais) para as contas.')
if (SUPABASE_URL.includes('jmaztlceuandkyraazty')) {
  console.warn('⚠ O destino é o projeto de VERDADE do ADAM. Só faça isso se ele estiver vazio ou perdido.')
}

const copia = JSON.parse(readFileSync(arquivoCopia, 'utf8'))
if (copia.sistema !== 'ADAM' || !copia.tabelas) parar('Esse arquivo não é uma cópia do ADAM.')

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log(`Cópia de ${copia.feito_em} (${copia.origem}) → ${SUPABASE_URL}\n`)

// 1. contas: mesmo id e e-mail, senha provisoria
let contas = 0
for (const c of copia.contas ?? []) {
  const { error } = await admin.auth.admin.createUser({
    id: c.id,
    email: c.email,
    password: SENHA_INICIAL,
    email_confirm: true,
    user_metadata: c.user_metadata ?? {},
  })
  if (error && !/already|exists|registered/i.test(error.message)) {
    parar(`Conta ${c.email}: ${error.message}`)
  }
  contas++
}
console.log(`✔ ${contas} contas`)

// 2. tabelas, na ordem (quem e referenciado vem antes), por cima pela chave
const LOTE = 500
for (const nome of copia.ordem) {
  const linhas = copia.tabelas[nome] ?? []
  const chave = (copia.chaves?.[nome] ?? ['id']).join(',')
  for (let i = 0; i < linhas.length; i += LOTE) {
    const { error } = await admin
      .from(nome)
      .upsert(linhas.slice(i, i + LOTE), { onConflict: chave })
    if (error) parar(`${nome}: ${error.message}`)
  }
  console.log(`✔ ${nome}: ${linhas.length}`)
}

// 3. fotos e documentos (opcional): "fichas__criancas__<id>__foto.jpg"
//    volta para o bucket "fichas", caminho "criancas/<id>/foto.jpg"
if (pastaArquivos) {
  let enviados = 0
  for (const nome of readdirSync(pastaArquivos)) {
    const caminhoLocal = join(pastaArquivos, nome)
    if (!statSync(caminhoLocal).isFile()) continue
    const [bucket, ...partes] = nome.split('__')
    if (!partes.length) continue
    const { error } = await admin.storage
      .from(bucket)
      .upload(partes.join('/'), readFileSync(caminhoLocal), { upsert: true })
    if (error) parar(`${nome}: ${error.message}`)
    enviados++
  }
  console.log(`✔ ${enviados} fotos e documentos`)
}

console.log('\nPronto. Entre com o e-mail de sempre e a SENHA_INICIAL, e troque a senha em Minha conta.')
