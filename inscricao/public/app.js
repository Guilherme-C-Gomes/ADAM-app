/*
 * Inscricao ADAM · o formulario, passo a passo.
 *
 * As respostas ficam no localStorage enquanto a mae preenche (ela pode sair
 * para assinar no gov.br e voltar). Arquivos nao cabem la: ficam so na
 * memoria, por isso os documentos vem DEPOIS da assinatura.
 *
 * Envio: /api/preparar (numero + enderecos de upload) -> arquivos direto
 * para o Storage -> /api/enviar (o servidor confere tudo de novo).
 */
'use strict'

const PASSOS = ['inicio', 'crianca', 'familia', 'responsaveis', 'saude', 'termos', 'assinatura', 'documentos', 'revisar', 'pronto']
const CHAVE = 'adam-inscricao-v1'
const DOCUMENTOS = [
  ['foto', 'Foto da criança'],
  ['rg_certidao', 'RG ou certidão de nascimento da criança'],
  ['comprovante_residencia', 'Comprovante de residência'],
  ['atestado_medico', 'Atestado médico (apto ao esporte)'],
  ['matricula_escolar', 'Atestado de matrícula escolar'],
]
const MAX_ARQUIVO = 10 * 1024 * 1024

const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s))

// ─── estado ──────────────────────────────────────────────────────────

const novo = () => ({
  passo: 'inicio',
  iniciadoEm: 0,
  resp2: false,
  baixadaCom: null,
  assinatura: { tipo: '', imagem: '' },
  dados: {
    crianca: { cidade: 'Atibaia' },
    familia: {},
    responsaveis: [{ whatsapp: true }, { whatsapp: true }],
    saude: {},
    declarante: {},
  },
})

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (salvo && salvo.dados) return Object.assign(novo(), salvo)
  } catch {}
  return novo()
}
let estado = carregar()
const arquivos = {} // campo -> { blob, nome }

function guardar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {}
}

const raizDo = (caminho) => (caminho.startsWith('assinatura.') ? estado : estado.dados)
function ler(caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), raizDo(caminho))
}
function gravar(caminho, valor) {
  const partes = caminho.split('.')
  let o = raizDo(caminho)
  partes.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = /^\d+$/.test(partes[i + 1]) ? [] : {}
    o = o[k]
  })
  o[partes[partes.length - 1]] = valor
}

// ─── mascaras ────────────────────────────────────────────────────────

const so = (t) => String(t || '').replace(/\D/g, '')

