import { router } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { color, motion, space, type } from '@/theme/tokens'

/**
 * Splash do ADAM.
 *
 * Reproduz a sequencia observada no prototipo do Figma: o simbolo nasce,
 * o wordmark entra em seguida, os textos de apoio aparecem e a barra de
 * progresso corre ate o fim, quando a tela cede para o login.
 *
 * Todas as animacoes usam apenas `opacity` e `transform`, que rodam na
 * thread de UI sem passar pela ponte JS.
 */

const SYMBOL_SIZE = 56
const WORDMARK_SIZE = 40
const PROGRESS_WIDTH = 120
const PROGRESS_HEIGHT = 3

// A barra corre por toda a sequencia; a saida espera ela terminar.
const PROGRESS_DURATION = 1800
const EXIT_DELAY = PROGRESS_DURATION + motion.medium

const enter = { duration: motion.medium, easing: Easing.out(Easing.cubic) }

export default function Splash() {
  const symbol = useSharedValue(0)
  const wordmark = useSharedValue(0)
  const tagline = useSharedValue(0)
  const progress = useSharedValue(0)

  useEffect(() => {
    symbol.set(withDelay(motion.instant, withTiming(1, enter)))
    wordmark.set(withDelay(motion.slow, withTiming(1, enter)))
    tagline.set(withDelay(motion.slow + motion.medium, withTiming(1, enter)))
    progress.set(
      withTiming(1, {
        duration: PROGRESS_DURATION,
        easing: Easing.inOut(Easing.quad),
      }),
    )

    const id = setTimeout(() => router.replace('/login'), EXIT_DELAY)
    return () => clearTimeout(id)
  }, [symbol, wordmark, tagline, progress])

  const symbolStyle = useAnimatedStyle(() => ({
    opacity: symbol.get(),
    transform: [{ scale: 0.82 + symbol.get() * 0.18 }],
  }))

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.get(),
    // Entra deslizando a partir do simbolo, como no prototipo.
    transform: [{ translateX: (1 - wordmark.get()) * -16 }],
  }))

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.get(),
    transform: [{ translateY: (1 - tagline.get()) * 8 }],
  }))

  // translateX em vez de largura: largura reflowaria a cada quadro.
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -PROGRESS_WIDTH * (1 - progress.get()) }],
  }))

  const footerStyle = useAnimatedStyle(() => ({ opacity: tagline.get() }))

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />

      <View style={styles.center}>
        <View style={styles.markRow}>
          <Animated.View style={symbolStyle}>
            <AdamSymbol size={SYMBOL_SIZE} />
          </Animated.View>
          <Animated.View style={wordmarkStyle}>
            <AdamWordmark fontSize={WORDMARK_SIZE} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Painel da coordenação
        </Animated.Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <Animated.Text style={[styles.footer, footerStyle]}>
        ONG de utilidade pública
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage: `radial-gradient(50% 35% at 50% 45%, ${color.primaryDk} 0%, ${color.bg} 100%)`,
  },
  center: {
    alignItems: 'center',
    gap: space.base,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  tagline: {
    ...type.body,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 144,
    width: PROGRESS_WIDTH,
    height: PROGRESS_HEIGHT,
    borderRadius: PROGRESS_HEIGHT,
    borderCurve: 'continuous',
    backgroundColor: color.border,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: color.primary,
  },
  footer: {
    position: 'absolute',
    bottom: space.xxl,
    ...type.caption,
    fontFamily: 'Inter_400Regular',
    color: color.faint,
  },
})
