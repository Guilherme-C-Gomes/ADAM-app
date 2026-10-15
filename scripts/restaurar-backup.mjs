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
 */
import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const [arquivoCopia, pastaArquivos] = process.argv.slice(2)
const { SUPABASE_URL, SUPABASE_SECRET_KEY, SENHA_INICIAL } = process.env

function parar(mensagem) {
  console.error(`\n✖ ${mensagem}\n`)
  process.exit(1)
}

if (!arquivoCopia) parar('Diga qual .json restaurar: node scripts/restaurar-backup.mjs <copia.json> [pasta-arquivos]')
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) parar('Defina SUPABASE_URL e SUPABASE_SECRET_KEY do projeto de DESTINO.')
if (!SENHA_INICIAL || SENHA_INICIAL.length < 8) parar('Defina SENHA_INICIAL (8 caracteres ou mais) para as contas.')
if (SUPABASE_URL.includes('xzpdrqtbyzcczfwxbnjq')) {
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
