import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { treinos } from '@/data/jogo'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11m. Nada aqui e obrigatorio (R8): existe "Pular por agora", e
 * resposta arrancada a forca vira 3 em tudo e nao serve para nada.
 *
 * Cada escala leva a legenda das duas pontas porque dificuldade alta
 * nao e nota ruim, e informacao para calibrar o proximo treino (R9).
 */
const ESCALA = [0, 1, 2, 3, 4, 5] as const

export default function TreinoAvaliacao() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const treino = treinos.find((t) => t.id === id)

  const [notaTreino, setNotaTreino] = useState<number | null>(null)
  const [notaCompreensao, setNotaCompreensao] = useState<number | null>(null)
  const [notaDificuldade, setNotaDificuldade] = useState<number | null>(null)
  const [observacoes, setObservacoes] = useState('')

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Como foi o treino?"
        subtitulo={
          treino ? `${treino.turma} · ${treino.data} · ${treino.hora}` : 'Avaliação do treino'
        }
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
          <Overline>Como foi o treino</Overline>
          <Escala valor={notaTreino} onChange={setNotaTreino} min="fraco" max="ótimo" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Eles entenderam o exercício</Overline>
          <Escala valor={notaCompreensao} onChange={setNotaCompreensao} min="nada" max="tudo" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)} style={st.secao}>
          <Overline>Dificuldade para eles</Overline>
          <Escala valor={notaDificuldade} onChange={setNotaDificuldade} min="fácil" max="difícil" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)} style={st.secao}>
          <Overline>Observações</Overline>
          <TextInput
            style={st.campo}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="O que vale lembrar para o próximo treino"
            placeholderTextColor={color.faint}
            multiline
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(160)} style={st.fim}>
          <Pressable
            onPress={() => router.dismissTo('/jogo')}
            style={({ pressed }) => [st.botao, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>Salvar avaliação</Text>
          </Pressable>

          <Pressable
            onPress={() => router.dismissTo('/jogo')}
            hitSlop={space.sm}
            accessibilityRole="button">
            <Text style={st.link}>Pular por agora</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Escala({
  valor,
  onChange,
  min,
  max,
}: {
  valor: number | null
  onChange: (v: number) => void
  min: string
  max: string
}) {
  return (
    <View style={st.escalaBloco}>
      <View style={st.escalaLinha}>
        {ESCALA.map((n) => {
          const ativo = valor === n
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={({ pressed }) => [st.alvo, ativo && st.alvoAtivo, pressed && st.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Nota ${n}`}>
              <Text style={[st.alvoRotulo, ativo && st.alvoRotuloAtivo]}>{n}</Text>
            </Pressable>
          )
        })}
      </View>
      <View style={st.pontas}>
        <Text style={st.ponta}>{min}</Text>
        <Text style={st.ponta}>{max}</Text>
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.lg, paddingBottom: 120 },
  secao: { gap: space.md },
  fim: { gap: space.base, alignItems: 'stretch' },
  pressed: { opacity: 0.7 },

  escalaBloco: { gap: space.sm },
  escalaLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  alvo: {
    flex: 1,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  alvoAtivo: { backgroundColor: onDark.fill, borderColor: onDark.fill },
  alvoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.muted },
  alvoRotuloAtivo: { color: color.text },
  pontas: { flexDirection: 'row', justifyContent: 'space-between' },
  ponta: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },

  campo: {
    minHeight: 96,
    padding: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  link: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    textAlign: 'center',
  },
})
