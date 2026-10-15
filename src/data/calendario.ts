/**
 * Nomes de dia e mes em tabela propria.
 *
 * Intl com pt-BR funciona no navegador mas derruba o app no Hermes do
 * Expo Go, entao nada de toLocaleDateString aqui.
 */
export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

const dois = (n: number) => String(n).padStart(2, '0')

/** "sáb 12/09" */
export function rotuloCurto(data: Date) {
  return `${DIAS_CURTOS[data.getDay()]} ${dois(data.getDate())}/${dois(data.getMonth() + 1)}`
}

/** "01/09/2026" */
export function rotuloNumerico(data: Date) {
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()}`
}

/** "Sábado, 12 de setembro" */
export function rotuloLongo(data: Date) {
  return `${DIAS_SEMANA[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()].toLowerCase()}`
}
