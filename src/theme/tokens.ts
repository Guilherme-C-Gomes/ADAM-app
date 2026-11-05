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

/**
 * Paleta (05/11/2026): #0E0B1D fundo, #2A1E4D e #5A3B8C roxos escuros,
 * #8B7CC7 roxo, #C9C2E3 lilas, #3A3A52 cinza. A logo continua com o roxo
 * dela; no app o roxo segue so nos detalhes (letra, icone, borda fina) e os
 * destaques cheios sao o cinza #3A3A52.
 */
const ESCURO = {
  // superficies, do fundo para a frente (o #0E0B1D clareado aos poucos)
  bg: '#0E0B1D',
  surface: '#17122B',
  surface2: '#211A3B',
  border: '#3A3A52',
  divider: '#2A1E4D',
  skeleton: '#211A3B',

  // texto, do mais forte para o mais fraco
  text: '#FFFFFF',
  muted: '#A9A3C4',
  faint: '#8E87AD',

  // marca: #8B7CC7 nas cores cheias pequenas (barra, interruptor, bolinha)
  // e no texto roxo (5,4:1 no bg; 4,6:1 no surface2). primaryLt e o lilas
  // (links e o "atual" dos graficos); primaryDk o roxo escuro da paleta.
  primary: '#8B7CC7',
  primaryLt: '#C9C2E3',
  primaryCh: '#8B7CC7',
  primaryDk: '#5A3B8C',
  /** fundo de faixas (dias marcados no calendario): o roxo a 40% */
  primarySoft: 'rgba(90, 59, 140, 0.4)',
  /**
   * Fundo dos destaques (botao principal, item ativo, chip e selo ativos,
   * avatar): o cinza da paleta. O roxo fica so nos detalhes.
   */
  cheio: '#3A3A52',
  /** letra e icone em cima do `cheio`: o lilas (6,5:1) */
  onPrimary: '#C9C2E3',
  /** letra do botao secundario */
  onSoft: '#FFFFFF',

  // estado
  success: '#3DD68C',
  warn: '#F5A524',
  danger: '#FF7AB5',
}

/**
 * Modo claro: a mesma paleta ao contrario — fundo lilas bem claro, texto no
 * #0E0B1D e o roxo #5A3B8C nos detalhes (8,6:1 no branco).
 */
const CLARO: typeof ESCURO = {
  bg: '#F4F2FA',
  surface: '#FFFFFF',
  surface2: '#ECE9F5',
  border: '#C9C2E3',
  divider: '#E2DDF0',
  skeleton: '#E6E2F1',

  text: '#0E0B1D',
  muted: '#4F4A66',
  faint: '#625C7C',

  primary: '#5A3B8C',
  primaryLt: '#5A3B8C',
  primaryCh: '#5A3B8C',
  primaryDk: '#8B7CC7',
  primarySoft: 'rgba(90, 59, 140, 0.14)',
  cheio: '#DDD8EE',
  /** o roxo da paleta: 6,2:1 sobre o `cheio` claro */
  onPrimary: '#5A3B8C',
  onSoft: '#0E0B1D',

  success: '#13854F',
  warn: '#A86400',
  danger: '#C2185B',
}

/** Tema escolhido no aparelho (botao do sol/lua no topo, ao lado da foto). */
export const tema = temaGuardado()
export const escuro = tema === 'escuro'

export const color = escuro ? ESCURO : CLARO

/**
 * Contraste: primary/primaryCh passam 4.5:1 sobre bg, surface e surface2
 * (texto pequeno, criterio AA); o lilas primaryLt passa com folga.
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
