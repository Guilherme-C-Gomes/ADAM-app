import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { AdamSymbol } from '@/components/brand/adam-mark'
import { Card } from '@/components/ui'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Estado vazio (tela 08 do Figma).
 *
 * A ilustracao usa o simbolo da marca esmaecido: o kit nao traz o
 * desenho de 152x152 do Figma, e um simbolo apagado comunica ausencia
 * melhor do que um espaco em branco.
 */
export function EstadoVazio({
  titulo,
  linhas,
  acao,
  dica,
}: {
  titulo: string
  linhas: string[]
  acao?: { rotulo: string; onPress: () => void }
  dica?: string
}) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.medium)} style={s.vazio}>
      <View style={s.ilustracao}>
        <AdamSymbol size={72} />
      </View>

      <Text style={s.vazioTitulo}>{titulo}</Text>
      <View style={s.vazioLinhas}>
        {linhas.map((l) => (
          <Text key={l} style={s.vazioTexto}>
            {l}
          </Text>
        ))}
      </View>

      {acao ? (
        <Pressable
          onPress={acao.onPress}
          style={({ pressed }) => [s.botaoCheio, pressed && s.pressed]}
          accessibilityRole="button">
          <Text style={s.botaoCheioRotulo}>{acao.rotulo}</Text>
        </Pressable>
      ) : null}

      {dica ? (
        <Card style={s.cardDica}>
          <Text style={s.dicaTexto}>{dica}</Text>
        </Card>
      ) : null}
    </Animated.View>
  )
}

/**
 * Sem conexão (tela 09 do Figma).
 *
 * Home e chamada seguem "offline-first": o que a equipe registra fica
 * na fila do aparelho e sobe sozinho quando a internet voltar. Nada
 * trava a demonstração — dá pra continuar navegando.
 */
export function BannerOffline({
  chamadas,
  registros,
  motivos,
  onTentar,
}: {
  chamadas: number
  registros: number
  motivos: string[]
  onTentar: () => void
}) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.medium)} style={s.grupo}>
      <Card style={s.cardErro}>
        <View style={s.acento} />
        <Text style={s.erroTitulo}>Sem conexão</Text>
        <Text style={s.legenda}>
          O que você registrar fica salvo no aparelho e sobe quando a internet voltar.
        </Text>
        <Pressable
          onPress={onTentar}
          style={({ pressed }) => [s.botao, pressed && s.pressed]}
          accessibilityRole="button">
          <Text style={s.botaoRotulo}>Tentar de novo</Text>
        </Pressable>
      </Card>

      <Card>
        <View style={s.selo}>
          <Text style={s.seloRotulo}>{chamadas} chamadas na fila</Text>
        </View>
        <View style={s.valorLinha}>
          <Text style={s.valor}>{registros}</Text>
          <Text style={s.legenda}>registros esperando</Text>
        </View>
        <Text style={s.legenda}>Nada se perde: eles sobem sozinhos</Text>
      </Card>

      <Card>
        <Text style={s.cardTitulo}>O que costuma ser</Text>
        {motivos.map((item) => (
          <View key={item} style={s.itemLinha}>
            <View style={s.ponto} />
            <Text style={s.legenda}>{item}</Text>
          </View>
        ))}
      </Card>

      <Pressable
        onPress={onTentar}
        style={({ pressed }) => [s.botaoCheio, pressed && s.pressed]}
        accessibilityRole="button">
        <Text style={s.botaoCheioRotulo}>Tentar enviar agora</Text>
      </Pressable>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  grupo: { gap: space.base },

  vazio: { alignItems: 'center', paddingTop: space.xl, gap: space.base },
  ilustracao: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    opacity: 0.5,
  },
  vazioTitulo: { ...type.h2, fontFamily: 'Inter_600SemiBold', color: color.text },
  vazioLinhas: { gap: space.xs, paddingHorizontal: space.base },
  vazioTexto: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    textAlign: 'center',
  },
  cardDica: { alignSelf: 'stretch', marginTop: space.sm },
  dicaTexto: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.faint,
    textAlign: 'center',
  },

  cardErro: { paddingLeft: space.lg, overflow: 'hidden' },
  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: color.danger,
  },
  erroTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, flex: 1 },

  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(245, 165, 36, 0.14)',
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.warn },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },

  itemLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.faint },

  botao: {
    alignSelf: 'flex-start',
    height: target.minimo,
    paddingHorizontal: space.lg,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoRotulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },

  botaoCheio: {
    alignSelf: 'stretch',
    height: target.minimo + 8,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCheioRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.onPrimary },
  // Feedback de toque do design: escala 0.97 junto da opacidade.
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
})
