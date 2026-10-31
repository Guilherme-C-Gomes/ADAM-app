import { Image } from 'expo-image'
import { memo, useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { Icone, type NomeIcone } from '@/components/ui/icone'
import { NumeroAnimado } from '@/components/ui/movimento'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

const CirculoAnimado = Animated.createAnimatedComponent(Circle)

/** Cabecalho das telas internas: titulo, subtitulo e uma acao opcional. */
export function Hero({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string
  subtitulo: string
  acao?: { icone: NomeIcone; rotulo: string; onPress: () => void }
}) {
  return (
    <View style={s.hero}>
      <View style={s.heroTopo}>
        <View style={s.heroTextos}>
          <Text style={s.heroTitulo}>{titulo}</Text>
          <Text style={s.heroSubtitulo}>{subtitulo}</Text>
        </View>
        {acao ? (
          <Pressable
            onPress={acao.onPress}
            hitSlop={space.sm}
            style={({ pressed }) => [s.heroAcao, pressed && s.pressedFraco]}
            accessibilityRole="button"
            accessibilityLabel={acao.rotulo}>
            <Icone nome={acao.icone} cor={color.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

/** Filtro em pilula. Ativo ganha o roxo cheio; inativo fica na superficie. */
export const Chip = memo(function Chip({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string
  ativo: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.chip, ativo && s.chipAtivo, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}>
      <Text style={[s.chipRotulo, ativo && s.chipRotuloAtivo]}>{rotulo}</Text>
    </Pressable>
  )
})

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>
}

export function Overline({ children }: { children: string }) {
  return <Text style={s.overline}>{children}</Text>
}

/**
 * Barra horizontal de proporcao. `pct` de 0 a 100.
 *
 * Cresce da esquerda quando entra (de 0) e anda do valor antigo ao novo
 * quando muda (600ms, expoOut). O preenchimento tem a largura do trilho
 * e desliza por translateX — sem animar width, que recalcula o layout a
 * cada quadro, e sem achatar a ponta arredondada como faria um scaleX.
 */
export function Barra({ pct, cor = onDark.fill }: { pct: number; cor?: string }) {
  const alvo = Math.min(100, Math.max(0, pct))
  const valor = useAnimarAte(alvo)

  const animado = useAnimatedStyle(() => ({
    transform: [{ translateX: `${valor.get() - 100}%` }],
  }))

  return (
    <View style={s.barraTrilho}>
      <Animated.View style={[s.barraFill, { backgroundColor: cor }, animado]} />
    </View>
  )
}

/**
 * Valor compartilhado que vai de 0 ate `alvo` na entrada (com um respiro
 * de 120ms) e do valor atual ao novo quando `alvo` muda.
 */
function useAnimarAte(alvo: number, duracao = 600) {
  const valor = useSharedValue(0)
  const montado = useRef(false)

  useEffect(() => {
    const curva = {
      duration: duracao,
      easing: motion.expoOut,
      reduceMotion: ReduceMotion.System,
    }
    valor.set(montado.current ? withTiming(alvo, curva) : withDelay(120, withTiming(alvo, curva)))
    montado.current = true
  }, [alvo, duracao, valor])

  return valor
}

/**
 * Numero que sobe de 0 ate o valor quando entra na tela e conta do valor
 * antigo ao novo quando muda, acendendo em roxo (600ms).
 */
export function Contador({
  valor,
  sufixo = '',
  style,
}: {
  valor: number
  sufixo?: string
  style?: TextStyle | TextStyle[]
}) {
  return <NumeroAnimado valor={valor} formato={(n) => `${Math.round(n)}${sufixo}`} style={style} />
}

/** Anel de progresso (tela 04 do Figma: "Presença no último treino"). */
export function Anel({
  pct,
  size = 56,
  espessura = 6,
  cor = color.success,
}: {
  pct: number
  size?: number
  espessura?: number
  cor?: string
}) {
  const raio = (size - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const preenchido = Math.min(100, Math.max(0, pct))
  const valor = useAnimarAte(preenchido, 800)

  // O traco corre do circulo vazio (ou do valor antigo) ate o valor.
  const tracoAnimado = useAnimatedProps(() => ({
    strokeDashoffset: circunferencia * (1 - valor.get() / 100),
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={raio}
          stroke={color.surface2}
          strokeWidth={espessura}
          fill="none"
        />
        <CirculoAnimado
          cx={size / 2}
          cy={size / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          fill="none"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          animatedProps={tracoAnimado}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={s.anelCentro}>
          <Contador valor={preenchido} sufixo="%" style={s.anelValor} />
        </View>
      </View>
    </View>
  )
}

/** Iniciais no circulo; com foto, a foto cobre o circulo inteiro. */
export function Avatar({
  iniciais,
  size = 42,
  foto,
}: {
  iniciais: string
  size?: number
  foto?: string | null
}) {
  const forma = { width: size, height: size, borderRadius: size / 2 }
  return (
    <View style={[s.avatar, forma]}>
      {foto ? (
        <Image source={{ uri: foto }} style={forma} contentFit="cover" transition={150} />
      ) : (
        <Text style={s.avatarIniciais}>{iniciais}</Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
    backgroundColor: color.surface,
  },
  heroTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  heroTextos: { flex: 1, gap: space.xs },
  heroTitulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  heroSubtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  heroAcao: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
  },
  pressedFraco: { opacity: 0.85 },

  chip: {
    minHeight: target.minimo,
    justifyContent: 'center',
    paddingHorizontal: space.base,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  chipAtivo: { backgroundColor: onDark.fill },
  chipRotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  chipRotuloAtivo: { fontFamily: 'Inter_600SemiBold', color: color.onPrimary },
  // Feedback de toque do design: escala 0.97 junto da opacidade.
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },

  card: {
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    gap: space.md,
  },
  overline: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  anelCentro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  anelValor: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.text },

  barraTrilho: {
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    overflow: 'hidden',
  },
  // Largura do trilho; quanto aparece e decidido pelo translateX.
  barraFill: { width: '100%', height: '100%', borderRadius: 4 },

  avatar: {
    overflow: 'hidden',
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIniciais: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.onPrimary },
})
