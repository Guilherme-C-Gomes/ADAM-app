import { useEffect, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeOut,
  interpolateColor,
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'

import { color, motion } from '@/theme/tokens'

/**
 * Movimento do ADAM, num lugar so.
 *
 * Tudo anda por transform e opacidade (thread de UI, 60 quadros) e
 * respeita o "reduzir movimento" do aparelho: com ele ligado, as
 * animacoes vao direto ao valor final (ReduceMotion.System).
 */

/** Atraso maximo de uma cascata: lista longa nao fica esperando. */
const ATRASO_MAXIMO = 300

/** Mola do toque: afunda rapido e volta com um respiro. */
export const molaToque = {
  damping: 18,
  stiffness: 420,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
} as const

/** Mola das pilulas que deslizam (menu e abas). */
export const molaDeslize = {
  damping: 22,
  stiffness: 260,
  mass: 0.9,
  reduceMotion: ReduceMotion.System,
} as const

/** Mola de "pop" (marca que acende, icone que entra). */
export const molaPop = {
  damping: 12,
  stiffness: 380,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
} as const

type OpcoesEntrada = {
  /** atraso antes do primeiro item (ms) */
  base?: number
  /** deslocamento inicial em px */
  distancia?: number
  /** duracao em ms */
  duracao?: number
}

function atrasoDaCascata(i: number, base: number) {
  return Math.min(base + Math.max(0, i) * motion.stagger, ATRASO_MAXIMO)
}

/**
 * Entrada em cascata subindo 8px: `entering={entrada(i)}`.
 * O item `i` espera `i * 25ms` (no maximo 300ms).
 */
/**
 * Na versao web as entradas em cascata nao rodam: o Reanimated na web
 * deixava os blocos que estavam entrando empilhados no mesmo lugar (no PC e
 * no Safari do iPhone). La os blocos aparecem direto.
 */
const SEM_ENTRADA = Platform.OS === 'web'

export function entrada(i = 0, { base = 0, distancia = 8, duracao = 420 }: OpcoesEntrada = {}) {
  if (SEM_ENTRADA) return undefined
  return FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: distancia }] })
    .duration(duracao)
    .delay(atrasoDaCascata(i, base))
    .easing(motion.expoOut)
    .reduceMotion(ReduceMotion.System)
}

/** Entrada em cascata vindo da esquerda (8px): `entering={entradaLateral(i)}`. */
export function entradaLateral(
  i = 0,
  { base = 0, distancia = 8, duracao = 420 }: OpcoesEntrada = {},
) {
  if (SEM_ENTRADA) return undefined
  return FadeInLeft.withInitialValues({ opacity: 0, transform: [{ translateX: -distancia }] })
    .duration(duracao)
    .delay(atrasoDaCascata(i, base))
    .easing(motion.expoOut)
    .reduceMotion(ReduceMotion.System)
}

/*
 * Pop-ups (confirmacao e recado): o fundo escurece por opacidade, o
 * cartao cresce de 0.92 passando um pouco do ponto (backOut, 320ms) e,
 * ao sair, encolhe para 0.96 enquanto o fundo apaga. Como o cartao mora
 * dentro do fundo, ele herda o fade do fundo.
 */
export const fundoEntra = FadeIn.duration(motion.base).reduceMotion(ReduceMotion.System)
export const fundoSai = FadeOut.duration(180).reduceMotion(ReduceMotion.System)
export const cartaoEntra = ZoomIn.withInitialValues({ transform: [{ scale: 0.92 }] })
  .duration(320)
  .easing(motion.backOut)
  .reduceMotion(ReduceMotion.System)
export const cartaoSai = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.96 }] },
})
  .duration(180)
  .reduceMotion(ReduceMotion.System)
/** Selo/icone que estoura logo depois do cartao (o check do recado). */
export const seloEntra = ZoomIn.withInitialValues({ transform: [{ scale: 0.4 }] })
  .delay(140)
  .duration(380)
  .easing(motion.backOut)
  .reduceMotion(ReduceMotion.System)

/**
 * Numero que conta do valor anterior ate o novo (600ms, expoOut) e
 * acende na cor de destaque quando muda depois de montado. Na primeira
 * vez conta a partir de 0.
 *
 * A contagem roda num requestAnimationFrame (funciona igual no celular e
 * na web); a cor anda num valor compartilhado do Reanimated. O leitor de
 * tela ouve sempre o valor final.
 */
