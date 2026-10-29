/**
 * Primeiro passo do envio: devolve um numero para a inscricao e um endereco
 * de upload para cada arquivo (fotos de documento, a ficha assinada no
 * gov.br). O navegador manda os arquivos direto para o Storage por esses
 * enderecos — eles passam do limite de tamanho de uma funcao da Vercel — e
 * so depois chama o /api/enviar.
 *
 * Cada pedido fica anotado (com o ip com sal) para limitar abuso: poucas
 * tentativas por aparelho e um teto por dia para o formulario todo.
 */
import { randomUUID } from 'node:crypto'

import {
  admin,
  BUCKET,
  CAMPOS_DE_ARQUIVO,
  falha,
  ipComSal,
  lerJson,
  resposta,
  TAMANHO_MAXIMO,
  TIPOS_ACEITOS,
  type CampoDeArquivo,
} from '../lib/servidor'

const POR_APARELHO_POR_DIA = 10
const POR_DIA = 300

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request, 20_000)) as { arquivos?: unknown }
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

    const banco = admin()
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
      return falha('O formulário está em manutenção. Tente mais tarde.', 503, doAparelho.error ?? doDia.error)
    }
    if ((doAparelho.count ?? 0) >= POR_APARELHO_POR_DIA) {
      return falha('Muitos envios deste aparelho hoje. Tente amanhã ou fale com a ADAM.', 429)
    }
    if ((doDia.count ?? 0) >= POR_DIA) {
      return falha('O formulário recebeu muitos envios hoje. Tente amanhã.', 429)
    }

    const id = randomUUID()
    const anotada = await banco.from('inscricao_tentativas').insert({ id, ip_hash: ipHash })
    if (anotada.error) return falha('Não foi possível começar o envio. Tente de novo.', 500, anotada.error)

    const envios: Record<string, string> = {}
    for (const a of arquivos) {
      const { data, error } = await banco.storage
        .from(BUCKET)
        .createSignedUploadUrl(`${id}/${a.campo}.${a.extensao}`, { upsert: true })
      if (error || !data) return falha('Não foi possível preparar o envio dos arquivos.', 500, error)
      envios[a.campo] = data.signedUrl
    }
    return resposta({ id, envios })
  } catch (e) {
    return falha('Não foi possível começar o envio. Tente de novo.', 500, e)
  }
}
