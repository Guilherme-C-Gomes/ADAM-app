/**
 * Busca de CEP pelo ViaCEP (viacep.com.br: gratuito, sem chave).
 *
 * - CEP -> rua, bairro, cidade e UF;
 * - rua (+ cidade e UF) -> CEP. A mesma rua pode ter varios CEPs (um por
 *   trecho ou lado); com o bairro, fica o do bairro certo.
 *
 * Sem internet ou sem resultado devolve null: o formulario segue com o que
 * a pessoa digitou.
 */

export type Endereco = { cep: string; rua: string; bairro: string; cidade: string; uf: string }

type RespostaViaCep = {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean | string
}

const daResposta = (r: RespostaViaCep): Endereco => ({
  cep: (r.cep ?? '').replace(/\D/g, ''),
  rua: r.logradouro ?? '',
  bairro: r.bairro ?? '',
  cidade: r.localidade ?? '',
  uf: r.uf ?? '',
})

export async function buscarCep(cep: string): Promise<Endereco | null> {
  const so = cep.replace(/\D/g, '')
  if (so.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${so}/json/`)
    const j = (await r.json()) as RespostaViaCep
    return j.erro ? null : daResposta(j)
  } catch {
    return null
  }
}

/** Sem acento e em minusculas, para comparar bairro com bairro. */
const ACENTOS: Record<string, string> = {
  á: 'a',
  à: 'a',
  â: 'a',
  ã: 'a',
  é: 'e',
  ê: 'e',
  í: 'i',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ü: 'u',
  ç: 'c',
}
const simples = (t: string) =>
  t
    .toLowerCase()
    .replace(/[áàâãéêíóôõúüç]/g, (c) => ACENTOS[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim()

/**
 * O CEP de uma rua. O ViaCEP pede ao menos 3 letras da rua. Com o bairro,
 * escolhe o CEP daquele bairro; sem ele, so responde se a rua tiver um CEP so.
 */
export async function buscarCepDaRua(
  rua: string,
  bairro: string,
  cidade = 'Atibaia',
  uf = 'SP',
): Promise<string | null> {
  // "Rua das Flores, 100" -> "Rua das Flores"; o ViaCEP procura so a rua
  const nome = rua.split(',')[0].replace(/\d+/g, '').trim()
  if (nome.length < 3 || !cidade.trim()) return null
  try {
    const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade.trim())}/${encodeURIComponent(nome)}/json/`
    const r = await fetch(url)
    const lista = (await r.json()) as RespostaViaCep[]
    if (!Array.isArray(lista) || !lista.length) return null
    const achados = lista.map(daResposta)
    if (bairro.trim()) {
      const doBairro = achados.find((e) => simples(e.bairro) === simples(bairro))
      if (doBairro) return doBairro.cep
    }
    const ceps = [...new Set(achados.map((e) => e.cep))]
    return ceps.length === 1 ? ceps[0] : null
  } catch {
    return null
  }
}
