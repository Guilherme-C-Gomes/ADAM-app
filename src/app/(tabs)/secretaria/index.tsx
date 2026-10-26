import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Barra, Card, Contador, Overline } from '@/components/ui'
import { Aviso, Grupo, Linha, SeletorPeriodo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { CardQueda, Variacao } from '@/components/ui/metricas'
import { HeroSetor, Segmentado } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonFaixa, SkeletonLista } from '@/components/ui/skeleton'
import { DOCUMENTOS, emQueda, useParticipantes } from '@/data/fichas'
import { useFiltroSecretaria } from '@/data/filtro-secretaria'
import { useMetricas } from '@/data/metricas'
import { color, motion, onDark, radius, space, type, ESPACO_FIM_DA_TELA } from '@/theme/tokens'

/**
 * Tela 12. A Secretaria e quem responde "quanto no conjunto": toda
 * metrica mora aqui, e o periodo escolhido vale para o painel e para o
 * relatorio ao mesmo tempo (R12). Tudo e contado no banco — ver
 * data/metricas.ts para o que cada numero quer dizer.
 */
const ABAS = ['Números', 'Cadastros'] as const

export default function Secretaria() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>('Números')
  const { filtro, todasAsUnidades, nomeUnidade, rotulo, anterior, proximo } = useFiltroSecretaria()
  const metricas = useMetricas(filtro)
  const fichas = useParticipantes()
  const recarregarMetricas = metricas.recarregar
  const recarregarFichas = fichas.recarregar

  // voltar de uma chamada encerrada ou de uma ficha salva traz tudo novo
  useFocusEffect(
    useCallback(() => {
      recarregarMetricas()
      recarregarFichas()
    }, [recarregarMetricas, recarregarFichas]),
  )

  // as fichas seguem a unidade do filtro, como os numeros
  const daUnidade = fichas.lista.filter(
    (p) => !filtro.unidadeId || p.unidadeId === filtro.unidadeId,
  )
  const pendentes = daUnidade.filter(
    (p) => p.documentosEntregues < DOCUMENTOS.length || !p.temResponsavel,
  ).length
  const completas = daUnidade.length - pendentes
  const quedas = daUnidade.filter(emQueda).length

  const carregando =
    aba === 'Números' ? metricas.carregando || fichas.carregando : fichas.carregando
  const m = metricas.dados

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Secretaria" subtitulo={todasAsUnidades || 'Painel da Secretaria'} />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Segmentado opcoes={ABAS} valor={aba} onChange={setAba} />

        <SeletorPeriodo
          rotulo={rotulo}
          onAnterior={anterior}
          onProximo={proximo}
          onPress={() => router.push('/secretaria/filtros')}
        />

        {carregando ? (
          <Esqueleto>
            <SkeletonFaixa />
            <SkeletonCard altura={150} />
            <SkeletonLista linhas={1} />
          </Esqueleto>
        ) : aba === 'Números' ? (
          !m ? (
            <Aviso
              tom="ambar"
              titulo={metricas.erro ?? 'Não foi possível calcular os números.'}
              texto="Toque para tentar de novo"
              onPress={recarregarMetricas}
            />
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(motion.medium)}>
                <Card>
                  <View style={st.linhaTopo}>
                    <Text style={st.cardTitulo}>Crianças que foram</Text>
                    <Variacao atual={m.foram} antes={m.foramAntes} />
                  </View>
                  <View style={st.valorLinha}>
                    <Contador valor={m.foram} style={st.valor} />
                    <Text style={st.valorMeta}>de {m.noPeriodo} com ficha no período</Text>
                    <Pressable
                      onPress={() => router.push('/secretaria/relatorio')}
                      hitSlop={space.sm}
                      accessibilityRole="button">
                      <Text style={st.link}>ver relatório</Text>
                    </Pressable>
                  </View>
                  <Text style={st.legendaFraca}>
                    {m.foramAntes} no período anterior ({m.anterior.rotulo})
                    {m.semFicha
                      ? ` · e ${m.semFicha} sem ficha ${m.semFicha === 1 ? 'veio' : 'vieram'}`
                      : ''}
                  </Text>

                  <View style={st.mini}>
                    <Mini valor={m.chamadas.total} rotulo="chamadas" />
                    <Mini valor={m.equipe.marcaram} rotulo="na equipe" />
                    <Mini valor={m.entraram} rotulo="fichas novas" destaque />
                  </View>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
                <Pressable
                  onPress={() => router.push('/secretaria/relatorio')}
                  style={({ pressed }) => pressed && st.pressed}
                  accessibilityRole="button">
                  <Card>
                    <View style={st.linhaTopo}>
                      <Text style={st.cardTitulo}>Chamadas encerradas</Text>
                      <Icone nome="seta" cor={color.faint} />
                    </View>
                    <View style={st.valorLinha}>
                      <Contador valor={m.chamadas.total} style={st.valor} />
                      <Text style={st.valorMeta}>
                        em {m.chamadas.dias} {m.chamadas.dias === 1 ? 'dia' : 'dias'} de treino
                      </Text>
                    </View>
                    {m.chamadas.total ? (
                      <Barra pct={(m.chamadas.pequenos / m.chamadas.total) * 100} />
                    ) : null}
                    <View style={st.legendaLinha}>
                      <View style={[st.ponto, { backgroundColor: color.primaryLt }]} />
                      <Text style={st.legenda}>Pequenos</Text>
                      <Text style={st.legendaValor}>{m.chamadas.pequenos}</Text>
                      <View
                        style={[
                          st.ponto,
                          { backgroundColor: color.primary, marginLeft: space.base },
                        ]}
                      />
                      <Text style={st.legenda}>Maiores</Text>
                      <Text style={st.legendaValor}>{m.chamadas.maiores}</Text>
                    </View>
                  </Card>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
                <CardQueda quedas={quedas} unidade={filtro.unidadeId ? nomeUnidade : null} />
              </Animated.View>
            </>
          )
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <Pressable
                onPress={() => router.push('/secretaria/participantes/cadastrar')}
                style={({ pressed }) => pressed && st.pressed}
                accessibilityRole="button">
                <Card style={st.cardDestaque}>
                  <View style={st.acento} />
                  <View style={st.linhaTexto}>
                    <Text style={st.cardTitulo}>Cadastrar criança</Text>
                    <Text style={st.legenda}>Formulário no app</Text>
                    <Text style={st.legendaFraca}>A ficha leva 2 minutos</Text>
                  </View>
                  <Icone nome="seta" cor={color.faint} />
                </Card>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
              <Grupo>
                <Linha
                  titulo="Crianças cadastradas"
                  legenda={`${daUnidade.length} ${daUnidade.length === 1 ? 'ficha' : 'fichas'} · abre os dados de cada uma`}
                  selo={
                    pendentes ? { rotulo: `${pendentes} com pendência`, tom: 'ambar' } : undefined
                  }
                  onPress={() => router.push('/secretaria/criancas')}
                />
              </Grupo>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)} style={st.secao}>
              <Overline>Fichas</Overline>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Fichas completas</Text>
                  <Text style={st.legendaValor}>
                    {completas} de {daUnidade.length}
                  </Text>
                </View>
                <Barra
                  pct={daUnidade.length ? (completas / daUnidade.length) * 100 : 0}
                  cor={color.success}
                />
                <Text style={pendentes || fichas.erro ? st.legendaAviso : st.legenda}>
                  {fichas.erro
                    ? fichas.erro
                    : pendentes
                      ? `${pendentes} ${pendentes === 1 ? 'ficha esperando' : 'fichas esperando'} documento ou responsável`
                      : daUnidade.length
                        ? 'Todas as fichas completas'
                        : 'Nenhuma ficha cadastrada ainda'}
                </Text>
              </Card>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Mini({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <View style={st.miniItem}>
      <Text style={[st.miniValor, destaque && valor > 0 && st.miniDestaque]}>
        {destaque && valor > 0 ? '+' : ''}
        {valor}
      </Text>
      <Text style={st.legenda}>{rotulo}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  tituloComSeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
  secao: { gap: space.md },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaFraca: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },
  legendaAviso: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },
  legendaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  valorMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, flex: 1 },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },
  legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.85 },
  linhaTexto: { flex: 1, gap: space.xs },

  mini: { flexDirection: 'row', justifyContent: 'space-between' },
  miniItem: { flex: 1, alignItems: 'center', gap: 2 },
  miniValor: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.text },
  miniDestaque: { color: color.success },

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

  cardDestaque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  cardAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: onDark.fill,
  },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
})