function telNacional(t) {
  let d = so(t)
  if (String(t).trim().startsWith('+55') || (d.startsWith('55') && d.length > 11)) d = d.slice(2)
  return d.slice(0, 11)
}
function mascaraTelefone(t) {
  const d = telNacional(t)
  if (!d) return ''
  if (d.length <= 2) return `+55 (${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `+55 (${ddd}) ${resto}`
  const corte = resto.length === 9 ? 5 : 4
  return `+55 (${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}
const telefoneOk = (t) => [10, 11].includes(telNacional(t).length)

function mascaraCpf(t) {
  const d = so(t).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}
function cpfOk(t) {
  const c = so(t)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dv = (n) => {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10])
}
const mascaraCep = (t) => so(t).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')

const MASCARAS = { telefone: mascaraTelefone, cpf: mascaraCpf, cep: mascaraCep }

// ─── campos <-> estado ───────────────────────────────────────────────

function valorDoCampo(el) {
  if (el.type === 'checkbox') return el.checked
  if (el.type === 'radio') {
    if (el.value === 'true') return true
    if (el.value === 'false') return false
    return el.value
  }
  return el.value
}

function preencherCampos() {
  $$('main [name]').forEach((el) => {
    if (el.type === 'file' || el.name === 'site') return
    const v = ler(el.name)
    if (el.type === 'checkbox') el.checked = v !== false && v !== undefined ? Boolean(v) : el.defaultChecked
    else if (el.type === 'radio') el.checked = String(v) === el.value
    else if (v != null) el.value = v
  })
  $('#resp2').hidden = !estado.resp2
  $('#quero-resp2').hidden = estado.resp2
  condicionais()
  mostrarVia()
}

function condicionais() {
  $$('[data-se]').forEach((el) => {
    const [caminho, valores] = el.dataset.se.split('=')
    el.hidden = !valores.split('|').includes(String(ler(caminho) ?? ''))
  })
}

document.addEventListener('input', (e) => {
  const el = e.target
  if (!el.name || el.type === 'file' || el.name === 'site') return
  if (el.dataset.mascara === 'telefone') {
    // apagar um simbolo ("-", ")") apaga tambem o numero antes dele
    const antes = ler(el.name) || ''
    let novoValor = el.value
    if (novoValor.length < antes.length && telNacional(novoValor) === telNacional(antes)) {
      novoValor = telNacional(antes).slice(0, -1)
    }
    el.value = mascaraTelefone(novoValor)
  } else if (el.dataset.mascara) {
    el.value = MASCARAS[el.dataset.mascara](el.value)
  }
  el.classList.remove('invalido')
  gravar(el.name, valorDoCampo(el))
  if (el.name === 'crianca.cep' && so(el.value).length === 8) buscarCep(so(el.value))
  condicionais()
  if (el.name === 'assinatura.tipo') mostrarVia()
  mensagem('')
  guardar()
})
document.addEventListener('change', (e) => {
  if (e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.tagName === 'SELECT') {
    e.target.dispatchEvent(new Event('input', { bubbles: true }))
  }
})

async function buscarCep(cep) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const j = await r.json()
    if (j.erro) return
    const c = estado.dados.crianca
    if (!c.endereco && j.logradouro) c.endereco = `${j.logradouro}, `
    if (!c.bairro && j.bairro) c.bairro = j.bairro
    if (j.localidade) c.cidade = j.localidade
    guardar()
    preencherCampos()
  } catch {}
}

// ─── passos ──────────────────────────────────────────────────────────

const mensagem = (t) => ($('#mensagem').textContent = t)

function mostrar(passo, empilhar = true) {
  estado.passo = passo
  guardar()
  $$('.passo').forEach((s) => (s.hidden = s.dataset.passo !== passo))
  const i = PASSOS.indexOf(passo)
  const total = PASSOS.length - 2
  $('#progresso').hidden = i === 0 || passo === 'pronto'
  $('#passo-numero').textContent = `Passo ${i} de ${total} ·`
  $('#passo-nome').textContent = $(`[data-passo="${passo}"]`).dataset.nome || ''
  $('#barra').style.width = `${(i / total) * 100}%`
  $('#voltar').hidden = i === 0
  $('#rodape').hidden = passo === 'pronto'
  $('#avancar').textContent = i === 0 ? 'Começar' : passo === 'revisar' ? 'Enviar inscrição' : 'Continuar'
  $('#avancar').disabled = false
  mensagem('')
  if (passo === 'assinatura') prepararQuadro()
  if (passo === 'revisar') resumir()
  window.scrollTo(0, 0)
  if (empilhar) history.pushState({ passo }, '')
}
window.addEventListener('popstate', (e) => {
  if (estado.passo === 'pronto') return
  mostrar(e.state?.passo || 'inicio', false)
})

function marcar(nome) {
  const el = $(`[name="${nome}"]`)
  if (el) el.classList.add('invalido')
  return el
}

