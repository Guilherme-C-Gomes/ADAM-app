import { useEffect, useId } from 'react'
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido'
import { color, radius, space, target } from '@/theme/tokens'

/**
 * Bloco de carregamento com brilho varrendo (tela 03 do Figma).
 *
 * O brilho e uma faixa branca a 9% em degrade SVG — SVG porque roda
 * igual no Expo Go e na web, sem depender de backgroundImage. Anda so
 * por translateX, entao fica na thread de UI.
 *
 * Com movimento reduzido a faixa nao varre: o bloco so pulsa em
 * opacidade, que mantem o sinal de "carregando" sem deslocamento.
 */
const DURACAO_BRILHO = 1200

export function Skeleton({
  width = '100%',
  height = 14,
  rounded = 8,
  style,
}: {
  width?: DimensionValue
  height?: number
  rounded?: number
  style?: ViewStyle
}) {
  const reduzido = useMovimentoReduzido()
  const brilho = useSharedValue(0)
  // id unico por bloco: na web todos os SVGs dividem o mesmo documento
  const idGradiente = `brilho${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    brilho.set(
      withRepeat(
        withTiming(1, {
          duration: reduzido ? 800 : DURACAO_BRILHO,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        reduzido,
      ),
    )
  }, [brilho, reduzido])

  const varredura = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-100 + brilho.get() * 200}%` }],
  }))

  const pulso = useAnimatedStyle(() => ({ opacity: 0.55 + brilho.get() * 0.45 }))

  return (
    <Animated.View
      style={[s.bloco, { width, height, borderRadius: rounded }, style, reduzido && pulso]}>
      {reduzido ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, varredura]}>
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={idGradiente} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.09} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${idGradiente})`} />
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  )
}

/**
 * Envolve o esqueleto de uma tela. Sai em 200ms quando os dados chegam,
 * enquanto os cards de verdade entram — e a troca que o design pede em
 * vez de piscar.
 */
export function Esqueleto({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(200)}
      style={s.grupo}>
      {children}
    </Animated.View>
  )
}

/** Esqueleto de um card, espelhando o card real de mesma altura. */
export function SkeletonCard({ altura = 140 }: { altura?: number }) {
  return (
    <View style={[s.card, { minHeight: altura }]}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="35%" height={30} rounded={10} />
      <Skeleton height={8} rounded={4} />
      <Skeleton width="45%" height={12} />
    </View>
  )
}

/** Esqueleto de card de lista com N linhas (treinos, escala, usuarios). */
export function SkeletonLista({ linhas = 3 }: { linhas?: number }) {
  return (
    <View style={s.cardLista}>
      {Array.from({ length: linhas }, (_, i) => (
        <View key={i} style={[s.linhaLista, i < linhas - 1 && s.divisoria]}>
          <View style={s.linhaTexto}>
            <Skeleton width="50%" height={14} />
            <Skeleton width="70%" height={12} />
          </View>
          <Skeleton width={44} height={24} rounded={12} />
        </View>
      ))}
    </View>
  )
}

/** Esqueleto de uma linha da lista de participantes. */
export function SkeletonLinha() {
  return (
    <View style={s.linha}>
      <Skeleton width={42} height={42} rounded={21} />
      <View style={s.linhaTexto}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={12} />
      </View>
      <Skeleton width={56} height={32} rounded={16} />
    </View>
  )
}

/** Fileira de chips de filtro. */
export function SkeletonChips({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <View style={s.chips}>
      {Array.from({ length: quantidade }, (_, i) => (
        <Skeleton key={i} width={i === 0 ? 72 : 88} height={target.minimo} rounded={radius.chip} />
      ))}
    </View>
  )
}

/** Campo de busca ou abas segmentadas: uma faixa da largura toda. */
export function SkeletonFaixa({ altura = 48 }: { altura?: number }) {
  return <Skeleton height={altura} rounded={radius.campo} />
}

const s = StyleSheet.create({
  grupo: { gap: space.base },
  bloco: {
    backgroundColor: color.skeleton,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  card: {
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    gap: space.md,
    justifyContent: 'center',
  },
  cardLista: {
    paddingHorizontal: space.base,
    paddingVertical: space.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linhaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 72,
    paddingHorizontal: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linhaTexto: { flex: 1, gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
})
