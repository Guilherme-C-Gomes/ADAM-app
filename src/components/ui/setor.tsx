import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { contaAtual } from '@/data/mock'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Cabecalho de tela de setor: marca, perfil, titulo e subtitulo.
 *
 * O perfil e a porta para Ajustes — e a unica, ja que Ajustes saiu da
 * barra inferior. A marca volta para a Home.
 */
export function HeroSetor({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <View style={s.hero}>
      <View style={s.topo}>
        <Pressable
          onPress={() => router.push('/inicio')}
          style={({ pressed }) => [s.marca, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Ir para o início">
          <AdamSymbol size={22} />
          <AdamWordmark fontSize={16} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/ajustes')}
          style={({ pressed }) => [s.pill, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Abrir ajustes">
          <View style={s.pillAvatar}>
            <Text style={s.pillInicial}>{contaAtual.iniciais.charAt(0)}</Text>
          </View>
          <Text style={s.pillRotulo}>{contaAtual.papel}</Text>
        </Pressable>
      </View>

      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.subtitulo}>{subtitulo}</Text>
    </View>
  )
}

/** Cabecalho de tela empilhada: voltar, titulo e subtitulo. */
export function HeroVoltar({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string
  subtitulo: string
  acao?: { icone: string; rotulo: string; onPress: () => void }
}) {
  return (
    <View style={s.hero}>
      <View style={s.topo}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space.sm}
          style={({ pressed }) => [s.voltar, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Text style={s.voltarIcone}>‹</Text>
        </Pressable>

        {acao ? (
          <Pressable
            onPress={acao.onPress}
            hitSlop={space.sm}
            style={({ pressed }) => [s.voltar, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={acao.rotulo}>
            <Text style={s.voltarIcone}>{acao.icone}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.subtitulo}>{subtitulo}</Text>
    </View>
  )
}

/** Abas internas de um setor (Treinos · Jogos · Escala). */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: readonly T[]
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <View style={s.segmentado}>
      {opcoes.map((o) => {
        const ativo = o === valor
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={({ pressed }) => [s.segmento, ativo && s.segmentoAtivo, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}>
            <Text style={[s.segmentoRotulo, ativo && s.segmentoRotuloAtivo]}>{o}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    gap: space.xs,
    backgroundColor: color.surface,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: target.minimo },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  pillAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInicial: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.text },
  pillRotulo: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  titulo: { ...type.h1, fontFamily: 'Inter_700Bold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  // Feedback de toque do design: escala 0.97 junto da opacidade.
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },

  voltar: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
  },
  voltarIcone: { fontSize: 24, lineHeight: 28, color: color.text },

  segmentado: {
    flexDirection: 'row',
    padding: space.xs,
    borderRadius: radius.chip + space.xs,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  segmento: {
    flex: 1,
    minHeight: target.minimo - space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  segmentoAtivo: { backgroundColor: onDark.fill },
  segmentoRotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  segmentoRotuloAtivo: { fontFamily: 'Inter_600SemiBold', color: color.text },
})