/** Confere o passo; devolve a primeira frase do que falta, ou ''. */
function conferir(passo) {
  const d = estado.dados
  const falta = []
  const exige = (ok, nome, frase) => {
    if (!ok) {
      if (nome) marcar(nome)
      falta.push(frase)
    }
  }
  const palavras = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length
  if (passo === 'crianca') {
    exige(palavras(d.crianca.nome) >= 2, 'crianca.nome', 'Escreva o nome completo da criança.')
    exige(d.crianca.nascimento, 'crianca.nascimento', 'Falta a data de nascimento.')
    exige(d.crianca.unidadeId, 'crianca.unidadeId', 'Escolha a unidade.')
    exige(String(d.crianca.cidade || '').trim(), 'crianca.cidade', 'Falta a cidade.')
    exige(String(d.crianca.endereco || '').trim(), 'crianca.endereco', 'Falta o endereço.')
    exige(String(d.crianca.escola || '').trim(), 'crianca.escola', 'Falta a escola.')
  }
  if (passo === 'responsaveis') {
    const r = d.responsaveis
    exige(String(r[0]?.nome || '').trim(), 'responsaveis.0.nome', 'Falta o nome do responsável 1.')
    exige(String(r[0]?.parentesco || '').trim(), 'responsaveis.0.parentesco', 'Falta o parentesco do responsável 1.')
    exige(telefoneOk(r[0]?.telefone), 'responsaveis.0.telefone', 'Confira o celular do responsável 1 (DDD + número).')
    if (estado.resp2 && (String(r[1]?.nome || '').trim() || so(r[1]?.telefone))) {
      exige(String(r[1]?.nome || '').trim(), 'responsaveis.1.nome', 'Falta o nome do responsável 2.')
      exige(String(r[1]?.parentesco || '').trim(), 'responsaveis.1.parentesco', 'Falta o parentesco do responsável 2.')
      exige(telefoneOk(r[1]?.telefone), 'responsaveis.1.telefone', 'Confira o celular do responsável 2.')
    }
    if (so(d.familia.telResidencial)) {
      exige(telefoneOk(d.familia.telResidencial), 'familia.telResidencial', 'Confira o telefone residencial.')
    }
    exige(String(d.familia.urgenciaNome || '').trim(), 'familia.urgenciaNome', 'Diga quem chamar em caso de urgência.')
    exige(telefoneOk(d.familia.urgenciaTelefone), 'familia.urgenciaTelefone', 'Confira o celular de urgência.')
  }
  if (passo === 'saude') {
    exige(d.saude.problemas, null, 'Diga se a criança tem problemas de saúde.')
    if (d.saude.problemas === 'sim') {
      exige(String(d.saude.descricao || '').trim(), 'saude.descricao', 'Descreva o problema de saúde.')
    }
  }
  if (passo === 'termos') {
    exige(palavras(d.declarante.nome) >= 2, 'declarante.nome', 'Escreva o seu nome completo.')
    exige(String(d.declarante.rg || '').trim(), 'declarante.rg', 'Falta o seu RG.')
    exige(cpfOk(d.declarante.cpf), 'declarante.cpf', 'Confira o seu CPF.')
    exige(d.declarante.vinculo, null, 'Diga se você é mãe, pai ou responsável legal.')
    exige(typeof d.declarante.autorizaImagem === 'boolean', null, 'Diga se autoriza o uso de imagem.')
    exige(d.declarante.aceitaTermos === true, null, 'Marque que leu e concorda com os termos.')
  }
  if (passo === 'assinatura') {
    const a = estado.assinatura
    exige(a.tipo, null, 'Escolha como vai assinar.')
    if (a.tipo === 'govbr') {
      exige(estado.baixadaCom, null, 'Baixe a ficha, assine no gov.br e envie o arquivo assinado.')
      exige(!estado.baixadaCom || estado.baixadaCom === JSON.stringify(estado.dados), null,
        'Você mudou respostas depois de baixar a ficha. Baixe de novo e assine a nova.')
      exige(arquivos.ficha_govbr, null, 'Envie a ficha assinada no gov.br (o PDF que o assinador devolve).')
    }
    if (a.tipo === 'tela') exige(a.imagem, null, 'Assine no quadro.')
  }
  return falta[0] || ''
}

$('#avancar').addEventListener('click', async () => {
  const passo = estado.passo
  if (passo === 'inicio') {
    if (!estado.iniciadoEm) estado.iniciadoEm = Date.now()
    return mostrar('crianca')
  }
  if (passo === 'revisar') return enviar()
  const falta = conferir(passo)
  if (falta) {
    mensagem(falta)
    $('.invalido')?.focus()
    return
  }
  mostrar(PASSOS[PASSOS.indexOf(passo) + 1])
})
$('#voltar').addEventListener('click', () => history.back())

