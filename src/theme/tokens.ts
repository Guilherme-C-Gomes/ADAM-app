import { Easing } from 'react-native-reanimated'

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

/**
 * Respiro no fim do conteudo rolavel das telas. A barra de menu nao
 * sobrepoe mais a tela (a cena termina acima dela), entao isto e so folga
 * para o ultimo card nao colar no fim.
 */
export const ESPACO_FIM_DA_TELA = 40 // space.xxxl

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

/**
 * Movimento: duracoes em milissegundos, curvas e o passo da cascata.
 *
 * As curvas sao Easing.bezier do Reanimated: rodam na thread de UI no
 * celular e viram cubic-bezier do CSS na web.
 * - expoOut: chega rapido e assenta devagar — entradas, barras, numeros.
 * - backOut: passa um pouco do ponto e volta — pop-ups e selos.
 * - inOut: simetrica — vai e volta (brilho do esqueleto).
 */
export const motion = {
  instant: 100,
  fast: 150,
  base: 200,
  medium: 300,
  slow: 400,
  /** atraso entre um item e o proximo numa entrada em cascata */
  stagger: 25,
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
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
