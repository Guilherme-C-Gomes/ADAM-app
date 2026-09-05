import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip, Hero, Overline } from '@/components/ui'
import { ajustes } from '@/data/mock'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

const RITMOS = ['A cada hora', 'Diário', 'Manual'] as const

export default function Ajustes() {
  const [ritmo, setRitmo] = useState<(typeof RITMOS)[number]>('A cada hora')

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero titulo="Ajustes" subtitulo="Fonte de dados e acesso" />

      <ScrollView
        contentContainerStyle={st.conteudo}
        showsVerticalScrollIndicator={false}>
        <Overline>Fonte de dados</Overline>

        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Formulário de presença</Text>
            <View style={st.status}>
              <Text style={st.statusRotulo}>Conectado</Text>
            </View>
          </View>
          <Text style={st.nome}>{ajustes.fonte}</Text>
          <Text style={st.legenda}>{ajustes.fonteMeta}</Text>
          <Text style={st.legenda}>{ajustes.ultimaSync}</Text>

          <Pressable
            style={({ pressed }) => [st.botao, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>Sincronizar agora</Text>
          </Pressable>
        </Card>

        <Card>
          <Text style={st.cardTitulo}>Ritmo de sincronização</Text>
          <View style={st.filtros}>
            {RITMOS.map((r) => (
              <Chip key={r} rotulo={r} ativo={ritmo === r} onPress={() => setRitmo(r)} />
            ))}
          </View>
        </Card>

        <Overline>Acesso e dados</Overline>

        <Card style={st.cardLista}>
          {ajustes.acesso.map((item, i) => (
            <View
              key={item.rotulo}
              style={[st.linha, i < ajustes.acesso.length - 1 && st.linhaDivisoria]}>
              <Text style={st.linhaRotulo}>{item.rotulo}</Text>
              <Text style={st.linhaValor}>{item.valor}</Text>
            </View>
          ))}
        </Card>

        <Pressable
          onPress={() => router.replace('/login')}
          style={({ pressed }) => [st.botaoSair, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoSairRotulo}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: space.xxxl },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  nome: { ...type.body, fontFamily: 'Inter_400Regular', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  status: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(61, 214, 140, 0.12)',
  },
  statusRotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.success,
  },
  filtros: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },

  botao: {
    height: target.minimo,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoRotulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  pressed: { opacity: 0.85 },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaRotulo: {
    ...type.body,
    fontFamily: 'Inter_400Regular',
    color: color.text,
    flex: 1,
  },
  linhaValor: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  botaoSair: {
    height: target.minimo,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSairRotulo: {
    ...type.body,
    fontFamily: 'Inter_600SemiBold',
    color: onDark.text,
  },
})
