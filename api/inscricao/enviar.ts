/**
 * Segundo (e ultimo) passo do envio: confere a ficha de novo, confere os
 * arquivos que ja subiram para o Storage, cuida da assinatura e grava a
 * inscricao como "pendente". A crianca so entra no sistema quando a
 * Secretaria cadastrar pelo app.
 *
 * Assinatura:
 * - gov.br: o PDF assinado ja subiu (ficha_govbr.pdf); _inscricao/assinatura.ts
 *   confere se e desta ficha, se esta assinado e se nada mudou depois;
 * - na tela: chega a imagem da assinatura; o PDF guardado e montado aqui,
 *   com a imagem, a data e a hora e o registro do envio.
 */
import { conferirPdfAssinado, pngInteiro } from '../_inscricao/assinatura'
import { codigoDa, conferirFicha } from '../_inscricao/ficha'
import { montarPdf } from '../_inscricao/pdf'
import {
  admin,
  BUCKET,
  CAMPOS_DE_ARQUIVO,
  comUnidade,
  falha,
  ipComSal,
  lerJson,
  unidadeDaInscricao,
  resposta,
  TAMANHO_MAXIMO,
  UUID,
  type CampoDeArquivo,
} from '../_inscricao/servidor'

/** Menos que isto entre abrir o formulario e enviar e robo, nao gente. */
const TEMPO_MINIMO = 45_000

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request, 1_500_000)) as Record<string, unknown>
    const id = String(corpo?.id ?? '')

    // campo escondido que gente nao ve: preenchido = robo. Responde "ok"
    // para ele nao tentar outro jeito, e nada e gravado.
    if (typeof corpo?.site === 'string' && corpo.site.trim()) {
      return resposta({ ok: true, codigo: 'RECEBIDO' })
    }
    const iniciadoEm = Number(corpo?.iniciadoEm)
    if (!Number.isFinite(iniciadoEm) || Date.now() - iniciadoEm < TEMPO_MINIMO) {
      return falha('Confira as respostas com calma e envie de novo.')
    }
    if (!UUID.test(id)) return falha('Envio sem número. Recarregue a página e tente de novo.')

    const banco = admin()
    const [tentativa, jaEnviada] = await Promise.all([
      banco
        .from('inscricao_tentativas')
        .select('id, criado_em')
        .eq('id', id)
        .gte('criado_em', new Date(Date.now() - 24 * 3600_000).toISOString())
        .maybeSingle(),
      banco.from('inscricoes').select('hash').eq('id', id).maybeSingle(),
    ])
    if (jaEnviada.data) {
      // o mesmo envio repetido (internet caiu na resposta): ja esta salvo
      return resposta({ ok: true, codigo: codigoDa(jaEnviada.data.hash as string) })
    }
    if (tentativa.error || !tentativa.data) {
      return falha(
        'Este envio expirou. Recarregue a página e envie de novo (os dados continuam preenchidos).',
      )
    }

    const daInscricao = await unidadeDaInscricao()
    if (!daInscricao) return falha('O formulário está em manutenção. Tente mais tarde.', 503)
    const unidade = daInscricao.nome
    const conferida = conferirFicha(comUnidade(corpo.ficha, daInscricao.id))
    if (!conferida.ok) return Response.json({ erros: conferida.erros }, { status: 400 })
    const { ficha, hash } = conferida

    // os arquivos que subiram para a pasta desta inscricao
    const lista = await banco.storage.from(BUCKET).list(id, { limit: 20 })
    if (lista.error) return falha('Não foi possível conferir os arquivos.', 500, lista.error)
    const arquivos: Partial<Record<CampoDeArquivo, string>> = {}
    for (const item of lista.data ?? []) {
      const campo = item.name.split('.')[0] as CampoDeArquivo
      if (!(campo in CAMPOS_DE_ARQUIVO)) continue
      const tamanho = Number((item.metadata as { size?: number } | null)?.size ?? 0)
      if (tamanho > TAMANHO_MAXIMO) {
        return falha(`"${CAMPOS_DE_ARQUIVO[campo]}" passa de 10 MB. Envie um arquivo menor.`)
      }
      arquivos[campo] = `${id}/${item.name}`
    }

    const assinatura = (corpo.assinatura ?? {}) as Record<string, unknown>
    let fichaPath: string
    let reconhecida = false
    if (assinatura.tipo === 'govbr') {
      const caminho = arquivos.ficha_govbr
      if (!caminho) return falha('Falta enviar a ficha assinada no gov.br.')
      const baixado = await banco.storage.from(BUCKET).download(caminho)
      if (baixado.error || !baixado.data) {
        return falha('Não foi possível ler a ficha assinada. Envie de novo.', 500, baixado.error)
      }
      const conferencia = conferirPdfAssinado(
        new Uint8Array(await baixado.data.arrayBuffer()),
        hash,
      )
      if (!conferencia.ok) return falha(conferencia.erro)
      reconhecida = conferencia.reconhecida
      fichaPath = caminho
      delete arquivos.ficha_govbr
    } else if (assinatura.tipo === 'tela') {
      const imagem = String(assinatura.imagem ?? '')
      const base64 = imagem.startsWith('data:image/png;base64,') ? imagem.slice(22) : ''
      const png = new Uint8Array(Buffer.from(base64, 'base64'))
      if (png.length < 200 || png.length > 600_000 || !pngInteiro(png)) {
        return falha('A assinatura não chegou. Assine de novo no quadro.')
      }
      const quando = new Date().toISOString()
      const ipHash = ipComSal(request)
      const pdf = await montarPdf(ficha, hash, unidade, {
        tipo: 'tela',
        imagem: png,
        quando,
        registro: ipHash.slice(0, 12).toUpperCase(),
      })
      fichaPath = `${id}/ficha-assinada.pdf`
      const enviado = await banco.storage
        .from(BUCKET)
        .upload(fichaPath, pdf, { contentType: 'application/pdf', upsert: true })
      if (enviado.error)
        return falha('Não foi possível guardar a ficha assinada.', 500, enviado.error)
      delete arquivos.ficha_govbr
    } else {
      return falha('Falta assinar a ficha.')
    }

    const { error } = await banco.from('inscricoes').insert({
      id,
      crianca_nome: ficha.crianca.nome,
      nascimento: ficha.crianca.nascimento,
      unidade_id: ficha.crianca.unidadeId,
      dados: ficha,
      hash,
      assinatura_tipo: assinatura.tipo,
      assinatura_reconhecida: reconhecida,
      ficha_path: fichaPath,
      arquivos,
      ip_hash: ipComSal(request),
    })
    if (error) return falha('Não foi possível salvar a inscrição. Tente de novo.', 500, error)
    return resposta({ ok: true, codigo: codigoDa(hash) })
  } catch (e) {
    return falha('Não foi possível enviar. Tente de novo em alguns minutos.', 500, e)
  }
}