$('#quero-resp2').addEventListener('click', () => {
  estado.resp2 = true
  guardar()
  preencherCampos()
})
$('#tirar-resp2').addEventListener('click', () => {
  estado.resp2 = false
  estado.dados.responsaveis[1] = { whatsapp: true }
  guardar()
  preencherCampos()
})

// ─── assinatura ──────────────────────────────────────────────────────

function mostrarVia() {
  $('#via-govbr').hidden = estado.assinatura.tipo !== 'govbr'
  $('#via-tela').hidden = estado.assinatura.tipo !== 'tela'
  if (estado.assinatura.tipo === 'tela') prepararQuadro()
}

function fichaParaEnvio() {
  const d = JSON.parse(JSON.stringify(estado.dados))
  d.responsaveis = estado.resp2 ? d.responsaveis.slice(0, 2) : d.responsaveis.slice(0, 1)
  return d
}

$('#baixar-ficha').addEventListener('click', async (e) => {
  const botao = e.currentTarget
  botao.disabled = true
  botao.textContent = 'Montando a ficha…'
  $('#aviso-govbr').hidden = true
  try {
    const r = await fetch('/api/ficha', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ficha: fichaParaEnvio() }),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      avisoGovbr((j.erros && j.erros.join(' ')) || j.erro || 'Não foi possível montar a ficha.')
      return
    }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ficha-adam-${(estado.dados.crianca.nome || 'crianca').split(' ')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    estado.baixadaCom = JSON.stringify(estado.dados)
    guardar()
    $('#baixou').textContent = 'Ficha baixada. Agora assine no gov.br.'
  } catch {
    avisoGovbr('Sem internet? Não foi possível baixar a ficha.')
  } finally {
    botao.disabled = false
    botao.textContent = 'Baixar ficha (PDF)'
  }
})

function avisoGovbr(t) {
  $('#aviso-govbr').textContent = t
  $('#aviso-govbr').hidden = !t
}

$('#ficha-govbr').addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return
  avisoGovbr('')
  if (file.size > MAX_ARQUIVO) return avisoGovbr('Esse arquivo passa de 10 MB.')
  // conferencia rapida: o PDF assinado tem /ByteRange (o servidor confere tudo)
  const texto = new TextDecoder('latin1').decode(await file.arrayBuffer())
  if (!texto.startsWith('%PDF')) return avisoGovbr('Esse arquivo não é um PDF.')
  if (!texto.includes('/ByteRange')) {
    return avisoGovbr('Esse PDF ainda não está assinado. Assine no gov.br e escolha o arquivo que ele devolve (costuma terminar em "_assinado.pdf").')
  }
  arquivos.ficha_govbr = { blob: file, nome: file.name }
  $('#nome-govbr').textContent = file.name
  $('#caixa-govbr').classList.add('pronto')
  mensagem('')
})

let quadroPronto = false
function prepararQuadro() {
  const canvas = $('#quadro')
  if (!canvas || canvas.offsetWidth === 0) return
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  const largura = canvas.offsetWidth
  const altura = canvas.offsetHeight
  if (canvas.width === Math.round(largura * dpr) && quadroPronto) return
  canvas.width = Math.round(largura * dpr)
  canvas.height = Math.round(altura * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#111'
  if (estado.assinatura.imagem) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, largura, altura)
    img.src = estado.assinatura.imagem
  }
  if (quadroPronto) return
  quadroPronto = true
  let desenhando = false
  let ultimo = null
  const ponto = (ev) => {
    const r = canvas.getBoundingClientRect()
    return { x: ev.clientX - r.left, y: ev.clientY - r.top }
  }
  canvas.addEventListener('pointerdown', (ev) => {
    desenhando = true
    ultimo = ponto(ev)
    canvas.setPointerCapture(ev.pointerId)
    ev.preventDefault()
  })
  canvas.addEventListener('pointermove', (ev) => {
    if (!desenhando) return
    const p = ponto(ev)
    const c = canvas.getContext('2d')
    c.beginPath()
    c.moveTo(ultimo.x, ultimo.y)
    c.lineTo(p.x, p.y)
    c.stroke()
    ultimo = p
    ev.preventDefault()
  })
  const fim = () => {
    if (!desenhando) return
    desenhando = false
    estado.assinatura.imagem = canvas.toDataURL('image/png')
    guardar()
    mensagem('')
  }
  canvas.addEventListener('pointerup', fim)
  canvas.addEventListener('pointercancel', fim)
}
$('#limpar-quadro').addEventListener('click', () => {
  const canvas = $('#quadro')
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  estado.assinatura.imagem = ''
  guardar()
})
window.addEventListener('resize', () => {
  if (estado.passo === 'assinatura') {
    quadroPronto && ($('#quadro').width = 0)
    prepararQuadro()
  }
})

