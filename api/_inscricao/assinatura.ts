/**
 * Confere o PDF que a mae devolve depois de assinar no gov.br.
 *
 * O que da para garantir aqui, sem servico pago:
 * - e a ficha DESTA inscricao: a marca "ADAM-FICHA:<hash>" (pdf.ts) esta
 *   no arquivo, e o hash so bate se nenhum dado mudou depois de baixar;
 * - tem assinatura digital (PAdES: /ByteRange + /Contents), e a ultima
 *   assinatura cobre o arquivo ate o fim — nada foi acrescentado depois;
 * - o certificado e do gov.br / ICP-Brasil (o nome aparece no certificado
 *   embutido). Isso marca `assinatura_reconhecida`.
 *
 * A validacao criptografica completa (cadeia e revogacao) fica para o
 * validar.iti.gov.br, que o app abre para a Secretaria quando ela quiser.
 */
import { marcaDoPdf } from './ficha'

export type Conferencia = { ok: true; reconhecida: boolean } | { ok: false; erro: string }

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1')

export function conferirPdfAssinado(bytes: Uint8Array, hash: string): Conferencia {
  const texto = latin1(bytes)
  if (!texto.startsWith('%PDF')) {
    return {
      ok: false,
      erro: 'O arquivo enviado não é um PDF. Envie a ficha assinada que o gov.br devolveu.',
    }
  }
  if (!texto.includes(marcaDoPdf(hash))) {
    return {
      ok: false,
      erro: 'Esse PDF não é a ficha que você preencheu, ou algum dado mudou depois que você baixou. Baixe a ficha de novo, assine no gov.br e envie o arquivo assinado.',
    }
  }

  const faixas = [...texto.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)]
  const temFiltro =
    /\/SubFilter\s*\/(adbe\.pkcs7\.detached|ETSI\.CAdES\.detached|adbe\.pkcs7\.sha1)/.test(texto)
  if (!faixas.length || !temFiltro) {
    return {
      ok: false,
      erro: 'Esse PDF ainda não tem assinatura digital. Assine no gov.br (assinador.iti.br) e envie o arquivo que ele devolve.',
    }
  }

  // a ultima assinatura cobre ate o fim do arquivo (sobra so espaco/quebra)
  const ultima = faixas[faixas.length - 1]
  const [a, b, c, d] = ultima.slice(1).map(Number)
  const fim = c + d
  const sobra = texto.slice(fim)
  if (a !== 0 || b <= 0 || c <= b || fim > bytes.length || sobra.trim().length > 0) {
    return {
      ok: false,
      erro: 'O PDF foi alterado depois de assinado. Envie o arquivo exatamente como o gov.br devolveu.',
    }
  }

  // o certificado fica no /Contents, em hexadecimal, entre b e c
  const hex = texto.slice(b, c).replace(/[<>\s]/g, '')
  const certificado = /^[0-9a-fA-F]+$/.test(hex) ? Buffer.from(hex, 'hex').toString('latin1') : ''
  const reconhecida = /ICP-Brasil|Governo Federal do Brasil|gov\.br|GOV\.BR/i.test(certificado)

  return { ok: true, reconhecida }
}
