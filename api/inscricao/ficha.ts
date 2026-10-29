/**
 * Monta o PDF da ficha preenchida, ainda sem assinatura, para a mae baixar
 * e assinar no gov.br. Nada fica gravado: a ficha so entra no sistema pelo
 * /api/enviar.
 */
import { conferirFicha } from '../_inscricao/ficha'
import { montarPdf } from '../_inscricao/pdf'
import { comUnidade, falha, lerJson, unidadeDaInscricao } from '../_inscricao/servidor'

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request)) as { ficha?: unknown }
    const unidade = await unidadeDaInscricao()
    if (!unidade) return falha('O formulário está em manutenção. Tente mais tarde.', 503)
    const conferida = conferirFicha(comUnidade(corpo?.ficha, unidade.id))
    if (!conferida.ok) return Response.json({ erros: conferida.erros }, { status: 400 })

    const pdf = await montarPdf(conferida.ficha, conferida.hash, unidade.nome, null)
    const primeiro = conferida.ficha.crianca.nome
      .split(' ')[0]
      .normalize('NFD')
      .replace(/[^A-Za-z]/g, '')
    return new Response(Buffer.from(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="ficha-adam-${primeiro || 'crianca'}.pdf"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    return falha('Não foi possível montar a ficha. Tente de novo.', 500, e)
  }
}
