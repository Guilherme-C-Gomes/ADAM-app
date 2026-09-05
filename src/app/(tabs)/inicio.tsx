import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Barra, Card, Chip, Hero, Overline } from '@/components/ui'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import { participantes, resumo, type Unidade } from '@/data/mock'
import { color, motion, onDark, radius, space, type } from '@/theme/tokens'

type FiltroUnidade = 'Todos' | Unidade
const FILTROS: FiltroUnidade[] = ['Todos', 'Atibaia', 'Caiana']

export default function Home() {
  const [unidade, setUnidade] = useState<FiltroUnidade>('Todos')
  const carregando = useCarregamento()

  const ativos = useMemo(
    () => (unidade === 'Todos' ? resumo.ativos : resumo.porUnidade[unidade]),
    [unidade],
  )

  const emQueda = useMemo(
    () => participantes.filter((p) => p.frequencia < 60).length,
    [],
  )

  const pctVagas = Math.round((ativos / resumo.totalVagas) * 100)
  const pctPresenca = Math.round((resumo.presencaSemana / resumo.presencaTotal) * 100)

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero
        titulo="Painel do mês"
        subtitulo="Setembro · visão da coordenação"
        perfil="Coordenação"
      />

      <ScrollView
        contentContainerStyle={st.conteudo}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={st.filtros}>
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={f} ativo={unidade === f} onPress={() => setUnidade(f)} />
          ))}
        </View>

        <Overline>Resumo do período</Overline>

        {carregando ? (
          <>
            <SkeletonCard altura={140} />
            <SkeletonCard altura={148} />
            <SkeletonCard altura={80} />
            <View style={st.carregando}>
              <ActivityIndicator size="small" color={color.primaryLt} />
              <Text style={st.carregandoRotulo}>Atualizando dados da coordenação</Text>
            </View>
          </>
        ) : (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card>
          <Text style={st.cardTitulo}>Participantes ativos</Text>
          <View style={st.valorLinha}>
            <Text style={st.valor}>{ativos}</Text>
            <Text style={st.valorMeta}>de {resumo.totalVagas} vagas</Text>
          </View>
          <Barra pct={pctVagas} />
          <View style={st.legendaLinha}>
            <View style={[st.ponto, { backgroundColor: onDark.fill }]} />
            <Text style={st.legenda}>Ocupação</Text>
            <Text style={st.legendaValor}>{pctVagas}%</Text>
          </View>
          {unidade === 'Todos' ? (
            <Text style={st.legenda}>
              Atibaia {resumo.porUnidade.Atibaia} · Caiana {resumo.porUnidade.Caiana}
            </Text>
          ) : null}
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(60)}>
        <Card>
          <Text style={st.cardTitulo}>Presença desta semana</Text>
          <View style={st.valorLinha}>
            <Text style={st.valor}>{resumo.presencaSemana}</Text>
            <Text style={st.valorMeta}>de {resumo.presencaTotal} esperados</Text>
            <View style={st.selo}>
              <Text style={st.seloRotulo}>{pctPresenca}%</Text>
            </View>
          </View>
          <Barra
            pct={pctPresenca}
            cor={pctPresenca >= resumo.metaPresenca ? color.success : color.warn}
          />
          <Text style={st.legenda}>Meta de {resumo.metaPresenca}% para o mês</Text>
          <Text style={st.legenda}>{resumo.proximoEncontro}</Text>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/participantes/index',
              params: { filtro: 'baixa' },
            })
          }
          style={({ pressed }) => pressed && st.pressed}
          accessibilityRole="button"
          accessibilityLabel={`${emQueda} participantes em queda de frequência, ver lista`}>
          <Card style={st.cardAlerta}>
            <View style={st.acento} />
            <View style={st.alertaTexto}>
              <Text style={st.cardTitulo}>{emQueda} em queda de frequência</Text>
              <Text style={st.legenda}>
                Abaixo de 60% de presença — vale contato da equipe
              </Text>
            </View>
            <Text style={st.chevron}>›</Text>
          </Card>
        </Pressable>
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
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  valorMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  selo: {
    marginLeft: 'auto',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.text },
  carregando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingTop: space.sm,
  },
  carregandoRotulo: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
  },
  cardAlerta: {
    paddingLeft: space.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  alertaTexto: { flex: 1, gap: space.xs },
  chevron: { ...type.body, color: color.faint },
  pressed: { opacity: 0.7 },
  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: color.warn,
  },
})
