import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useState } from 'react'

import { Avatar, Card, Chip, Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { exercicios, treinos, type Turma } from '@/data/jogo'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11f. O que se monta aqui e exatamente o que o professor recebe
 * para marcar em campo (R19) — uma lista so.
 */
const TURMAS: readonly Turma[] = ['Pequenos', 'Maiores']

export default function PlanejarTreino() {
  const modelo = treinos[2]
  const itens = modelo.exercicios
  const [turma, setTurma] = useState<Turma>(modelo.turma)

  const totalMin = itens.reduce((soma, e) => soma + e.duracaoMin, 0)

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar titulo="Planejar treino" subtitulo="Próximo sábado, 12 de setembro" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card style={st.cardCampos}>
            <View style={st.campos}>
              <View style={st.campo}>
                <Text style={st.rotulo}>Turma</Text>
                <View style={st.chips}>
                  {TURMAS.map((t) => (
                    <Chip
                      key={t}
                      rotulo={t}
                      ativo={turma === t}
                      onPress={() => setTurma(t)}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={st.divisoria} />

            <Pressable
              onPress={() => router.push('/jogo/data-treino')}
              style={({ pressed }) => [st.campo, pressed && st.pressed]}
              accessibilityRole="button">
              <Text style={st.rotulo}>Data</Text>
              <View style={st.valorLinha}>
                <Text style={st.valor}>
                  {modelo.data} · {modelo.hora}
                </Text>
                <Text style={st.chevron}>›</Text>
              </View>
            </Pressable>

            <View style={st.divisoria} />

            <View>
              <Text style={st.rotulo}>Treinador responsável</Text>
              <Pressable
                onPress={() => router.push('/jogo/escala')}
                style={({ pressed }) => [st.treinador, pressed && st.pressed]}
                accessibilityRole="button">
                <Avatar iniciais="MA" size={28} />
                <Text style={st.valor}>{modelo.responsavel ?? 'a definir'}</Text>
                <Text style={st.chevron}>›</Text>
              </Pressable>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>{`Exercícios do treino · ${itens.length}`}</Overline>
          <Card style={st.cardLista}>
            {itens.map((item, i) => {
              const ex = exercicios.find((e) => e.id === item.exercicioId)
              return (
                <View key={item.exercicioId} style={[st.linha, st.linhaDivisoria]}>
                  <Text style={st.ordem}>{i + 1}</Text>
                  <Text style={st.linhaNome}>{ex?.nome}</Text>
                  <Text style={st.legenda}>{item.duracaoMin} min</Text>
                </View>
              )
            })}

            <View style={st.linha}>
              <Pressable
                onPress={() => router.push('/jogo/biblioteca')}
                hitSlop={space.sm}
                style={st.linhaTexto}
                accessibilityRole="button">
                <Text style={st.link}>Adicionar exercício</Text>
              </Pressable>
              <Text style={st.legenda}>{totalMin} min</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [st.botao, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>Salvar treino</Text>
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

  cardCampos: { gap: space.base },
  campos: { flexDirection: 'row', gap: space.base },
  campo: { flex: 1, gap: space.sm, minHeight: target.minimo },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  valorLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valor: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text, flex: 1 },
  treinador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: target.minimo,
  },
  divisoria: { height: 1, backgroundColor: color.divider },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1 },
  ordem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt, width: 14 },
  linhaNome: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },
  chevron: { ...type.body, color: color.faint },
  pressed: { opacity: 0.85 },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
