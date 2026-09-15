import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Anel, Card, Chip, Contador, Overline } from '@/components/ui'
import { BannerOffline } from '@/components/ui/estados'
import { HeroSetor } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonChips, SkeletonFaixa } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import { useModoOffline } from '@/hooks/use-modo-offline'
import {
  contaAtual,
  filaOffline,
  participantes,
  proximoTreino,
  resumo,
  ultimoTreino,
  unidadesInfo,
  type Unidade,
} from '@/data/mock'
import { color, motion, onDark, radius, space, type } from '@/theme/tokens'

type FiltroUnidade = 'Todos' | Unidade
const FILTROS: FiltroUnidade[] = ['Todos', 'Atibaia', 'Caiana']

function saudacaoPorHorario() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Formata a mao, sem Intl: o Hermes do Expo Go as vezes sobe sem os
 * dados de localizacao completos e `Intl.DateTimeFormat('pt-BR', ...)`
 * derruba o app com RangeError nesse caso.
 */
const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function dataDeHoje() {
  const agora = new Date()
  return `${DIAS_SEMANA[agora.getDay()]}, ${agora.getDate()} de ${MESES[agora.getMonth()]}`
}

export default function Home() {
  const [unidade, setUnidade] = useState<FiltroUnidade>('Todos')
  const carregando = useCarregamento()
  const offline = useModoOffline()

  const ativos = useMemo(
    () => (unidade === 'Todos' ? resumo.ativos : resumo.porUnidade[unidade]),
    [unidade],
  )

  const emQueda = useMemo(
    () => participantes.filter((p) => p.frequencia < 60).length,
    [],
  )

  const presentesUltimoTreino = Math.round(ativos * (ultimoTreino.pctPresenca / 100))

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor
        titulo={`${saudacaoPorHorario()}, ${contaAtual.primeiroNome}`}
        subtitulo={dataDeHoje()}
      />

      <ScrollView
        contentContainerStyle={st.conteudo}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        {carregando ? (
          // Tela 03: o esqueleto repete a arvore da Home (chips, busca,
          // tres cards) para a troca interpolar em vez de piscar.
          <Esqueleto>
            <SkeletonChips quantidade={3} />
            <SkeletonFaixa />
            <SkeletonCard altura={140} />
            <SkeletonCard altura={148} />
            <SkeletonCard altura={80} />
          </Esqueleto>
        ) : (
          <>
        <View style={st.filtros}>
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={f} ativo={unidade === f} onPress={() => setUnidade(f)} />
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/secretaria/participantes')}
          accessibilityRole="button"
          accessibilityLabel="Buscar participante">
          <View style={st.busca}>
            <Text style={st.buscaIcone}>⌕</Text>
            <Text style={st.buscaPlaceholder}>Buscar participante</Text>
          </View>
        </Pressable>

        <Overline>Resumo de hoje</Overline>
          </>
        )}

        {carregando ? null : offline ? (
          <BannerOffline
            chamadas={filaOffline.chamadas}
            registros={filaOffline.registros}
            motivos={filaOffline.motivos}
            onTentar={() => {}}
          />
        ) : (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card>
          <Text style={st.cardTitulo}>Participantes ativos</Text>
          <View style={st.valorLinha}>
            <Contador valor={ativos} style={st.valor} />
            <Text style={st.valorMeta}>crianças e adolescentes</Text>
          </View>

          {unidade === 'Todos' ? (
            <>
              <View style={st.barraDupla}>
                {unidadesInfo.map((u) => (
                  <View
                    key={u.nome}
                    style={[
                      st.barraSegmento,
                      {
                        flex: resumo.porUnidade[u.nome],
                        backgroundColor: u.nome === 'Atibaia' ? color.primary : color.primaryLt,
                      },
                    ]}
                  />
                ))}
              </View>
              {unidadesInfo.map((u) => (
                <View key={u.nome} style={st.legendaLinha}>
                  <View
                    style={[
                      st.ponto,
                      { backgroundColor: u.nome === 'Atibaia' ? color.primary : color.primaryLt },
                    ]}
                  />
                  <Text style={st.legenda}>{u.nomeCompleto}</Text>
                  <Text style={st.legendaValor}>
                    {resumo.porUnidade[u.nome]}{' '}
                    {Math.round((resumo.porUnidade[u.nome] / ativos) * 100)}%
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={st.barraDupla}>
                <View style={[st.barraSegmento, { flex: 1, backgroundColor: color.primary }]} />
              </View>
              <View style={st.legendaLinha}>
                <View style={[st.ponto, { backgroundColor: color.primary }]} />
                <Text style={st.legenda}>{unidade}</Text>
                <Text style={st.legendaValor}>{ativos} 100%</Text>
              </View>
            </>
          )}
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
        <Card style={st.cardTreino}>
          <View style={st.treinoTexto}>
            <Text style={st.cardTitulo}>Presença no último treino</Text>
            <View style={st.valorLinha}>
              <Contador valor={presentesUltimoTreino} style={st.valor} />
              <Text style={st.valorMeta}>de {ativos}</Text>
            </View>
            <Text style={st.legenda}>
              {ultimoTreino.data} · {ultimoTreino.local}
            </Text>
            <Text style={st.legenda}>
              Próximo treino: {proximoTreino.data} · {proximoTreino.hora}
            </Text>
          </View>
          <Anel pct={ultimoTreino.pctPresenca} />
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/secretaria/participantes',
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

  header: { gap: space.xs, paddingBottom: space.sm },
  topoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  pillAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInicial: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.text },
  pillRotulo: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  saudacao: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  data: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  filtros: { flexDirection: 'row', gap: space.sm },

  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  buscaIcone: { ...type.body, color: color.faint },
  buscaPlaceholder: { ...type.body, fontFamily: 'Inter_400Regular', color: color.faint },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  valorMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  barraDupla: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: color.surface2,
    gap: 2,
  },
  barraSegmento: { height: '100%' },

  cardTreino: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  treinoTexto: { flex: 1, gap: space.xs },

  atalhos: { flexDirection: 'row', justifyContent: 'center', gap: space.base },
  atalho: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
  },
  atalhoAtivo: { backgroundColor: onDark.fill },
  atalhoDesabilitado: { opacity: 0.4 },
  atalhoIcone: { fontSize: 22 },

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
