/**
 * Primeiro passo do envio: devolve um numero para a inscricao e um endereco
 * de upload para cada arquivo (fotos de documento, a ficha assinada no
 * gov.br). O navegador manda os arquivos direto para o Storage por esses
 * enderecos — eles passam do limite de tamanho de uma funcao da Vercel — e
 * so depois chama o /api/enviar.
 *
 * Cada pedido fica anotado (com o ip com sal) para limitar abuso: poucas
 * tentativas por aparelho e um teto por dia para o formulario todo. A ficha
 * e conferida ANTES de anotar (erro de preenchimento nao gasta tentativa), e
 * quem tenta de novo manda o numero que ja recebeu: ele e reaproveitado, sem
 * nova tentativa (e, se ja foi enviada, nada sobe de novo).
 */
import { randomUUID } from 'node:crypto'

import { conferirFicha } from '../_inscricao/ficha'
import {
  admin,
  BUCKET,
  CAMPOS_DE_ARQUIVO,
  comUnidade,
  falha,
  ipComSal,
  lerJson,
  resposta,
  TAMANHO_MAXIMO,
  TIPOS_ACEITOS,
  unidadeDaInscricao,
  UUID,
  type CampoDeArquivo,
} from '../_inscricao/servidor'

const POR_APARELHO_POR_DIA = 20
const POR_DIA = 300

/** Um endereco de upload por arquivo, na pasta da inscricao. */
async function enderecosDe(
  id: string,
  arquivos: { campo: CampoDeArquivo; extensao: string }[],
): Promise<Record<string, string>> {
  const envios: Record<string, string> = {}
  for (const a of arquivos) {
    const { data, error } = await admin()
      .storage.from(BUCKET)
      .createSignedUploadUrl(`${id}/${a.campo}.${a.extensao}`, { upsert: true })
    if (error || !data) throw error ?? new Error('upload')
    envios[a.campo] = data.signedUrl
  }
  return envios
}

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request, 200_000)) as {
      arquivos?: unknown
      ficha?: unknown
      id?: unknown
    }
    const pedidos = Array.isArray(corpo?.arquivos) ? corpo.arquivos : []
    const arquivos: { campo: CampoDeArquivo; extensao: string }[] = []
    for (const p of pedidos) {
      const { campo, tipo, tamanho } = (p ?? {}) as Record<string, unknown>
      if (typeof campo !== 'string' || !(campo in CAMPOS_DE_ARQUIVO)) {
        return falha('Arquivo de um tipo que o formulário não pede.')
      }
      const nome = CAMPOS_DE_ARQUIVO[campo as CampoDeArquivo]
      const extensao = TIPOS_ACEITOS[String(tipo)]
      if (!extensao || (campo === 'ficha_govbr' && extensao !== 'pdf')) {
        return falha(`"${nome}": envie foto (JPG ou PNG) ou PDF.`)
      }
      if (typeof tamanho !== 'number' || tamanho <= 0 || tamanho > TAMANHO_MAXIMO) {
        return falha(`"${nome}" passa de 10 MB. Tire uma foto mais leve ou envie outro arquivo.`)
      }
      if (arquivos.some((a) => a.campo === campo)) return falha(`"${nome}" veio duas vezes.`)
      arquivos.push({ campo: campo as CampoDeArquivo, extensao })
    }
    const enderecos = (id: string) => enderecosDe(id, arquivos)

    // a ficha primeiro: erro de preenchimento volta aqui, sem gastar tentativa
    const unidade = await unidadeDaInscricao()
    if (!unidade) return falha('O formulário está em manutenção. Tente mais tarde.', 503)
    const conferida = conferirFicha(comUnidade(corpo?.ficha, unidade.id))
    if (!conferida.ok) return Response.json({ erros: conferida.erros }, { status: 400 })

    const banco = admin()

    // tentando de novo: o mesmo numero, sem nova tentativa
    const anterior = typeof corpo?.id === 'string' && UUID.test(corpo.id) ? corpo.id : null
    if (anterior) {
      const [tentativa, enviada] = await Promise.all([
        banco
          .from('inscricao_tentativas')
          .select('id')
          .eq('id', anterior)
          .gte('criado_em', new Date(Date.now() - 24 * 3600_000).toISOString())
          .maybeSingle(),
        banco.from('inscricoes').select('id').eq('id', anterior).maybeSingle(),
      ])
      // ja enviada: nada sobe de novo; o /api/enviar devolve o codigo dela
      if (enviada.data) return resposta({ id: anterior, envios: {} })
      if (tentativa.data) return resposta({ id: anterior, envios: await enderecos(anterior) })
    }

    const ipHash = ipComSal(request)
    const umDiaAtras = new Date(Date.now() - 24 * 3600_000).toISOString()
    const [doAparelho, doDia] = await Promise.all([
      banco
        .from('inscricao_tentativas')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('criado_em', umDiaAtras),
      banco
        .from('inscricao_tentativas')
        .select('id', { count: 'exact', head: true })
        .gte('criado_em', umDiaAtras),
    ])
    if (doAparelho.error || doDia.error) {
      return falha(
        'O formulário está em manutenção. Tente mais tarde.',
        503,
        doAparelho.error ?? doDia.error,
      )
    }
    if ((doAparelho.count ?? 0) >= POR_APARELHO_POR_DIA) {
      return falha('Muitos envios deste aparelho hoje. Tente amanhã ou fale com a ADAM.', 429)
    }
    if ((doDia.count ?? 0) >= POR_DIA) {
      return falha('O formulário recebeu muitos envios hoje. Tente amanhã.', 429)
    }

    const id = randomUUID()
    const anotada = await banco.from('inscricao_tentativas').insert({ id, ip_hash: ipHash })
    if (anotada.error)
      return falha('Não foi possível começar o envio. Tente de novo.', 500, anotada.error)

    return resposta({ id, envios: await enderecos(id) })
  } catch (e) {
    return falha('Não foi possível começar o envio. Tente de novo.', 500, e)
  }
}
