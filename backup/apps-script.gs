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
 * Copias do banco: ficam so as 3 mais recentes (cerca de um dia: manha,
 * tarde e noite). A cada copia nova, as mais antigas vao para a lixeira do
 * Drive, que o Google esvazia sozinho em 30 dias. Para limpar na hora as que
 * sobraram, rode a funcao "limparAgora" pelo editor.
 *
 * Fotos e documentos: o nome e o caminho no Storage (o restaurar-backup.mjs
 * usa o nome para devolver o arquivo ao lugar) e a descricao guarda a versao
 * ("v:<updated_at>"). Quando a foto da ficha ou um documento e trocado no app,
 * a versao muda, a Vercel manda de novo e a versao antiga (mesmo nome) vai
 * para a lixeira. Arquivos sem descricao sao de antes das versoes: a Vercel
 * troca todos, aos poucos, nas primeiras copias.
 *
 * ATUALIZAR (sempre que este arquivo mudar): no projeto do Apps Script, cole
 * o arquivo novo MANTENDO a sua linha SENHA, salve e va em Implantar >
 * Gerenciar implantacoes > lapis (editar) > Versao: Nova versao > Implantar.
 * Assim o URL /exec continua o mesmo e a Vercel nao precisa mudar.
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
const COPIAS_GUARDADAS = 3

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
      // nome -> versao (a descricao "v:..."); sem descricao = gravado antes
      // das versoes, conta como versao antiga
      const versoes = {}
      const lista = pasta.getFiles()
      while (lista.hasNext()) {
        const arquivo = lista.next()
        const nome = arquivo.getName()
        nomes.push(nome)
        versoes[nome] = versaoDe_(arquivo)
      }
      return saida_({ ok: true, nomes: nomes, versoes: versoes })
    }

    if (pedido.acao === 'salvar-arquivo') {
      const pasta = subpasta_(raiz, 'arquivos')
      // as versoes antigas do mesmo arquivo (mesmo nome) saem depois que a
      // nova estiver gravada
      const antigas = []
      const iguais = pasta.getFilesByName(pedido.nome)
      while (iguais.hasNext()) antigas.push(iguais.next())
      const bytes = Utilities.base64Decode(pedido.base64)
      const novo = pasta.createFile(
        Utilities.newBlob(bytes, pedido.mime || 'application/octet-stream', pedido.nome),
      )
      novo.setDescription('v:' + (pedido.versao || ''))
      antigas.forEach(function (arquivo) {
        arquivo.setTrashed(true)
      })
      return saida_({ ok: true, substituidos: antigas.length })
    }

    if (pedido.acao === 'teste') return saida_({ ok: true, pasta: raiz.getName() })

    return saida_({ ok: false, erro: 'acao desconhecida' })
  } catch (erro) {
    return saida_({ ok: false, erro: String(erro) })
  }
}

/** Rode pelo editor para deixar so as 3 copias mais recentes agora. */
function limparAgora() {
  const apagadas = limparAntigos_(subpasta_(DriveApp.getFolderById(PASTA_ID), 'banco'))
  Logger.log('Copias antigas enviadas para a lixeira: ' + apagadas)
}

/** Rode uma vez pelo editor: autoriza o Drive e confere a pasta. */
function testarPasta() {
  Logger.log('Pasta: ' + DriveApp.getFolderById(PASTA_ID).getName())
}

/** A versao gravada na descricao ("v:2026..."); null se nao tem (arquivo antigo). */
function versaoDe_(arquivo) {
  const descricao = arquivo.getDescription() || ''
  return descricao.indexOf('v:') === 0 ? descricao.slice(2) : null
}

function subpasta_(raiz, nome) {
  const achadas = raiz.getFoldersByName(nome)
  return achadas.hasNext() ? achadas.next() : raiz.createFolder(nome)
}

/** Deixa so as COPIAS_GUARDADAS mais recentes; devolve quantas apagou. */
function limparAntigos_(pasta) {
  const copias = []
  const lista = pasta.getFiles()
  while (lista.hasNext()) {
    const arquivo = lista.next()
    if (/^adam-banco-.*\.json$/.test(arquivo.getName())) copias.push(arquivo)
  }
  // mais nova primeiro
  copias.sort(function (a, b) {
    return b.getDateCreated().getTime() - a.getDateCreated().getTime()
  })
  const sobrando = copias.slice(COPIAS_GUARDADAS)
  sobrando.forEach(function (arquivo) {
    arquivo.setTrashed(true)
  })
  return sobrando.length
}

function saida_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
