import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui'
import { contaAtual } from '@/data/mock'
import { color, radius, space, target, type } from '@/theme/tokens'

export default function MinhaConta() {
  const [nome, setNome] = useState(contaAtual.nome)
  const [linkEnviado, setLinkEnviado] = useState(false)

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
          <Text style={st.titulo}>Minha conta</Text>
          <Text style={st.subtitulo}>{contaAtual.email}</Text>
        </View>

        <View style={st.perfil}>
          <Avatar iniciais={contaAtual.iniciais} size={72} />
          <Text style={st.perfilNome}>{contaAtual.nome}</Text>
        </View>

        <View style={st.campo}>
          <Text style={st.rotulo}>Nome</Text>
          <TextInput
            style={st.input}
            value={nome}
            onChangeText={setNome}
            placeholderTextColor={color.faint}
          />
        </View>

        <View style={st.campo}>
          <Text style={st.rotulo}>E-mail</Text>
          <TextInput
            style={[st.input, st.inputDesabilitado]}
            value={contaAtual.email}
            editable={false}
          />
        </View>

        <Pressable
          onPress={() => setLinkEnviado(true)}
          style={({ pressed }) => [st.linha, pressed && st.pressed]}
          accessibilityRole="button">
          <View style={st.linhaTexto}>
            <Text style={st.linhaTitulo}>Trocar senha</Text>
            <Text style={st.legenda}>
              {linkEnviado
                ? `Link enviado para ${contaAtual.email}`
                : 'Você recebe um link por e-mail'}
            </Text>
          </View>
          <Text style={st.chevron}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/login')}
          style={({ pressed }) => [st.linha, st.linhaPerigo, pressed && st.pressed]}
          accessibilityRole="button">
          <View style={st.linhaTexto}>
            <Text style={[st.linhaTitulo, st.corPerigo]}>Sair da conta</Text>
            <Text style={st.legenda}>Neste aparelho</Text>
          </View>
          <Text style={st.chevron}>›</Text>
        </Pressable>

        <Text style={st.rodape}>ADAM Admin · versão 2026.09</Text>
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

  conteudo: { padding: space.lg, gap: space.base, paddingBottom: space.xxxl },
  cabecalho: { gap: space.xs, marginBottom: space.sm },
  titulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  perfil: { alignItems: 'center', gap: space.sm, paddingVertical: space.base },
  perfilNome: { ...type.h2, fontFamily: 'Inter_600SemiBold', color: color.text },

  campo: { gap: space.sm },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  inputDesabilitado: { color: color.muted },

  linha: {
    minHeight: target.minimo + 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linhaPerigo: { borderColor: 'rgba(255, 122, 181, 0.35)' },
  linhaTexto: { gap: 2 },
  linhaTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  corPerigo: { color: color.danger },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  chevron: { ...type.body, color: color.faint },

  rodape: {
    ...type.caption,
    fontFamily: 'Inter_400Regular',
    color: color.faint,
    textAlign: 'center',
    marginTop: space.base,
  },
})
