import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip, Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { turmas } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11i. O calendario e do mes; os horarios oferecidos sao os da
 * turma (R16: o horario da turma e o padrao de quem nasce agora, e
 * mudar la nao mexe em sessao ja marcada).
 */
const DIAS_CABECALHO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function DataDoTreino() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [dia, setDia] = useState<number | null>(hoje.getDate())

  const horarios = turmas[0].horarios
  const [hora, setHora] = useState(horarios[0])

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  const andarMes = (passo: number) => {
    const d = new Date(ano, mes + passo, 1)
    setMes(d.getMonth())
    setAno(d.getFullYear())
    setDia(null)
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar titulo="Data do treino" subtitulo="Escolha o dia e o horário" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card style={st.calendario}>
            <View style={st.barraMes}>
              <Pressable
                onPress={() => andarMes(-1)}
                hitSlop={space.sm}
                style={({ pressed }) => [st.seta, pressed && st.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Mês anterior">
                <Text style={st.setaIcone}>‹</Text>
              </Pressable>
              <Text style={st.mesRotulo}>
                {MESES[mes]} de {ano}
              </Text>
              <Pressable
                onPress={() => andarMes(1)}
                hitSlop={space.sm}
                style={({ pressed }) => [st.seta, pressed && st.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Próximo mês">
                <Text style={st.setaIcone}>›</Text>
              </Pressable>
            </View>

            <View style={st.semana}>
              {DIAS_CABECALHO.map((d, i) => (
                <Text key={`${d}${i}`} style={st.diaCabecalho}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={st.grade}>
              {celulas.map((n, i) =>
                n === null ? (
                  <View key={`vazio${i}`} style={st.celula} />
                ) : (
                  <Pressable
                    key={n}
                    onPress={() => setDia(n)}
                    style={({ pressed }) => [
                      st.celula,
                      dia === n && st.celulaAtiva,
                      pressed && st.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: dia === n }}
                    accessibilityLabel={`${n} de ${MESES[mes]}`}>
                    <Text style={[st.celulaRotulo, dia === n && st.celulaRotuloAtivo]}>{n}</Text>
                  </Pressable>
                ),
              )}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Horário da turma</Overline>
          <View style={st.chips}>
            {horarios.map((h) => (
              <Chip key={h} rotulo={h} ativo={hora === h} onPress={() => setHora(h)} />
            ))}
          </View>
          <Text style={st.legenda}>
            Mudar o horário aqui vale só para este treino. Os já marcados continuam como estão.
          </Text>
        </Animated.View>

        <Pressable
          onPress={() => router.back()}
          disabled={dia === null}
          style={({ pressed }) => [
            st.botao,
            pressed && st.pressed,
            dia === null && st.botaoDesabilitado,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: dia === null }}>
          <Text style={st.botaoRotulo}>
            {dia === null ? 'Escolha um dia' : `Usar ${dia} de ${MESES[mes]} · ${hora}`}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  calendario: { gap: space.md },
  barraMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mesRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  seta: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
  },
  setaIcone: { fontSize: 22, lineHeight: 26, color: color.text },

  semana: { flexDirection: 'row' },
  diaCabecalho: {
    flex: 1,
    textAlign: 'center',
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  celula: {
    width: `${100 / 7}%`,
    height: target.minimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celulaAtiva: {},
  celulaRotulo: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.text,
    width: 32,
    height: 32,
    lineHeight: 32,
    textAlign: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  celulaRotuloAtivo: {
    fontFamily: 'Inter_600SemiBold',
    backgroundColor: onDark.fill,
  },

  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  pressed: { opacity: 0.7 },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoDesabilitado: { opacity: 0.4 },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