export function NumeroAnimado({
  valor,
  formato = formatoPadrao,
  style,
  duracao = 600,
}: {
  valor: number
  /** como escrever o numero; recebe o valor intermediario (com casas) */
  formato?: (n: number) => string
  style?: StyleProp<TextStyle>
  duracao?: number
}) {
  const reduzido = useReducedMotion()
  const [mostrado, setMostrado] = useState(0)
  // o que esta na tela agora: a proxima contagem parte daqui
  const atual = useRef(0)
  const montado = useRef(false)
  const brilho = useSharedValue(0)

  useEffect(() => {
    const de = atual.current
    if (montado.current && de !== valor) {
      brilho.set(
        withSequence(
          withTiming(1, { duration: 120, reduceMotion: ReduceMotion.Never }),
          withTiming(0, { duration: 700, reduceMotion: ReduceMotion.Never }),
        ),
      )
    }
    montado.current = true

    let id = 0
    if (reduzido || de === valor) {
      id = requestAnimationFrame(() => {
        atual.current = valor
        setMostrado(valor)
      })
      return () => cancelAnimationFrame(id)
    }

    let inicio: number | null = null
    const passo = (agora: number) => {
      if (inicio === null) inicio = agora
      const t = Math.min(1, (agora - inicio) / duracao)
      const n = de + (valor - de) * expoOut(t)
      atual.current = t >= 1 ? valor : n
      setMostrado(atual.current)
      if (t < 1) id = requestAnimationFrame(passo)
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [valor, reduzido, duracao, brilho])

  const corBase = corDoEstilo(style)
  const corAnimada = useAnimatedStyle(() => ({
    color: interpolateColor(brilho.get(), [0, 1], [corBase, color.primaryLt]),
  }))

  return (
    <Animated.Text style={[style, corAnimada]} accessibilityLabel={formato(valor)}>
      {formato(mostrado)}
    </Animated.Text>
  )
}

function formatoPadrao(n: number) {
  return String(Math.round(n))
}

/** A mesma curva expoOut do token, em JS, para a contagem. */
function expoOut(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function corDoEstilo(style: StyleProp<TextStyle>) {
  const c = StyleSheet.flatten(style)?.color
  return typeof c === 'string' ? c : color.text
}

/**
 * Afundar ao toque: escala (0.97) e um pouco de opacidade, com mola.
 * Devolve o estilo animado e os eventos para um Pressable animado.
 */
export function usePressionar({ escala = 0.97, opacidade = 0.9 } = {}) {
  const apertado = useSharedValue(0)
  const estilo = useAnimatedStyle(() => ({
    opacity: 1 - (1 - opacidade) * Math.min(1, Math.max(0, apertado.get())),
    transform: [{ scale: 1 - (1 - escala) * apertado.get() }],
  }))
  return {
    estilo,
    onPressIn: () => apertado.set(withSpring(1, molaToque)),
    onPressOut: () => apertado.set(withSpring(0, molaToque)),
  }
}

const PressableAnimado = Animated.createAnimatedComponent(Pressable)

/**
 * Pressable que afunda ao toque. Mesmas props do Pressable, mas `style`
 * e um estilo comum (nao funcao): o "apertado" ja vem da mola.
 *
 *   <Pressionavel onPress={abrir} style={st.card} accessibilityRole="button">
 */
export function Pressionavel({
  style,
  escala,
  opacidade,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>
  escala?: number
  opacidade?: number
}) {
  const p = usePressionar({ escala, opacidade })
  return (
    <PressableAnimado
      {...props}
      onPressIn={(e) => {
        p.onPressIn()
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        p.onPressOut()
        onPressOut?.(e)
      }}
      // desabilitado nao afunda nem anima a opacidade: assim o estilo de
      // "desabilitado" da tela (opacidade 0.4) vale, em vez de ser coberto
      style={props.disabled ? style : [style, p.estilo]}
    />
  )
}

type Medida = { x: number; y: number; largura: number; altura: number }

/**
 * Pilula que desliza ate o item ativo (menu de baixo, abas internas).
 *
 * Cada item informa onde esta (`medir(chave)` no onLayout); a pilula,
 * posicionada no mesmo pai, anda so por translateX com mola. Na primeira
 * medida ela aparece direto no lugar, sem animar. `medida` e null ate o
 * item ativo ser medido — ate la a tela pode pintar o item como antes.
 */
export function usePilulaDeslizante(ativo: string) {
  const [medidas, setMedidas] = useState<Record<string, Medida>>({})
  const x = useSharedValue(0)
  const pronta = useSharedValue(0)
  const medida = medidas[ativo] ?? null
  const alvo = medida?.x

  useEffect(() => {
    if (alvo === undefined) return
    if (pronta.get() === 0) {
      x.set(alvo)
      pronta.set(1)
    } else {
      x.set(withSpring(alvo, molaDeslize))
    }
  }, [alvo, x, pronta])

  const estilo = useAnimatedStyle(() => ({
    opacity: pronta.get(),
    transform: [{ translateX: x.get() }],
  }))

  const medir = (chave: string) => (e: LayoutChangeEvent) => {
    const { x: mx, y, width, height } = e.nativeEvent.layout
    setMedidas((antes) => {
      const m = antes[chave]
      if (m && m.x === mx && m.y === y && m.largura === width && m.altura === height) return antes
      return { ...antes, [chave]: { x: mx, y, largura: width, altura: height } }
    })
  }

  return { medir, estilo, medida }
}
