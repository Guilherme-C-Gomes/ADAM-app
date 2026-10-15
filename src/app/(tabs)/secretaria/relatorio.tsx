import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Barra, Card, Chip, Contador } from '@/components/ui'
import { Aviso, Grupo, Linha, SeletorPeriodo } from '@/components/ui/form'
import { CardQueda, NaoRegistrado, Variacao } from '@/components/ui/metricas'
import { HeroVoltar } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonFaixa } from '@/components/ui/skeleton'
import { emQueda, useParticipantes } from '@/data/fichas'
import { useFiltroSecretaria } from '@/data/filtro-secretaria'
import { useMetricas } from '@/data/metricas'
import { color, motion, onDark, radius, space, type } from '@/theme/tokens'

/**
 * Telas 07, 07b, 07d, 07p e 07q. Quatro recortes do mesmo periodo:
 * quem veio, como foram os jogos, quem entra, e se o treino prestou. O
 * periodo e o mesmo da Secretaria (R12), e cada numero sai do banco
 * (data/metricas.ts). O que o app ainda nao registra aparece escrito,
 * nunca como um zero que parece medido.
 */
const ABAS = ['Presença', 'Jogos', 'Pessoas', 'Qualidade'] as const
type Aba = (typeof ABAS)[number]
const ALTURA = 72

