import { useEffect } from 'react'
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { color, radius, space } from '@/theme/tokens'

/**
 * Bloco de carregamento com brilho varrendo.
 *
 * A varredura anda por translateX dentro de um container que corta o
 * excesso, entao a animacao e so transform e roda na thread de UI. Um
 * unico relogio compartilhado seria mais barato, mas cada bloco aqui e
 * pequeno e a tela some assim que os dados chegam.
 */
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
  const brilho = useSharedValue(0)

  useEffect(() => {
    brilho.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    )
  }, [brilho])

  const varreduraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-100 + brilho.value * 200}%` }],
  }))

  return (
    <View
      style={[
        s.bloco,
        { width, height, borderRadius: rounded },
        style,
      ]}>
      <Animated.View style={[s.varredura, varreduraStyle]} />
    </View>
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

const s = StyleSheet.create({
  bloco: {
    backgroundColor: color.skeleton,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  varredura: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage: `linear-gradient(90deg, transparent 0%, ${color.surface2} 50%, transparent 100%)`,
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
})

