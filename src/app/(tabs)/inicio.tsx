import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Anel, Card, Chip, Contador, Overline } from '@/components/ui'
import { Aviso } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { CardQueda } from '@/components/ui/metricas'
import { entrada, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { HeroSetor } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonChips, SkeletonFaixa } from '@/components/ui/skeleton'
import { rotuloLongo } from '@/data/calendario'
import { useUnidades } from '@/data/chamada'
import { emQueda, useParticipantes } from '@/data/fichas'
import { deISO, useTreinosDeHoje } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { color, onDark, radius, space, type, ESPACO_FIM_DA_TELA } from '@/theme/tokens'

/** Uma cor por unidade, na ordem do banco. */
const CORES_UNIDADE = [color.primary, color.primaryLt, color.primaryDk]

function saudacaoPorHorario() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** "08:00" vira "08h"; "08:30" vira "08h30". */
const hora = (h: string) => (h.endsWith(':00') ? `${h.slice(0, 2)}h` : h.replace(':', 'h'))

/**
 * Home do ADM e da Secretaria (dado sensivel). Os numeros saem do banco e
 * batem com a Secretaria: os ativos sao as fichas ativas, "em queda" e a
 * mesma conta da lista, e o ultimo treino e o ultimo dia com chamada
 * encerrada.
 */
export default function Home() {
  // o cumprimento e de quem esta logado
  const { pessoa } = usePerfil()
  const unidades = useUnidades()
  const [unidadeId, setUnidadeId] = useState<string | null>(null)
  const fichas = useParticipantes()
  const treinos = useTreinosDeHoje(unidadeId)
  const recarregarFichas = fichas.recarregar
  const recarregarTreinos = treinos.recarregar

  useFocusEffect(
    useCallback(() => {
      recarregarFichas()
      recarregarTreinos()
    }, [recarregarFichas, recarregarTreinos]),
  )

  const nomeDe = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''
  const daUnidade = fichas.lista.filter((p) => !unidadeId || p.unidadeId === unidadeId)
  const ativos = daUnidade.length
  const quedas = daUnidade.filter(emQueda).length
  const porUnidade = unidades.dados.map((u, i) => ({
    ...u,
    cor: CORES_UNIDADE[i % CORES_UNIDADE.length],
    total: fichas.lista.filter((p) => p.unidadeId === u.id).length,
  }))

  // Presenca no ultimo treino: quem foi, de quem era esperado naquele dia
  // (as turmas e unidades que tiveram chamada) — mais quem foi sem ser
  // esperado, para a conta nunca passar de 100%.
  const ultimo = treinos.ultimo
  let presentes = 0
  let esperados = 0
  if (ultimo) {
    const daChamada = new Set(ultimo.turmas.map((t) => `${t.unidadeId}:${t.turma}`))
    const esperadosIds = new Set(
      fichas.lista
        .filter((p) =>
          daChamada.has(`${p.unidadeId}:${p.turma === 'Maiores' ? 'maiores' : 'pequenos'}`),
        )
        .map((p) => p.id),
    )
    presentes = ultimo.presentes.size
    esperados = new Set([...esperadosIds, ...ultimo.presentes]).size
  }
  const pctUltimo = esperados ? Math.round((presentes / esperados) * 100) : 0
  const locaisUltimo = ultimo
    ? [...new Set(ultimo.turmas.map((t) => nomeDe(t.unidadeId)))].join(' e ')
    : ''

  const carregando = fichas.carregando || treinos.carregando
  const erro = fichas.erro ?? treinos.erro

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor
        titulo={`${saudacaoPorHorario()}, ${pessoa.nome.split(' ')[0]}`}
        subtitulo={rotuloLongo(new Date())}
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
              <Chip rotulo="Todos" ativo={unidadeId === null} onPress={() => setUnidadeId(null)} />
              {unidades.dados.map((u) => (
                <Chip
                  key={u.id}
                  rotulo={u.nome}
                  ativo={unidadeId === u.id}
                  onPress={() => setUnidadeId(u.id)}
                />
              ))}
            </View>

            <Pressionavel
              onPress={() => router.push('/secretaria/participantes')}
              escala={0.98}
              accessibilityRole="button"
              accessibilityLabel="Buscar participante">
              <View style={st.busca}>
                <Icone nome="busca" cor={color.muted} />
                <Text style={st.buscaPlaceholder}>Buscar participante</Text>
              </View>
            </Pressionavel>

            <Overline>Resumo de hoje</Overline>
          </>
        )}

        {carregando ? null : (
          <>
            {erro ? (
              <Aviso
                tom="ambar"
                titulo={erro}
                texto="Toque para tentar de novo"
                onPress={() => {
                  recarregarFichas()
                  recarregarTreinos()
                }}
              />
            ) : null}

            <Animated.View entering={entrada(0)}>
              <Card>
                <Text style={st.cardTitulo}>Participantes ativos</Text>
                <View style={st.valorLinha}>
                  <Contador valor={ativos} style={st.valor} />
                  <Text style={st.valorMeta}>
                    {ativos === 1 ? 'criança ou adolescente' : 'crianças e adolescentes'}
                  </Text>
                </View>

                {unidadeId === null && ativos ? (
                  <>
                    <View style={st.barraDupla}>
                      {porUnidade
                        .filter((u) => u.total)
                        .map((u) => (
                          <View
                            key={u.id}
                            style={[st.barraSegmento, { flex: u.total, backgroundColor: u.cor }]}
                          />
                        ))}
                    </View>
                    {porUnidade.map((u) => (
                      <View key={u.id} style={st.legendaLinha}>
                        <View style={[st.ponto, { backgroundColor: u.cor }]} />
                        <Text style={st.legenda}>{u.nome}</Text>
                        <NumeroAnimado valor={u.total} style={st.legendaValor} />
                        <NumeroAnimado
                          valor={Math.round((u.total / ativos) * 100)}
                          formato={(n) => `${Math.round(n)}%`}
                          style={st.legendaValor}
                        />
                      </View>
                    ))}
                  </>
                ) : null}
              </Card>
            </Animated.View>

            <Animated.View entering={entrada(1)}>
              <Card style={st.cardTreino}>
                <View style={st.treinoTexto}>
                  <Text style={st.cardTitulo}>Presença no último treino</Text>
                  {ultimo ? (
                    <>
                      <View style={st.valorLinha}>
                        <Contador valor={presentes} style={st.valor} />
                        <Text style={st.valorMeta}>de {esperados}</Text>
                      </View>
                      <Text style={st.legenda}>
                        {rotuloLongo(deISO(ultimo.data))} · {locaisUltimo}
                      </Text>
                    </>
                  ) : (
                    <Text style={st.legenda}>Nenhuma chamada encerrada ainda</Text>
                  )}
                  <Text style={st.legenda}>
                    {treinos.proximo
                      ? `Próximo treino: ${rotuloLongo(deISO(treinos.proximo.data))} · ${hora(treinos.proximo.hora)}`
                      : 'Próximo treino: nenhum planejado no app'}
                  </Text>
                </View>
                {ultimo ? <Anel pct={pctUltimo} /> : null}
              </Card>
            </Animated.View>

            <Animated.View entering={entrada(2)}>
              <CardQueda quedas={quedas} unidade={unidadeId ? nomeDe(unidadeId) : null} />
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },

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
  pillInicial: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.onPrimary },
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