// ─── documentos ──────────────────────────────────────────────────────

function montarDocumentos() {
  $('#arquivos').innerHTML = DOCUMENTOS.map(
    ([campo, nome]) => `
    <div>
      <div class="rotulo">${nome}</div>
      <label class="arquivo" data-arquivo="${campo}">
        <input type="file" accept="image/*,application/pdf" data-campo="${campo}" />
        <span>Tirar foto ou escolher arquivo</span>
      </label>
    </div>`,
  ).join('')
  $$('#arquivos input[type=file]').forEach((input) =>
    input.addEventListener('change', async () => {
      const file = input.files[0]
      const campo = input.dataset.campo
      const caixa = input.closest('.arquivo')
      if (!file) return
      caixa.querySelector('span').textContent = 'Preparando…'
      try {
        const pronto = await comprimir(file)
        if (pronto.size > MAX_ARQUIVO) throw new Error('grande')
        arquivos[campo] = { blob: pronto, nome: file.name }
        const kb = pronto.size / 1024
        caixa.querySelector('span').textContent =
          `${file.name} · ${kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`}`
        caixa.classList.add('pronto')
      } catch (err) {
        delete arquivos[campo]
        caixa.classList.remove('pronto')
        caixa.querySelector('span').textContent =
          err.message === 'grande' ? 'Arquivo passa de 10 MB. Escolha outro.' : 'Não foi possível abrir. Tente outra foto.'
      }
    }),
  )
}

/** Foto vira JPEG de ate 1600px (de 5 MB para uns 300 KB); PDF vai como esta. */
async function comprimir(file) {
  if (file.type === 'application/pdf') return file
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
    if (!blob) throw new Error('foto')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ─── revisar e enviar ────────────────────────────────────────────────

let nomesDasUnidades = {}
const br = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function resumir() {
  const d = estado.dados
  const r = fichaParaEnvio().responsaveis
  const docs = DOCUMENTOS.filter(([c]) => arquivos[c]).map(([, n]) => n)
  const linhas = [
    ['Criança', d.crianca.nome],
    ['Nascimento', br(d.crianca.nascimento)],
    ['Unidade', nomesDasUnidades[d.crianca.unidadeId] || ''],
    ...r.map((x, i) => [`Responsável ${i + 1}`, `${x.nome} (${x.parentesco}) · ${x.telefone}`]),
    ['Saúde', d.saude.problemas === 'sim' ? d.saude.descricao : 'Sem problemas informados'],
    ['Uso de imagem', d.declarante.autorizaImagem ? 'Autoriza' : 'Não autoriza'],
    ['Assinatura', estado.assinatura.tipo === 'govbr' ? 'gov.br' : 'Na tela'],
    ['Documentos', docs.length ? docs.join(', ') : 'Entregar depois'],
  ]
  $('#resumo').innerHTML = linhas
    .map(([a, b]) => `<div class="resumo-linha"><span>${esc(a)}</span><span>${esc(b)}</span></div>`)
    .join('')
  $('#erros').hidden = true
}

function mostrarErros(lista) {
  $('#erros').innerHTML = `<strong>Antes de enviar:</strong><ul>${lista.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`
  $('#erros').hidden = false
  $('#erros').scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function enviar() {
  // confere tudo de novo: a mae pode ter pulado um passo voltando pelo navegador
  for (const passo of ['crianca', 'responsaveis', 'saude', 'termos', 'assinatura']) {
    const falta = conferir(passo)
    if (falta) {
      mostrar(passo)
      mensagem(falta)
      return
    }
  }
  const botao = $('#avancar')
  botao.disabled = true
  $('#voltar').disabled = true
  try {
    botao.textContent = 'Enviando…'
    const lista = Object.entries(arquivos).filter(
      ([campo]) => campo !== 'ficha_govbr' || estado.assinatura.tipo === 'govbr',
    )
    const preparo = await postar('/api/preparar', {
      arquivos: lista.map(([campo, a]) => ({ campo, tipo: a.blob.type || 'application/pdf', tamanho: a.blob.size })),
    })
    let n = 0
    for (const [campo, a] of lista) {
      n++
      mensagem(`Enviando arquivos (${n} de ${lista.length})…`)
      const corpo = new FormData()
      corpo.append('cacheControl', '3600')
      corpo.append('', a.blob, a.nome)
      const r = await fetch(preparo.envios[campo], { method: 'PUT', headers: { 'x-upsert': 'true' }, body: corpo })
      if (!r.ok) throw new Error(`Não foi possível enviar "${a.nome}". Confira a internet e tente de novo.`)
    }
    mensagem('Conferindo a ficha…')
    const final = await postar('/api/enviar', {
      id: preparo.id,
      ficha: fichaParaEnvio(),
      assinatura: estado.assinatura.tipo === 'tela'
        ? { tipo: 'tela', imagem: estado.assinatura.imagem }
        : { tipo: 'govbr' },
      iniciadoEm: estado.iniciadoEm,
      site: $('#site').value,
    })
    $('#codigo').textContent = final.codigo
    mostrar('pronto', false)
    // enviada: nada da ficha (CPF, saude...) fica guardado neste celular
    estado = novo()
    for (const k of Object.keys(arquivos)) delete arquivos[k]
    try {
      localStorage.removeItem(CHAVE)
    } catch {}
  } catch (e) {
    mensagem('')
    mostrarErros(e.erros || [e.message || 'Não foi possível enviar. Tente de novo.'])
  } finally {
    botao.disabled = false
    $('#voltar').disabled = false
    if (estado.passo === 'revisar') botao.textContent = 'Enviar inscrição'
  }
}

async function postar(url, corpo) {
  let r
  try {
    r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
  } catch {
    throw new Error('Sem internet. Confira a conexão e tente de novo: suas respostas continuam aqui.')
  }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const erro = new Error(j.erro || 'Não foi possível enviar. Tente de novo.')
    if (j.erros) erro.erros = j.erros
    throw erro
  }
  return j
}

$('#nova').addEventListener('click', () => location.reload())

// ─── comeco ──────────────────────────────────────────────────────────

async function carregarUnidades() {
  const select = $('#unidades')
  try {
    const r = await fetch('/api/unidades')
    const lista = await r.json()
    if (!r.ok || !Array.isArray(lista)) throw new Error()
    nomesDasUnidades = Object.fromEntries(lista.map((u) => [u.id, u.nome]))
    select.innerHTML =
      `<option value="">Escolha</option>` +
      lista.map((u) => `<option value="${esc(u.id)}">${esc(u.nome)}</option>`).join('')
    select.value = estado.dados.crianca.unidadeId || ''
  } catch {
    select.innerHTML = '<option value="">Não carregou — recarregue a página</option>'
  }
}

async function carregarTermos() {
  try {
    const r = await fetch('/api/termos')
    const j = await r.json()
    $('#termos').innerHTML = j.termos.map((t) => `<li>${esc(t)}</li>`).join('')
  } catch {
    $('#termos').innerHTML = '<li>Não foi possível carregar os termos. Recarregue a página.</li>'
  }
}

montarDocumentos()
preencherCampos()
carregarUnidades()
carregarTermos()
history.replaceState({ passo: estado.passo }, '')
mostrar(estado.passo === 'pronto' ? 'inicio' : estado.passo, false)
