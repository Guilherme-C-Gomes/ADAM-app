/**
 * Monta o PDF da ficha preenchida, ainda sem assinatura, para a mae baixar
 * e assinar no gov.br. Nada fica gravado: a ficha so entra no sistema pelo
 * /api/enviar.
 */
import { conferirFicha } from '../lib/ficha'
import { montarPdf } from '../lib/pdf'
import { falha, lerJson, nomeDaUnidade } from '../lib/servidor'

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request)) as { ficha?: unknown }
    const conferida = conferirFicha(corpo?.ficha)
    if (!conferida.ok) return Response.json({ erros: conferida.erros }, { status: 400 })

    const unidade = await nomeDaUnidade(conferida.ficha.crianca.unidadeId)
    if (!unidade) return falha('A unidade escolhida não existe mais. Escolha de novo.')

    const pdf = await montarPdf(conferida.ficha, conferida.hash, unidade, null)
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
