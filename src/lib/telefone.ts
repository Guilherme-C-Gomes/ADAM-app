/**
 * Telefone do Brasil, formatado enquanto a pessoa digita:
 * "+55 (11) 98765-4321" (celular) ou "+55 (11) 4411-2648" (fixo).
 *
 * O +55 vem sempre na frente; quem digitar o 55 junto nao duplica. Guardamos
 * o texto ja formatado: quem precisa so dos numeros (WhatsApp, ligar) tira os
 * simbolos com `digitosComPais`.
 */

/** Os numeros sem o 55 do pais: DDD + numero, no maximo 11. */
function nacional(texto: string) {
  let digitos = texto.replace(/\D/g, '')
  // "+55" na frente e o nosso prefixo (ou foi colado): nao e DDD
  if (texto.trim().startsWith('+55') || (digitos.startsWith('55') && digitos.length > 11)) {
    digitos = digitos.slice(2)
  }
  return digitos.slice(0, 11)
}

/** Monta "+55 (DD) XXXXX-XXXX" com o que ja foi digitado. */
export function mascaraTelefone(texto: string) {
  const d = nacional(texto)
  if (!d) return ''
  if (d.length <= 2) return `+55 (${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `+55 (${ddd}) ${resto}`
  // 9 digitos depois do DDD = celular (5-4); ate 8 = fixo (4-4)
  const corte = resto.length === 9 ? 5 : 4
  return `+55 (${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}

/**
 * Para o onChangeText: formata e, quando a pessoa apaga um simbolo (o "-"
 * ou o ")"), apaga tambem o numero antes dele — senao o apagar travava.
 */
export function digitarTelefone(anterior: string, novo: string) {
  const antes = nacional(anterior)
  const depois = nacional(novo)
  if (novo.length < anterior.length && depois === antes) {
    return mascaraTelefone(antes.slice(0, -1))
  }
  return mascaraTelefone(novo)
}

/** DDD + 8 ou 9 digitos. */
export function telefoneValido(texto: string) {
  const d = nacional(texto)
  return d.length === 10 || d.length === 11
}

/** "5511987654321": para o WhatsApp e para ligar (com "+" na frente). */
export function digitosComPais(texto: string) {
  const digitos = texto.replace(/\D/g, '')
  return digitos.length <= 11 ? `55${digitos}` : digitos
}
