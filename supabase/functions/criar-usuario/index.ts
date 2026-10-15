// ADAM · contas da equipe: criar, excluir e redefinir senha (so a
// coordenacao) e a propria pessoa trocar nome e e-mail (Minha conta).
//
// Por que existe: criar conta de OUTRA pessoa exige a chave secreta do
// Supabase, e ela nunca pode ir dentro do app. Esta funcao roda no servidor
// do Supabase, onde a chave ja esta, e so cria a conta depois de conferir
// que quem pediu e da coordenacao (acesso total) e esta ativo.
//
// Publicar: Supabase > Edge Functions > Deploy a new function > Via Editor,
// dar o nome "criar-usuario" ANTES de publicar, colar este arquivo e Deploy.
// O endereco publicado (slug) e o que src/data/usuarios.ts chama; se um dia
// publicar com outro slug, troque la tambem.
//
// Em Settings, "Verify JWT with legacy secret" fica DESLIGADO: este projeto
// assina os logins com a chave nova (ES256), que o legado recusaria. A
// conferencia de quem chama e feita aqui dentro (getUser + acesso total).
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const FUNCOES = ['treinador', 'professor', 'secretaria']
const PERMISSOES = ['ver_registrar', 'coordenar_setor', 'acesso_total']

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// A chave secreta: a nova (SUPABASE_SECRET_KEYS, um JSON com as chaves) ou a
// antiga (service_role), que o Supabase ainda entrega para compatibilidade.
function chaveSecreta() {
  const novas = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (novas) {
    try {
      const chaves = JSON.parse(novas) as Record<string, string>
      const chave = chaves.default ?? Object.values(chaves)[0]
      if (chave) return chave
    } catch {
      // cai para a antiga
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resposta(405, { erro: 'Use POST.' })

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveSecreta(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. Quem esta pedindo? Precisa ser uma conta ativa do ADAM.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: quem, error: erroQuem } = await admin.auth.getUser(token)
  if (erroQuem || !quem.user) return resposta(401, { erro: 'Sua sessão expirou. Entre de novo no app.' })
  const eu = quem.user.id

  const { data: perfil } = await admin
    .from('usuarios')
    .select('permissao, ativo')
    .eq('id', eu)
    .maybeSingle()
  if (!perfil?.ativo) return resposta(403, { erro: 'Seu acesso não está liberado.' })
  const eAdm = perfil.permissao === 'acesso_total'

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' })
  }
  const acao = String(corpo.acao ?? 'criar')

  // ── a propria pessoa: nome e e-mail (qualquer conta ativa) ─────────
  if (acao === 'meu-perfil') {
    const nome = corpo.nome === undefined ? undefined : String(corpo.nome).trim()
    const email = corpo.email === undefined ? undefined : String(corpo.email).trim().toLowerCase()
    if (nome !== undefined && nome.length < 2) return resposta(400, { erro: 'Escreva o seu nome.' })
    if (email !== undefined && !EMAIL_VALIDO.test(email)) {
      return resposta(400, { erro: 'E-mail inválido.' })
    }
    if (email !== undefined && email !== quem.user.email) {
      // sem e-mail de confirmacao: a pessoa ja esta logada, e o envio padrao
      // do Supabase so entrega para a equipe do projeto
      const { error } = await admin.auth.admin.updateUserById(eu, { email, email_confirm: true })
      if (error) {
        const existe = error.code === 'email_exists' || /already/i.test(error.message)
        return resposta(existe ? 409 : 400, {
          erro: existe ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível trocar o e-mail.',
        })
      }
    }
    const mudancas: Record<string, string> = {}
    if (nome !== undefined) mudancas.nome = nome
    if (email !== undefined) mudancas.email = email
    if (Object.keys(mudancas).length) {
      const { error } = await admin.from('usuarios').update(mudancas).eq('id', eu)
      if (error) return resposta(500, { erro: 'Não foi possível salvar. Tente de novo.' })
    }
    return resposta(200, { ok: true })
  }

  // daqui para baixo, so a coordenacao (acesso total)
  if (!eAdm) return resposta(403, { erro: 'Só a coordenação (acesso total) faz isso.' })

  // ── excluir o acesso de alguem ─────────────────────────────────────
  if (acao === 'excluir') {
    const id = String(corpo.id ?? '')
    if (!id) return resposta(400, { erro: 'Qual usuário?' })
    if (id === eu) return resposta(400, { erro: 'Você não pode excluir a própria conta.' })

    const { data: alvo } = await admin
      .from('usuarios')
      .select('permissao, ativo')
      .eq('id', id)
      .maybeSingle()
    if (alvo?.permissao === 'acesso_total') {
      // nunca deixar o app sem ninguem que administre
      const { count } = await admin
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('permissao', 'acesso_total')
        .eq('ativo', true)
        .neq('id', id)
      if (!count) return resposta(400, { erro: 'Esta é a única conta de coordenação ativa.' })
    }

    // a foto vai junto (pasta perfis/<id>/)
    const { data: fotos } = await admin.storage.from('perfis').list(id)
    if (fotos?.length) {
      await admin.storage.from('perfis').remove(fotos.map((f) => `${id}/${f.name}`))
    }

    // apagar a conta apaga a linha em `usuarios`; o que estava atribuido a
    // ela (aulas, treinos, chamadas) fica sem atribuicao (SQL de exclusao)
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) {
      return resposta(500, {
        erro: /foreign key|violates/i.test(error.message)
          ? 'Falta rodar o SQL de exclusão no Supabase.'
          : 'Não foi possível excluir o usuário.',
      })
    }
    return resposta(200, { ok: true })
  }

  // ── redefinir a senha de quem esqueceu ─────────────────────────────
  if (acao === 'redefinir-senha') {
    const id = String(corpo.id ?? '')
    const senha = String(corpo.senha ?? '')
    if (!id) return resposta(400, { erro: 'Qual usuário?' })
    if (id === eu) return resposta(400, { erro: 'A sua senha você troca em Minha conta.' })
    if (senha.length < 8) return resposta(400, { erro: 'A senha precisa de pelo menos 8 caracteres.' })
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha })
    if (error) return resposta(400, { erro: 'Não foi possível redefinir a senha.' })
    return resposta(200, { ok: true })
  }

  if (acao !== 'criar') return resposta(400, { erro: 'Ação desconhecida.' })

  // ── criar um acesso ────────────────────────────────────────────────
  const nome = String(corpo.nome ?? '').trim()
  const email = String(corpo.email ?? '').trim().toLowerCase()
  const senha = String(corpo.senha ?? '')
  const permissao = String(corpo.permissao ?? '')
  const funcao = corpo.funcao ? String(corpo.funcao) : null

  if (nome.length < 2) return resposta(400, { erro: 'Escreva o nome da pessoa.' })
  if (!EMAIL_VALIDO.test(email)) return resposta(400, { erro: 'E-mail inválido.' })
  if (senha.length < 8) return resposta(400, { erro: 'A senha precisa de pelo menos 8 caracteres.' })
  if (!PERMISSOES.includes(permissao)) return resposta(400, { erro: 'Permissão inválida.' })
  if (funcao !== null && !FUNCOES.includes(funcao)) return resposta(400, { erro: 'Função inválida.' })
  if (funcao === null && permissao !== 'acesso_total') {
    return resposta(400, { erro: 'Escolha a função da pessoa.' })
  }

  // A conta, ja confirmada: quem cria e a coordenacao, nao a propria pessoa.
  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (erroCriar || !criado.user) {
    const existe = erroCriar?.code === 'email_exists' || /already/i.test(erroCriar?.message ?? '')
    return resposta(existe ? 409 : 400, {
      erro: existe ? 'Já existe uma conta com esse e-mail.' : 'Não foi possível criar a conta.',
    })
  }

  // A ficha em `usuarios`. O gatilho do banco ja criou a linha, inativa;
  // aqui ela ganha funcao, permissao e o acesso liberado.
  const { error: erroLinha } = await admin.from('usuarios').upsert({
    id: criado.user.id,
    nome,
    email,
    funcao,
    permissao,
    ativo: true,
  })
  if (erroLinha) {
    // sem a ficha a conta nao entra no app: desfaz para nao sobrar conta orfa
    await admin.auth.admin.deleteUser(criado.user.id)
    return resposta(500, { erro: 'Não foi possível salvar o acesso. Tente de novo.' })
  }

  return resposta(200, { id: criado.user.id })
})
