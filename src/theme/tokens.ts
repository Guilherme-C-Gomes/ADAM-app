/**
 * Tokens de design do ADAM.
 *
 * Espelham as variaveis da colecao "ADAM v2" no Figma
 * (arquivo rzbKju0UfsUJW1Hgy2bHui). Ao mudar um valor la, mude aqui.
 * Tema escuro, tipografia Inter, base de espacamento 4.
 */

export const color = {
  // superficies, do fundo para a frente
  bg: '#0A0A12',
  surface: '#15151F',
  surface2: '#1E1E2B',
  border: '#2E2E42',
  divider: '#23233A',
  skeleton: '#20202E',

  // texto, do mais forte para o mais fraco
  text: '#FFFFFF',
  muted: '#9A9AAD',
  faint: '#8A8AA0',

  // marca
  primary: '#9E05D2',
  primaryLt: '#C24BEE',
  primaryCh: '#D06CF5',
  primaryDk: '#3A0A52',

  // estado
  success: '#3DD68C',
  warn: '#F5A524',
  danger: '#FF7AB5',
} as const

/**
 * Contraste: primary rende 3.19:1 sobre bg — aprovado para area cheia
 * (botao, icone), reprovado para texto. Texto e dado em roxo usam
 * primaryLt, que rende 5.18:1 e passa no criterio AA.
 */
export const onDark = {
  fill: color.primary,
  text: color.primaryLt,
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const

export const radius = {
  campo: 12,
  botao: 16,
  card: 16,
  chip: 16,
  nav: 24,
} as const

/** Area minima de toque — alinhado ao guideline de acessibilidade da Apple. */
export const target = {
  minimo: 44,
} as const

/** Duracoes de animacao em milissegundos. */
export const motion = {
  instant: 100,
  fast: 150,
  base: 200,
  medium: 300,
  slow: 400,
} as const

/**
 * Escala tipografica. O design system usa uma familia unica (Inter) e
 * varia peso e cor para hierarquia, em vez de multiplicar tamanhos.
 */
export const type = {
  display: { fontSize: 32, fontWeight: '700' },
  h1: { fontSize: 24, fontWeight: '600' },
  h2: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  small: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const

/** Telas foram desenhadas em 390x844 (iPhone). */
export const canvas = {
  width: 390,
  height: 844,
  gutter: 20,
} as const
