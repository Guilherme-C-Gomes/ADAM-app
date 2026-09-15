import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Overline } from '@/components/ui'
import { turmas as turmasIniciais, unidadesInfo, type Turma, type UnidadeInfo } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Unidades e turmas sao a base estrutural: treino, aula e chamada se
 * organizam por elas. Sem backend ainda, o "adicionar" so existe no
 * estado local desta tela — mas a interacao e real, para validar o
 * fluxo antes do Supabase entrar.
 */
export default function UnidadesETurmas() {
  const [unidades, setUnidades] = useState<UnidadeInfo[]>(unidadesInfo)
  const [turmas, setTurmas] = useState<Turma[]>(turmasIniciais)

  const [novaUnidadeAberta, setNovaUnidadeAberta] = useState(false)
  const [nomeUnidade, setNomeUnidade] = useState('')
  const [enderecoUnidade, setEnderecoUnidade] = useState('')

  const [novaTurmaAberta, setNovaTurmaAberta] = useState(false)
  const [nomeTurma, setNomeTurma] = useState('')
  const [faixaTurma, setFaixaTurma] = useState('')
  const [horarioTurma, setHorarioTurma] = useState('')

  const salvarUnidade = () => {
    if (!nomeUnidade.trim()) return
    setUnidades((atual) => [
      ...atual,
      {
        nome: nomeUnidade.trim() as UnidadeInfo['nome'],
        nomeCompleto: nomeUnidade.trim(),
        endereco: enderecoUnidade.trim() || 'Endereço a definir',
        criancas: 0,
      },
    ])
    setNomeUnidade('')
    setEnderecoUnidade('')
    setNovaUnidadeAberta(false)
  }

  const salvarTurma = () => {
    if (!nomeTurma.trim()) return
    setTurmas((atual) => [
      ...atual,
      {
        id: String(atual.length + 1),
        nome: nomeTurma.trim(),
        faixaEtaria: faixaTurma.trim() || 'Faixa a definir',
        horarios: horarioTurma
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean),
      },
    ])
    setNomeTurma('')
    setFaixaTurma('')
    setHorarioTurma('')
    setNovaTurmaAberta(false)
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
          <Text style={st.titulo}>Unidades e turmas</Text>
          <Text style={st.subtitulo}>Valem para treino, aula e chamada</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
          <Overline>Unidades</Overline>
          <Card style={st.cardLista}>
            {unidades.map((u, i) => (
              <View
                key={u.nome}
                style={[st.linha, i < unidades.length - 1 && st.linhaDivisoria]}>
                <View style={st.linhaTexto}>
                  <Text style={st.linhaNome}>{u.nomeCompleto}</Text>
                  <Text style={st.linhaMeta}>
                    {u.endereco} · {u.criancas} crianças
                  </Text>
                </View>
                <Text style={st.chevron}>›</Text>
              </View>
            ))}
          </Card>

          {novaUnidadeAberta ? (
            <Card style={st.form}>
              <TextInput
                style={st.input}
                value={nomeUnidade}
                onChangeText={setNomeUnidade}
                placeholder="Nome da unidade"
                placeholderTextColor={color.faint}
              />
              <TextInput
                style={st.input}
                value={enderecoUnidade}
                onChangeText={setEnderecoUnidade}
                placeholder="Endereço"
                placeholderTextColor={color.faint}
              />
              <View style={st.formBotoes}>
                <Pressable
                  onPress={() => setNovaUnidadeAberta(false)}
                  style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
                  accessibilityRole="button">
                  <Text style={st.botaoSecundarioRotulo}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={salvarUnidade}
                  disabled={!nomeUnidade.trim()}
                  style={({ pressed }) => [
                    st.botao,
                    pressed && st.pressed,
                    !nomeUnidade.trim() && st.botaoDesabilitado,
                  ]}
                  accessibilityRole="button">
                  <Text style={st.botaoRotulo}>Salvar</Text>
                </Pressable>
              </View>
            </Card>
          ) : (
            <Pressable
              onPress={() => setNovaUnidadeAberta(true)}
              hitSlop={space.sm}
              accessibilityRole="button">
              <Text style={st.link}>Adicionar unidade</Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(motion.medium).delay(40)}
          style={st.secao}>
          <Overline>Turmas</Overline>
          <Card style={st.cardLista}>
            {turmas.map((t, i) => (
              <View key={t.id} style={[st.linha, i < turmas.length - 1 && st.linhaDivisoria]}>
                <View style={st.linhaTexto}>
                  <Text style={st.linhaNome}>{t.nome}</Text>
                  <Text style={st.linhaMeta}>
                    {t.faixaEtaria} · {t.horarios.join(' · ')}
                  </Text>
                </View>
                <Text style={st.chevron}>›</Text>
              </View>
            ))}
          </Card>

          {novaTurmaAberta ? (
            <Card style={st.form}>
              <TextInput
                style={st.input}
                value={nomeTurma}
                onChangeText={setNomeTurma}
                placeholder="Nome da turma"
                placeholderTextColor={color.faint}
              />
              <TextInput
                style={st.input}
                value={faixaTurma}
                onChangeText={setFaixaTurma}
                placeholder="Faixa etária (ex: 7 a 11 anos)"
                placeholderTextColor={color.faint}
              />
              <TextInput
                style={st.input}
                value={horarioTurma}
                onChangeText={setHorarioTurma}
                placeholder="Horários, separados por vírgula"
                placeholderTextColor={color.faint}
              />
              <View style={st.formBotoes}>
                <Pressable
                  onPress={() => setNovaTurmaAberta(false)}
                  style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
                  accessibilityRole="button">
                  <Text style={st.botaoSecundarioRotulo}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={salvarTurma}
                  disabled={!nomeTurma.trim()}
                  style={({ pressed }) => [
                    st.botao,
                    pressed && st.pressed,
                    !nomeTurma.trim() && st.botaoDesabilitado,
                  ]}
                  accessibilityRole="button">
                  <Text style={st.botaoRotulo}>Salvar</Text>
                </Pressable>
              </View>
            </Card>
          ) : (
            <Pressable
              onPress={() => setNovaTurmaAberta(true)}
              hitSlop={space.sm}
              accessibilityRole="button">
              <Text style={st.link}>Adicionar turma</Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Card style={st.aviso}>
            <Text style={st.avisoIcone}>↻</Text>
            <View style={st.avisoTexto}>
              <Text style={st.avisoTitulo}>Mudar o horário muda a escala</Text>
              <Text style={st.linhaMeta}>Os treinos já marcados continuam como estão.</Text>
            </View>
          </Card>
        </Animated.View>
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

  conteudo: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },
  cabecalho: { gap: space.xs },
  titulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  secao: { gap: space.md },
  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  chevron: { ...type.body, color: color.faint },

  link: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: onDark.text,
  },

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

  aviso: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  avisoIcone: { ...type.body, color: color.primaryLt, width: 20, textAlign: 'center' },
  avisoTexto: { flex: 1, gap: space.xs },
  avisoTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
