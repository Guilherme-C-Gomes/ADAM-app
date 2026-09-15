import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { registroAcessos } from '@/data/mock'
import { color, space, target, type } from '@/theme/tokens'

export default function RegistroDeAcessos() {
  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={st.topo}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space.sm}
          style={({ pressed }) => [st.botaoIcone, pressed && st.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Text style={st.icone}>‹</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <View style={st.cabecalho}>
          <Text style={st.titulo}>Registro de acessos</Text>
          <Text style={st.subtitulo}>Quem fez o quê, nos últimos 30 dias</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(300)} style={st.linha_}>
          {registroAcessos.map((r, i) => (
            <View
              key={r.id}
              style={[st.item, i < registroAcessos.length - 1 && st.itemDivisoria]}>
              <View style={st.ponto} />
              <View style={st.itemTexto}>
                <Text style={st.itemAcao}>
                  <Text style={st.itemAutor}>{r.autor} </Text>
                  {r.acao}
                </Text>
              </View>
              <Text style={st.itemQuando}>{r.quando}</Text>
            </View>
          ))}
        </Animated.View>

        <Text style={st.rodape}>Guardamos 90 dias de histórico</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  topo: {
    height: target.minimo + space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  botaoIcone: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  icone: { fontSize: 26, lineHeight: 30, color: color.text },
  pressed: { opacity: 0.85 },

  conteudo: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  cabecalho: { gap: space.xs },
  titulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  linha_: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: space.base,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: space.md,
  },
  itemDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.primaryLt,
    marginTop: 7,
  },
  itemTexto: { flex: 1 },
  itemAcao: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  itemAutor: { fontFamily: 'Inter_600SemiBold', color: color.text },
  itemQuando: {
    ...type.caption,
    fontFamily: 'Inter_400Regular',
    color: color.faint,
    marginTop: 2,
  },

  rodape: {
    ...type.caption,
    fontFamily: 'Inter_400Regular',
    color: color.faint,
    textAlign: 'center',
  },
})
