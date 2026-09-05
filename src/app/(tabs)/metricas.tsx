import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Barra, Card, Chip, Hero, Overline } from '@/components/ui'
import {
  LIMITE_BAIXA_FREQUENCIA,
  mediaMensal,
  participantes,
  presencaPorDia,
  resumo,
} from '@/data/mock'
import { color, onDark, radius, space, type } from '@/theme/tokens'

const PERIODOS = ['Mês', 'Trimestre', 'Ano'] as const
const ALTURA_GRAFICO = 96

export default function Metricas() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>('Trimestre')

  const media = Math.round(
    mediaMensal.reduce((acc, m) => acc + m.valor, 0) / mediaMensal.length,
  )
  const variacao = mediaMensal[mediaMensal.length - 1].valor - mediaMensal[0].valor
  const maior = Math.max(...mediaMensal.map((m) => m.valor))

  const emRisco = useMemo(
    () =>
      participantes
        .filter((p) => p.frequencia < LIMITE_BAIXA_FREQUENCIA)
        .sort((a, b) => a.frequencia - b.frequencia)
        .slice(0, 3),
    [],
  )

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero titulo="Métricas" subtitulo={`Frequência · ${periodo.toLowerCase()}`} />

      <ScrollView
        contentContainerStyle={st.conteudo}
        showsVerticalScrollIndicator={false}>
        <View style={st.filtros}>
          {PERIODOS.map((p) => (
            <Chip key={p} rotulo={p} ativo={periodo === p} onPress={() => setPeriodo(p)} />
          ))}
        </View>

        <Card>
          <Text style={st.cardTitulo}>Presença média</Text>
          <View style={st.valorLinha}>
            <Text style={st.valor}>{media}%</Text>
            <View style={[st.selo, variacao >= 0 ? st.seloAlta : st.seloBaixa]}>
              <Text style={[st.seloRotulo, variacao >= 0 ? st.corAlta : st.corBaixa]}>
                {variacao >= 0 ? '+' : ''}
                {variacao} pts
              </Text>
            </View>
          </View>
          <Text style={st.legenda}>
            Comparado ao início do período · meta de {resumo.metaPresenca}%
          </Text>

          <View style={st.grafico}>
            {mediaMensal.map((m) => (
              <View key={m.mes} style={st.coluna}>
                <Text style={st.colunaValor}>{m.valor}%</Text>
                <View
                  style={[
                    st.barraVertical,
                    {
                      height: (m.valor / maior) * ALTURA_GRAFICO,
                      backgroundColor:
                        m.valor >= resumo.metaPresenca ? color.success : onDark.fill,
                    },
                  ]}
                />
                <Text style={st.colunaMes}>{m.mes}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={st.cardTitulo}>Presença por dia de encontro</Text>
          {presencaPorDia.map((d) => (
            <View key={d.rotulo} style={st.diaLinha}>
              <Text style={st.diaRotulo}>{d.rotulo}</Text>
              <View style={st.diaBarra}>
                <Barra pct={d.valor} />
              </View>
              <Text style={st.diaValor}>{d.valor}%</Text>
            </View>
          ))}
        </Card>

        <Overline>Atenção</Overline>

        <Card>
          <Text style={st.cardTitulo}>Participantes em risco</Text>
          {emRisco.map((p) => (
            <View key={p.id} style={st.riscoLinha}>
              <Avatar iniciais={p.iniciais} size={34} />
              <View style={st.riscoTexto}>
                <Text style={st.riscoNome}>{p.nome}</Text>
                <Text style={st.legenda}>
                  {p.unidade} · {p.frequencia}% de presença
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: space.xxxl },
  filtros: { flexDirection: 'row', gap: space.sm },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  valorLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  seloAlta: { backgroundColor: 'rgba(61, 214, 140, 0.12)' },
  seloBaixa: { backgroundColor: 'rgba(255, 122, 181, 0.14)' },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold' },
  corAlta: { color: color.success },
  corBaixa: { color: color.danger },

  grafico: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.sm,
  },
  coluna: { flex: 1, alignItems: 'center', gap: space.xs },
  colunaValor: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  barraVertical: { width: '100%', borderRadius: 8, borderCurve: 'continuous' },
  colunaMes: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },

  diaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  diaRotulo: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    width: 52,
  },
  diaBarra: { flex: 1 },
  diaValor: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
    width: 40,
    textAlign: 'right',
  },

  riscoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  riscoTexto: { flex: 1, gap: 2 },
  riscoNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
})
