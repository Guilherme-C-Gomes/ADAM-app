/**
 * O Supabase devolve no maximo 1000 linhas por pedido ("max rows"), sem
 * avisar que cortou. Presenca de um ano inteiro passa disso facil — e um
 * numero cortado e um numero errado. Aqui as paginas vem uma a uma ate
 * acabar. A consulta precisa de uma ordem fixa (a chave), senao uma linha
 * pode pular de pagina.
 */
const PAGINA = 1000

export async function todasAsLinhas<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const linhas: T[] = []
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1)
    if (error) throw error
    const lote = data ?? []
    linhas.push(...lote)
    if (lote.length < PAGINA) return linhas
  }
}

/** Lista grande de ids vira pedidos menores: a URL do filtro `in` tem limite. */
export async function porLotes<I, T>(ids: I[], pedir: (lote: I[]) => Promise<T[]>, tamanho = 80) {
  const resultado: T[] = []
  for (let i = 0; i < ids.length; i += tamanho) {
    resultado.push(...(await pedir(ids.slice(i, i + tamanho))))
  }
  return resultado
}
