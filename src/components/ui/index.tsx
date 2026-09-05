import { memo } from 'react'
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

/** Cabecalho das telas internas: marca, titulo e subtitulo sobre o brilho. */
export function Hero({
  titulo,
  subtitulo,
  perfil,
}: {
  titulo: string
  subtitulo: string
  perfil?: string
}) {
  return (
    <View style={s.hero}>
      <View style={s.heroTopo}>
        <View style={s.markRow}>
          <AdamSymbol size={22} />
          <AdamWordmark fontSize={16} />
        </View>
        {perfil ? (
          <View style={s.perfil}>
            <View style={s.perfilAvatar}>
              <Text style={s.perfilInicial}>{perfil.charAt(0)}</Text>
            </View>
            <Text style={s.perfilRotulo}>{perfil}</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.heroTitulo}>{titulo}</Text>
      <Text style={s.heroSubtitulo}>{subtitulo}</Text>
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

export function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  return <View style={[s.card, style]}>{children}</View>
}

export function Overline({ children }: { children: string }) {
  return <Text style={s.overline}>{children}</Text>
}

/** Barra horizontal de proporcao. `pct` de 0 a 100. */
export function Barra({ pct, cor = onDark.fill }: { pct: number; cor?: string }) {
  return (
    <View style={s.barraTrilho}>
      <View style={[s.barraFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: cor }]} />
    </View>
  )
}

export function Avatar({ iniciais, size = 42 }: { iniciais: string; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={s.avatarIniciais}>{iniciais}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    gap: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
    backgroundColor: color.surface,
  },
  heroTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  perfilAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilInicial: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.text },
  perfilRotulo: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  heroTitulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  heroSubtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

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
  chipRotuloAtivo: { fontFamily: 'Inter_600SemiBold', color: color.text },
  pressed: { opacity: 0.85 },

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

  barraTrilho: {
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    overflow: 'hidden',
  },
  barraFill: { height: '100%', borderRadius: 4 },

  avatar: {
    backgroundColor: color.primaryDk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIniciais: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },
})