/** "05/09/2026" */
const brasileira = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export default function Relatorio() {
  const { filtro, todasAsUnidades, nomeUnidade, rotulo, anterior, proximo } = useFiltroSecretaria()
  const [aba, setAba] = useState<Aba>('Presença')
  const metricas = useMetricas(filtro)
  const fichas = useParticipantes()
  const recarregarMetricas = metricas.recarregar
  const recarregarFichas = fichas.recarregar

  useFocusEffect(
    useCallback(() => {
      recarregarMetricas()
      recarregarFichas()
    }, [recarregarMetricas, recarregarFichas]),
  )

  const quedas = fichas.lista
    .filter((p) => !filtro.unidadeId || p.unidadeId === filtro.unidadeId)
    .filter(emQueda).length
  const m = metricas.dados
  const carregando = metricas.carregando || fichas.carregando
  const maior = m ? Math.max(...m.recortes.map((r) => r.valor ?? 0), 1) : 1

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Relatório"
        subtitulo={todasAsUnidades ? `Secretaria · ${todasAsUnidades}` : 'Secretaria'}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <SeletorPeriodo
          rotulo={rotulo}
          onAnterior={anterior}
          onProximo={proximo}
          onPress={() => router.push('/secretaria/filtros')}
        />

        <View style={st.abas}>
          {ABAS.map((a) => (
            <Chip key={a} rotulo={a} ativo={aba === a} onPress={() => setAba(a)} />
          ))}
        </View>

        {carregando ? (
          <Esqueleto>
            <SkeletonFaixa />
            <SkeletonCard altura={210} />
            <SkeletonCard altura={104} />
          </Esqueleto>
        ) : !m ? (
          <Aviso
            tom="ambar"
            titulo={metricas.erro ?? 'Não foi possível calcular os números.'}
            texto="Toque para tentar de novo"
            onPress={recarregarMetricas}
          />
        ) : aba === 'Presença' ? (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Crianças que foram</Text>
                  <Variacao atual={m.foram} antes={m.foramAntes} />
                </View>
                <View style={st.valorLinha}>
                  <Contador valor={m.foram} style={st.valor} />
                  <Text style={st.valorMeta}>
                    de {m.ativas} {m.ativas === 1 ? 'cadastrada' : 'cadastradas'}
                  </Text>
                </View>
                <Text style={st.meta}>
                  {m.foramAntes} no período anterior ({m.anterior.rotulo})
                </Text>
                <View style={st.grafico}>
                  {m.recortes.map((r, i) => {
                    // o recorte de agora em destaque; o que ainda nao chegou fica vazio
                    const atual = r.valor !== null && m.recortes[i + 1]?.valor == null
                    return (
                      <View
                        key={r.rotulo}
                        style={st.coluna}
                        accessibilityLabel={
                          r.valor === null
                            ? `${r.rotulo}: ainda não chegou`
                            : `${r.rotulo}: ${r.valor} crianças`
                        }>
                        <View
                          style={[
                            st.barraVertical,
                            r.valor === null
                              ? st.barraFutura
                              : {
                                  height: Math.max(24, (r.valor / maior) * ALTURA),
                                  backgroundColor: atual ? color.primaryLt : color.primaryDk,
                                },
                          ]}>
                          <Text style={st.colunaValor}>{r.valor ?? '—'}</Text>
                        </View>
                        <Text style={st.colunaRotulo}>{r.rotulo}</Text>
                      </View>
                    )
                  })}
                </View>
                <Text style={st.legenda}>
                  Cada barra conta quem foi ao menos uma vez naquele recorte
                  {m.semFicha
                    ? ` · ${m.semFicha} sem ficha ${m.semFicha === 1 ? 'veio' : 'vieram'} no período`
                    : ''}
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Chamadas encerradas</Text>
                  <Text style={st.legendaValor}>{m.chamadas.total}</Text>
                </View>
                {m.chamadas.total ? (
                  <Barra pct={(m.chamadas.pequenos / m.chamadas.total) * 100} />
                ) : null}
                <Text style={st.legenda}>
                  {m.chamadas.pequenos} dos Pequenos · {m.chamadas.maiores} dos Maiores · em{' '}
                  {m.chamadas.dias} {m.chamadas.dias === 1 ? 'dia' : 'dias'}
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <CardQueda quedas={quedas} unidade={filtro.unidadeId ? nomeUnidade : null} />
            </Animated.View>
          </>
        ) : aba === 'Jogos' ? (
          !m.jogos ? (
            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <NaoRegistrado
                titulo="Os jogos ainda não estão no banco"
                texto="Falta rodar o SQL do Jogo no Supabase. Até lá, nenhum número desta aba seria verdadeiro."
              />
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(motion.medium)}>
                <Card>
                  <Text style={st.cardTitulo}>Jogos no período</Text>
                  <View style={st.valorLinha}>
                    <Contador valor={m.jogos.total} style={st.valor} />
                    <Text style={st.valorMeta}>
                      {m.jogos.total === 1 ? 'jogo' : 'jogos'} · todas as unidades
                    </Text>
                  </View>
                  <View style={st.placar}>
                    <Placar valor={m.jogos.ganhos} rotulo="vitórias" cor={color.success} />
                    <Placar valor={m.jogos.empates} rotulo="empates" cor={color.muted} />
                    <Placar valor={m.jogos.perdidos} rotulo="derrotas" cor={color.danger} />
                  </View>
                  <Text style={m.jogos.semResultado ? st.legendaAviso : st.legenda}>
                    {!m.jogos.total
                      ? 'Nenhum jogo no período'
                      : m.jogos.semResultado
                        ? `${m.jogos.semResultado} ${m.jogos.semResultado === 1 ? 'jogo ainda sem resultado' : 'jogos ainda sem resultado'} registrado`
                        : 'Todos com resultado registrado'}
                  </Text>
                </Card>
              </Animated.View>

              {m.jogos.campeonatos.length ? (
                <Animated.View
                  entering={FadeInDown.duration(motion.medium).delay(40)}
                  style={st.secao}>
                  <Text style={st.overline}>CAMPEONATOS NO PERÍODO</Text>
                  <Grupo>
                    {m.jogos.campeonatos.map((c) => (
                      <Linha
                        key={c.nome}
                        titulo={c.nome}
                        legenda={`${c.jogos} ${c.jogos === 1 ? 'jogo' : 'jogos'} · ${c.pontos} ${c.pontos === 1 ? 'ponto' : 'pontos'}${c.comResultado < c.jogos ? ` (${c.jogos - c.comResultado} sem resultado)` : ''}`}
                        semSeta
                      />
                    ))}
                  </Grupo>
                </Animated.View>
              ) : null}
            </>
          )
        ) : aba === 'Pessoas' ? (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <Card>
                <Text style={st.cardTitulo}>Fichas no período</Text>
                <View style={st.placar}>
                  <Placar valor={m.entraram} rotulo="entraram" cor={color.success} />
                  {m.sairam === null ? (
                    <Placar valor={m.semFicha} rotulo="vieram sem ficha" cor={color.warn} />
                  ) : (
                    <>
                      <Placar valor={m.sairam} rotulo="saíram" cor={color.danger} />
                      <Placar valor={m.entraram - m.sairam} rotulo="saldo" cor={color.text} sinal />
                    </>
                  )}
                </View>
                <Text style={st.legenda}>
                  {[
                    `${m.ativas} ${m.ativas === 1 ? 'ficha ativa' : 'fichas ativas'} hoje`,
                    m.sairam !== null && m.semFicha
                      ? `${m.semFicha} ${m.semFicha === 1 ? 'veio' : 'vieram'} sem ficha (falta cadastrar)`
                      : null,
                    m.sairam === null ? 'a saída ainda não é registrada (falta o SQL)' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Equipe que fez chamada</Text>
                  <Text style={st.legendaValor}>
                    {m.equipe.marcaram} de {m.equipe.comAcesso}
                  </Text>
                </View>
                <Barra
                  pct={m.equipe.comAcesso ? (m.equipe.marcaram / m.equipe.comAcesso) * 100 : 0}
                  cor={color.success}
                />
                <Text style={st.legenda}>
                  Pessoas com acesso ao app que marcaram ao menos uma chamada no período
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Continuam vindo</Text>
                  {m.continuidade.base ? (
                    <Text style={st.legendaVerde}>
                      {Math.round((m.continuidade.continuam / m.continuidade.base) * 100)}%
                    </Text>
                  ) : null}
                </View>
                {m.continuidade.base ? (
                  <Barra
                    pct={(m.continuidade.continuam / m.continuidade.base) * 100}
                    cor={color.success}
                  />
                ) : null}
                <Text style={st.legenda}>
                  {m.continuidade.base
                    ? `De ${m.continuidade.base} com ficha desde ${brasileira(m.continuidade.ate)} ou antes, ${m.continuidade.continuam} ${m.continuidade.continuam === 1 ? 'veio' : 'vieram'} nos últimos 30 dias do período`
                    : `Ninguém tem ficha desde ${brasileira(m.continuidade.ate)} ou antes: a conta começa quando houver crianças com 3 meses de ADAM`}
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)}>
              <CardQueda quedas={quedas} unidade={filtro.unidadeId ? nomeUnidade : null} />
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Escala com técnico definido</Text>
                  <Text style={st.legendaValor}>
                    {m.treinos.comResponsavel} de {m.treinos.planejados}
                  </Text>
                </View>
                {m.treinos.planejados ? (
                  <Barra pct={(m.treinos.comResponsavel / m.treinos.planejados) * 100} />
                ) : null}
                <Text
                  style={
                    m.treinos.planejados > m.treinos.comResponsavel ? st.legendaAviso : st.legenda
                  }>
                  {!m.treinos.planejados
                    ? 'Nenhum treino planejado no app para o período'
                    : m.treinos.planejados > m.treinos.comResponsavel
                      ? `${m.treinos.planejados - m.treinos.comResponsavel} ${m.treinos.planejados - m.treinos.comResponsavel === 1 ? 'treino ficou' : 'treinos ficaram'} sem técnico definido`
                      : 'Todos os treinos tiveram técnico definido'}
                </Text>
              </Card>
            </Animated.View>

            {!m.qualidade ? (
              <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
                <NaoRegistrado
                  titulo="Avaliação e conteúdo dos treinos"
                  texto="Falta rodar o SQL do Jogo no Supabase. Até lá, nenhum número daqui seria verdadeiro."
                />
              </Animated.View>
            ) : (
              <>
                <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
                  <Card>
                    <View style={st.linhaTopo}>
                      <Text style={st.cardTitulo}>Avaliação dos treinos</Text>
                      <Text style={st.legenda}>
                        {m.qualidade.avaliados}{' '}
                        {m.qualidade.avaliados === 1 ? 'avaliado' : 'avaliados'}
                      </Text>
                    </View>
                    {m.qualidade.avaliados ? (
                      <>
                        <NotaBarra
                          rotulo="Como foi"
                          valor={m.qualidade.treino}
                          cor={color.success}
                        />
                        <NotaBarra
                          rotulo="Entenderam"
                          valor={m.qualidade.entenderam}
                          cor={onDark.fill}
                        />
                        <NotaBarra
                          rotulo="Dificuldade"
                          valor={m.qualidade.dificuldade}
                          cor={color.warn}
                        />
                      </>
                    ) : (
                      <Text style={st.legenda}>Nenhum treino avaliado no período</Text>
                    )}
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
                  <Card>
                    <View style={st.linhaTopo}>
                      <Text style={st.cardTitulo}>Exercícios feitos</Text>
                      <Text style={st.legendaValor}>
                        {m.qualidade.exerciciosFeitos} de {m.qualidade.exerciciosPlanejados}
                      </Text>
                    </View>
                    {m.qualidade.exerciciosPlanejados ? (
                      <Barra
                        pct={
                          (m.qualidade.exerciciosFeitos / m.qualidade.exerciciosPlanejados) * 100
                        }
                        cor={color.success}
                      />
                    ) : null}
                    <Text style={st.legenda}>
                      {m.treinos.planejados
                        ? `${m.qualidade.comExercicios} de ${m.treinos.planejados} ${m.treinos.planejados === 1 ? 'treino' : 'treinos'} com exercícios planejados`
                        : 'Nenhum treino planejado no período'}
                    </Text>
                  </Card>
                </Animated.View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function NotaBarra({ rotulo, valor, cor }: { rotulo: string; valor: number | null; cor: string }) {
  return (
    <View style={st.notaLinha}>
      <Text style={st.notaRotulo}>{rotulo}</Text>
      <View style={st.notaBarra}>
        <Barra pct={valor === null ? 0 : (valor / 5) * 100} cor={cor} />
      </View>
      <Text style={st.notaValor}>{valor === null ? '—' : valor.toFixed(1).replace('.', ',')}</Text>
    </View>
  )
}

function Placar({
  valor,
  rotulo,
  cor,
  sinal,
}: {
  valor: number
  rotulo: string
  cor: string
  /** mostra "+" no positivo (saldo) */
  sinal?: boolean
}) {
  return (
    <View style={st.placarItem}>
      <Text style={[st.placarValor, { color: cor }]}>
        {sinal && valor > 0 ? '+' : ''}
        {valor}
      </Text>
      <Text style={st.legenda}>{rotulo}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  tituloComSeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },
  abas: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  overline: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
  },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },
  legendaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legendaVerde: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.success },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linhaTexto: { flex: 1, gap: 2 },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  valorMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  meta: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint, textAlign: 'right' },
  pressed: { opacity: 0.85 },

  grafico: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
  coluna: { flex: 1, alignItems: 'center', gap: space.xs },
  barraVertical: {
    width: '100%',
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colunaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  barraFutura: {
    height: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border,
    backgroundColor: 'transparent',
  },
  colunaRotulo: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },

  placar: { flexDirection: 'row' },
  placarItem: { flex: 1, alignItems: 'center', gap: 2 },
  placarValor: { ...type.h1, fontFamily: 'Inter_700Bold' },

  notaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  notaRotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, width: 92 },
  notaBarra: { flex: 1 },
  notaValor: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
    width: 28,
    textAlign: 'right',
  },

  seloVerde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(61, 214, 140, 0.14)',
  },
  seloVerdeRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.success },

  cardAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
  acentoPerigo: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.danger,
  },
})
