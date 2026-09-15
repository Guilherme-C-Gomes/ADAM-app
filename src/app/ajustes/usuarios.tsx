import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Chip } from '@/components/ui'
import { usuarios as usuariosIniciais, type PapelUsuario, type Usuario } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

const PAPEIS: PapelUsuario[] = ['Treinador', 'Professor', 'Secretaria', 'Administrador']

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/)
  return (partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciais)
  const [busca, setBusca] = useState('')

  const [novoAberto, setNovoAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<PapelUsuario>('Treinador')

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo ? usuarios.filter((u) => u.nome.toLowerCase().includes(termo)) : usuarios
  }, [usuarios, busca])

  const salvar = () => {
    if (!nome.trim() || !email.trim()) return
    setUsuarios((atual) => [
      ...atual,
      { id: String(atual.length + 1), nome: nome.trim(), email: email.trim(), papel },
    ])
    setNome('')
    setEmail('')
    setPapel('Treinador')
    setNovoAberto(false)
  }

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
          <Text style={st.titulo}>Usuários</Text>
          <Text style={st.subtitulo}>
            {usuarios.length} pessoas com acesso · só o administrador edita
          </Text>
        </View>

        <TextInput
          style={st.busca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar pessoa"
          placeholderTextColor={color.faint}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card style={st.cardLista}>
          {lista.map((u, i) => (
            <View key={u.id} style={[st.linha, i < lista.length - 1 && st.linhaDivisoria]}>
              <Avatar iniciais={iniciaisDe(u.nome)} size={36} />
              <View style={st.linhaTexto}>
                <Text style={st.linhaNome}>{u.nome}</Text>
                <Text style={st.linhaMeta}>{u.email}</Text>
              </View>
              <View style={st.selo}>
                <Text style={st.seloRotulo}>{u.papel}</Text>
              </View>
            </View>
          ))}
        </Card>
        </Animated.View>

        {novoAberto ? (
          <Card style={st.form}>
            <TextInput
              style={st.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome"
              placeholderTextColor={color.faint}
            />
            <TextInput
              style={st.input}
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor={color.faint}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={st.chipsLinha}>
              {PAPEIS.map((p) => (
                <Chip key={p} rotulo={p} ativo={papel === p} onPress={() => setPapel(p)} />
              ))}
            </View>
            <View style={st.formBotoes}>
              <Pressable
                onPress={() => setNovoAberto(false)}
                style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
                accessibilityRole="button">
                <Text style={st.botaoSecundarioRotulo}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={salvar}
                disabled={!nome.trim() || !email.trim()}
                style={({ pressed }) => [
                  st.botao,
                  pressed && st.pressed,
                  (!nome.trim() || !email.trim()) && st.botaoDesabilitado,
                ]}
                accessibilityRole="button">
                <Text style={st.botaoRotulo}>Enviar convite</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <Pressable
            onPress={() => setNovoAberto(true)}
            style={({ pressed }) => [st.botaoCheio, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoCheioRotulo}>Adicionar usuário</Text>
          </Pressable>
        )}
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
  cabecalho: { gap: space.xs },
  titulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  busca: {
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

  form: { gap: space.md },
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
  chipsLinha: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  formBotoes: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },

  botao: {
    height: target.minimo,
    paddingHorizontal: space.lg,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.4 },
  botaoRotulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  botaoSecundario: {
    height: target.minimo,
    paddingHorizontal: space.lg,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundarioRotulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted },

  botaoCheio: {
    height: target.minimo + 8,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCheioRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
