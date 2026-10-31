import { Easing } from 'react-native-reanimated'

import { temaGuardado } from '@/theme/tema-guardado'

/**
 * Tokens de design do ADAM.
 *
 * Espelham as variaveis da colecao "ADAM v2" no Figma
 * (arquivo rzbKju0UfsUJW1Hgy2bHui). Ao mudar um valor la, mude aqui.
 * Tema escuro (e o claro, a escolha de cada aparelho), tipografia Inter,
 * base de espacamento 4.
 *
 * As cores sao lidas uma vez, quando o app abre (os StyleSheets guardam o
 * valor). Trocar de tema guarda a escolha e recarrega o app — ver
 * theme/tema-guardado.ts.
 */

const ESCURO = {
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

  // marca: #9E06D1 e o roxo exato da marca (logo e kit), em tudo que e cor
  // cheia. primaryLt/primaryCh sao o mesmo roxo clareado so o bastante para
  // texto pequeno ler no escuro (4,5:1 no bg, surface e surface2).
  primary: '#9E06D1',
  primaryLt: '#BF5BE1',
  primaryCh: '#BF5BE1',
  primaryDk: '#3A0A52',
  /** fundo do botao secundario e de faixas: o roxo da marca a 40% */
  primarySoft: 'rgba(158, 6, 209, 0.4)',
  /**
   * Fundo dos destaques (botao principal, item ativo, chip e selo ativos,
   * avatar): cinza um tom acima das superficies. O roxo fica so nos
   * detalhes — letra, icone, borda fina.
   */
  cheio: '#2A2A3A',
  /** letra e icone em cima do `cheio`: o roxo da marca clareado (4,65:1) */
  onPrimary: '#C870E8',
  /** letra do botao secundario */
  onSoft: '#FFFFFF',

  // estado
  success: '#3DD68C',
  warn: '#F5A524',
  danger: '#FF7AB5',
}

/**
 * Modo claro: o mesmo roxo da marca nas areas cheias; texto roxo no roxo
 * cheio (6,2:1 sobre o branco). Estados escurecidos para ler no claro.
 */
const CLARO: typeof ESCURO = {
  bg: '#F6F5FA',
  surface: '#FFFFFF',
  surface2: '#EFEDF5',
  border: '#DCD8E6',
  divider: '#E7E3EF',
  skeleton: '#E9E6F0',

  text: '#16131D',
  muted: '#5F5A70',
  faint: '#6E6981',

  primary: '#9E06D1',
  primaryLt: '#9E06D1',
  primaryCh: '#9E06D1',
  primaryDk: '#F0DDF8',
  primarySoft: 'rgba(158, 6, 209, 0.14)',
  cheio: '#E3E0EB',
  /** o roxo exato da logo: 4,74:1 sobre o `cheio` claro */
  onPrimary: '#9E06D1',
  onSoft: '#16131D',

  success: '#13854F',
  warn: '#A86400',
  danger: '#C2185B',
}

/** Tema escolhido no aparelho (botao do sol/lua no topo, ao lado da foto). */
export const tema = temaGuardado()
export const escuro = tema === 'escuro'

export const color = escuro ? ESCURO : CLARO

/**
 * Contraste: primary rende 3.19:1 sobre bg — aprovado para area cheia
 * (botao, icone), reprovado para texto; texto branco sobre ele rende 6.18:1.
 * Texto e dado em roxo usam primaryLt, que passa 4.5:1 (criterio AA).
 */
export const onDark = {
  /** o fundo dos destaques: cinza (o roxo e so detalhe) */
  fill: color.cheio,
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
 * Respiro no fim do conteudo rolavel das telas com a barra de menu. A barra
 * e de vidro e o conteudo passa por baixo dela: o fim da lista precisa
 * subir acima dos botoes (faixa da barra, ate ~100 no iPhone) e ainda
 * sobrar folga para o ultimo card nao colar neles.
 */
export const ESPACO_FIM_DA_TELA = 140

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
