import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Barra, Card, Chip, Contador, Hero, Overline } from '@/components/ui'
import { Esqueleto, SkeletonCard } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import {
  LIMITE_BAIXA_FREQUENCIA,
  PERIODOS_RELATORIO,
  chamadasFeitas,
  frequenciaPorPeriodo,
  participantes,
  presencaPorDia,
  qualidadeTreinos,
  retencao,
  type PeriodoRelatorio,
} from '@/data/mock'
import { color, motion, onDark, radius, space, type } from '@/theme/tokens'

const ABAS = ['Participação', 'Retenção', 'Qualidade'] as const
type Aba = (typeof ABAS)[number]
const ALTURA_GRAFICO = 96

export default function Relatorio() {
  const [periodo, setPeriodo] = useState<PeriodoRelatorio>('Trimestre')
  const [aba, setAba] = useState<Aba>('Participação')
  const carregando = useCarregamento()

  const dados = frequenciaPorPeriodo[periodo]
  const maiorBucket = Math.max(...dados.buckets.map((b) => b.valor))

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
      <Hero titulo="Relatório" subtitulo="Secretaria · Atibaia e São José de Caiana" />

      <ScrollView
        contentContainerStyle={st.conteudo}
        showsVerticalScrollIndicator={false}>
        <View style={st.filtros}>
          {PERIODOS_RELATORIO.map((p) => (
            <Chip key={p} rotulo={p} ativo={periodo === p} onPress={() => setPeriodo(p)} />
          ))}
        </View>

        <View style={st.abas}>
          {ABAS.map((a) => (
            <Chip key={a} rotulo={a} ativo={aba === a} onPress={() => setAba(a)} />
          ))}
        </View>

        {carregando ? (
          <Esqueleto>
            <SkeletonCard altura={256} />
            <SkeletonCard altura={104} />
            <SkeletonCard altura={104} />
          </Esqueleto>
        ) : aba === 'Participação' ? (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card>
          <Text style={st.cardTitulo}>Frequência média</Text>
          <View style={st.valorLinha}>
            <Contador valor={dados.valor} sufixo="%" style={st.valor} />
            <View style={st.selo}>
              <Text style={st.seloRotulo}>+{dados.deltaPp}pp</Text>
            </View>
          </View>
          <Text style={st.legenda}>
            Comparado ao {periodo.toLowerCase()} anterior · meta de {dados.meta}%
          </Text>

          <View style={st.grafico}>
            {dados.buckets.map((b) => (
              <View key={b.rotulo} style={st.coluna}>
                <Text style={st.colunaValor}>{b.valor}%</Text>
                <View
                  style={[
                    st.barraVertical,
                    {
                      height: (b.valor / maiorBucket) * ALTURA_GRAFICO,
                      backgroundColor: b.valor >= dados.meta ? color.success : onDark.fill,
                    },
                  ]}
                />
                <Text style={st.colunaMes}>{b.rotulo}</Text>
              </View>
            ))}
          </View>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
        <Card>
          <Text style={st.cardTitulo}>Presença por dia</Text>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Chamadas feitas</Text>
            <Text style={st.valorInline}>
              {chamadasFeitas.feitas} de {chamadasFeitas.esperadas}
            </Text>
          </View>
          <Barra pct={(chamadasFeitas.feitas / chamadasFeitas.esperadas) * 100} />
          <Text style={st.legendaAlerta}>
            {chamadasFeitas.semRegistro} treinos passaram sem registro
          </Text>
        </Card>
        </Animated.View>
          </>
        ) : aba === 'Retenção' ? (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card>
          <Text style={st.cardTitulo}>Entradas e saídas</Text>
          <View style={st.entradasLinha}>
            <View style={st.entradasItem}>
              <Text style={[st.valor, st.corOk]}>{retencao.entradas}</Text>
              <Text style={st.legenda}>entraram</Text>
            </View>
            <View style={st.entradasItem}>
              <Text style={[st.valor, st.corBaixa]}>{retencao.saidas}</Text>
              <Text style={st.legenda}>saíram</Text>
            </View>
            <View style={st.entradasItem}>
              <Text style={st.valor}>
                +{retencao.entradas - retencao.saidas}
              </Text>
              <Text style={st.legenda}>saldo</Text>
            </View>
          </View>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Consistência de presença</Text>
            <Text style={st.valorInline}>{retencao.consistenciaPct}%</Text>
          </View>
          <Barra pct={retencao.consistenciaPct} cor={color.success} />
          <Text style={st.legenda}>Nas últimas 3 semanas</Text>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Overline>Atenção</Overline>
        <Card>
          <Text style={st.cardTitulo}>{emRisco.length} participantes sumiram</Text>
          <Text style={st.legenda}>Contato recomendado</Text>
          {emRisco.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({ pathname: '/secretaria/participantes/[id]', params: { id: p.id } })
              }
              style={({ pressed }) => [st.riscoLinha, pressed && st.pressed]}
              accessibilityRole="button">
              <Avatar iniciais={p.iniciais} size={34} />
              <View style={st.riscoTexto}>
                <Text style={st.riscoNome}>{p.nome}</Text>
                <Text style={st.legenda}>
                  {p.unidade} · {p.frequencia}% de presença
                </Text>
              </View>
              <Text style={st.chevron}>›</Text>
            </Pressable>
          ))}
        </Card>
        </Animated.View>
          </>
        ) : (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Avaliação dos treinos</Text>
            <Text style={st.legenda}>{qualidadeTreinos.avaliados} avaliados</Text>
          </View>
          <View style={st.avaliacaoLinha}>
            <Text style={st.avaliacaoRotulo}>Como foi</Text>
            <View style={st.avaliacaoBarra}>
              <Barra pct={(qualidadeTreinos.comoFoi / 5) * 100} cor={color.success} />
            </View>
            <Text style={st.diaValor}>{qualidadeTreinos.comoFoi.toFixed(1)}</Text>
          </View>
          <View style={st.avaliacaoLinha}>
            <Text style={st.avaliacaoRotulo}>Entenderam</Text>
            <View style={st.avaliacaoBarra}>
              <Barra pct={(qualidadeTreinos.entenderam / 5) * 100} />
            </View>
            <Text style={st.diaValor}>{qualidadeTreinos.entenderam.toFixed(1)}</Text>
          </View>
          <View style={st.avaliacaoLinha}>
            <Text style={st.avaliacaoRotulo}>Dificuldade</Text>
            <View style={st.avaliacaoBarra}>
              <Barra pct={(qualidadeTreinos.dificuldade / 5) * 100} cor={color.warn} />
            </View>
            <Text style={st.diaValor}>{qualidadeTreinos.dificuldade.toFixed(1)}</Text>
          </View>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Escala cumprida</Text>
            <Text style={st.valorInline}>
              {qualidadeTreinos.escalaCumprida.feitas} de {qualidadeTreinos.escalaCumprida.total}
            </Text>
          </View>
          <Barra
            pct={
              (qualidadeTreinos.escalaCumprida.feitas / qualidadeTreinos.escalaCumprida.total) *
              100
            }
          />
          <Text style={st.legendaAlerta}>{qualidadeTreinos.escalaCumprida.nota}</Text>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Conteúdo aplicado</Text>
            <Text style={[st.valorInline, st.corOk]}>
              {qualidadeTreinos.conteudoAplicado.feitas} de{' '}
              {qualidadeTreinos.conteudoAplicado.total}
            </Text>
          </View>
          <Barra
            pct={
              (qualidadeTreinos.conteudoAplicado.feitas /
                qualidadeTreinos.conteudoAplicado.total) *
              100
            }
            cor={color.success}
          />
          <Text style={st.legenda}>{qualidadeTreinos.conteudoAplicado.nota}</Text>
        </Card>
        </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: space.xxxl },
  filtros: { flexDirection: 'row', gap: space.sm },
  abas: { flexDirection: 'row', gap: space.sm },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valorLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  valorInline: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAlerta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },
  corOk: { color: color.success },
  corBaixa: { color: color.danger },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(61, 214, 140, 0.12)',
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.success },

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
  diaRotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, width: 56 },
  diaBarra: { flex: 1 },
  diaValor: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
    width: 40,
    textAlign: 'right',
  },

  entradasLinha: { flexDirection: 'row', justifyContent: 'space-around' },
  entradasItem: { alignItems: 'center', gap: space.xs },

  avaliacaoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avaliacaoRotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, width: 84 },
  avaliacaoBarra: { flex: 1 },

  riscoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  riscoTexto: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  chevron: { ...type.body, color: color.faint },
  riscoNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
})
