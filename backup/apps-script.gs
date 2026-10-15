/**
 * ADAM · recebe as copias de seguranca e guarda na pasta do Google Drive.
 *
 * Quem manda as copias e a funcao da Vercel (api/backup.ts), 3 vezes por
 * dia e quando o ADM pede no app. Este script so recebe e guarda:
 *
 *   PASTA DO DRIVE
 *   ├── banco/      adam-banco-AAAA-MM-DD_HHhMM.json  (o banco inteiro)
 *   └── arquivos/   fotos e documentos (fichas__criancas__..., capas__..., ...)
 *
 * Copias do banco: guarda todas dos ultimos 45 dias e, mais antigas, so a
 * primeira de cada mes (as outras vao para a lixeira do Drive).
 *
 * COMO PUBLICAR (uma vez, logado na conta Google dona da pasta):
 * 1. script.google.com > Novo projeto > apague o que vier e cole este arquivo.
 * 2. Na linha SENHA abaixo, cole a MESMA senha que vai no CRON_SECRET da Vercel.
 * 3. Salve. No topo, escolha a funcao "testarPasta" e clique em Executar:
 *    o Google pede autorizacao para o Drive — autorize. O registro mostra o
 *    nome da pasta: se mostrou, a pasta esta certa.
 * 4. Implantar > Nova implantacao > tipo "App da Web":
 *      Executar como: Eu
 *      Quem pode acessar: Qualquer pessoa
 *    Implantar e copie o URL do app da Web (termina em /exec). Ele vai no
 *    BACKUP_DRIVE_URL da Vercel. Sem a senha certa o script nao grava nada.
 */

const PASTA_ID = '18PYxJuhCcgMH16D3ED_bqnjJTLvcF5Zm'
const SENHA = 'COLE_AQUI_A_MESMA_SENHA_DO_CRON_SECRET'
const DIAS_GUARDANDO_TUDO = 45

function doPost(e) {
  try {
    const pedido = JSON.parse(e.postData.contents)
    if (SENHA.indexOf('COLE_AQUI') === 0 || pedido.token !== SENHA) {
      return saida_({ ok: false, erro: 'senha' })
    }
    const raiz = DriveApp.getFolderById(PASTA_ID)

    if (pedido.acao === 'salvar-banco') {
      const pasta = subpasta_(raiz, 'banco')
      const arquivo = pasta.createFile(pedido.nome, pedido.conteudo, 'application/json')
      limparAntigos_(pasta)
      return saida_({ ok: true, id: arquivo.getId() })
    }

    if (pedido.acao === 'listar-arquivos') {
      const pasta = subpasta_(raiz, 'arquivos')
      const nomes = []
      const lista = pasta.getFiles()
      while (lista.hasNext()) nomes.push(lista.next().getName())
      return saida_({ ok: true, nomes: nomes })
    }

    if (pedido.acao === 'salvar-arquivo') {
      const pasta = subpasta_(raiz, 'arquivos')
      const bytes = Utilities.base64Decode(pedido.base64)
      pasta.createFile(Utilities.newBlob(bytes, pedido.mime || 'application/octet-stream', pedido.nome))
      return saida_({ ok: true })
    }

    if (pedido.acao === 'teste') return saida_({ ok: true, pasta: raiz.getName() })

    return saida_({ ok: false, erro: 'acao desconhecida' })
  } catch (erro) {
    return saida_({ ok: false, erro: String(erro) })
  }
}

/** Rode uma vez pelo editor: autoriza o Drive e confere a pasta. */
function testarPasta() {
  Logger.log('Pasta: ' + DriveApp.getFolderById(PASTA_ID).getName())
}

function subpasta_(raiz, nome) {
  const achadas = raiz.getFoldersByName(nome)
  return achadas.hasNext() ? achadas.next() : raiz.createFolder(nome)
}

/** Ultimos 45 dias: tudo. Antes disso: so a primeira copia de cada mes. */
function limparAntigos_(pasta) {
  const limite = Date.now() - DIAS_GUARDANDO_TUDO * 86400000
  const arquivos = []
  const lista = pasta.getFiles()
  while (lista.hasNext()) arquivos.push(lista.next())
  arquivos.sort(function (a, b) {
    return a.getName() < b.getName() ? -1 : 1
  })
  const mesJaGuardado = {}
  arquivos.forEach(function (arquivo) {
    const achado = arquivo.getName().match(/^adam-banco-(\d{4}-\d{2})-\d{2}_/)
    if (!achado) return
    if (arquivo.getDateCreated().getTime() >= limite) return
    if (!mesJaGuardado[achado[1]]) {
      mesJaGuardado[achado[1]] = true
      return
    }
    arquivo.setTrashed(true)
  })
}

function saida_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
