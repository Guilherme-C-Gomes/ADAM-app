import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Barra, Card, Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { exercicios, treinos } from '@/data/jogo'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11d. A lista aqui e a MESMA que o tecnico montou em "Planejar
 * treino" (R19): nao existe segunda lista de exercicios do dia.
 */
export default function TreinoExercicios() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const treino = treinos.find((t) => t.id === id)

  const [feitos, setFeitos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((treino?.exercicios ?? []).map((e) => [e.exercicioId, e.feito])),
  )

  if (!treino) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar titulo="Treino não encontrado" subtitulo="Volte para a lista de treinos" />
      </SafeAreaView>
    )
  }

  const total = treino.exercicios.length
  const concluidos = treino.exercicios.filter((e) => feitos[e.exercicioId]).length

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={`Treino dos ${treino.turma}`}
        subtitulo={`${treino.hora} · ${treino.local} · ${treino.responsavel ?? 'a definir'}`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card>
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Exercícios de hoje</Text>
              <Text style={st.contagem}>
                {concluidos} de {total}
              </Text>
            </View>
            <Barra pct={total ? (concluidos / total) * 100 : 0} cor={color.success} />
            <Text style={st.legenda}>Marque conforme for dando</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Exercícios</Overline>
          <Card style={st.cardLista}>
            {treino.exercicios.map((item, i) => {
              const ex = exercicios.find((e) => e.id === item.exercicioId)
              const feito = feitos[item.exercicioId]
              return (
                <Pressable
                  key={item.exercicioId}
                  onPress={() =>
                    setFeitos((atual) => ({
                      ...atual,
                      [item.exercicioId]: !atual[item.exercicioId],
                    }))
                  }
                  style={({ pressed }) => [
                    st.linha,
                    i < treino.exercicios.length - 1 && st.divisoria,
                    pressed && st.pressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: feito }}
                  accessibilityLabel={ex?.nome}>
                  <View style={[st.marca, feito && st.marcaFeita]}>
                    <Text style={[st.marcaIcone, feito && st.marcaIconeFeita]}>
                      {feito ? '✓' : '+'}
                    </Text>
                  </View>
                  <View style={st.linhaTexto}>
                    <Text style={[st.linhaNome, feito && st.linhaNomeFeita]}>{ex?.nome}</Text>
                    <Text style={st.legenda}>{ex?.categoria}</Text>
                  </View>
                  <Text style={st.legenda}>{item.duracaoMin} min</Text>
                </Pressable>
              )
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Pressable
            onPress={() => router.push(`/jogo/avaliacao/${treino.id}`)}
            style={({ pressed }) => [st.botao, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>Encerrar treino</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  contagem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.success },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  pressed: { opacity: 0.7 },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaNomeFeita: { color: color.muted },

  marca: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  marcaFeita: { backgroundColor: color.success, borderColor: color.success },
  marcaIcone: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.faint },
  marcaIconeFeita: { color: color.bg },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: onDark.text },
})
