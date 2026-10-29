/**
 * Os termos da ficha, para o formulario mostrar o mesmo texto que vai no
 * PDF (_inscricao/pdf.ts e a fonte; aqui so entrega).
 */
import { LGPD, TERMOS } from '../_inscricao/pdf'

export function GET() {
  return new Response(JSON.stringify({ termos: TERMOS, lgpd: LGPD }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
