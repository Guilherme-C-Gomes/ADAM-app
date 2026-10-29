/**
 * As unidades da ADAM (id e nome), para a mae escolher onde a crianca vai
 * treinar. E so o nome do lugar: nada de dado de crianca sai por aqui.
 */
import { admin, falha, resposta } from '../lib/servidor'

export async function GET() {
  try {
    const { data, error } = await admin().from('unidades').select('id, nome').order('nome')
    if (error) return falha('Não foi possível carregar as unidades.', 500, error)
    return new Response(JSON.stringify(data ?? []), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    })
  } catch (e) {
    return falha('O formulário está em manutenção. Tente mais tarde.', 503, e)
  }
}

export function POST() {
  return resposta({ erro: 'Use GET.' }, 405)
}
