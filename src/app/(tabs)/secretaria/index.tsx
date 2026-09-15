import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Barra, Card, Contador, Overline } from '@/components/ui'
import { HeroSetor, Segmentado } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import { participantes, resumo, unidadesInfo } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 12. A Secretaria e quem responde "quanto no conjunto": toda
 * metrica mora aqui, e o periodo escolhido vale para o painel e para o
 * relatorio ao mesmo tempo (R12).
 */
const ABAS = ['Números', 'Cadastros'] as const

const PENDENTES = participantes.filter((p) => p.responsavel === 'Cadastro pendente').length

export default function Secretaria() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>('Números')
  const carregando = useCarregamento()

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Secretaria" subtitulo="Atibaia e São José de Caiana" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Segmentado opcoes={ABAS} valor={aba} onChange={setAba} />

        {carregando ? (
          <Esqueleto>
            <SkeletonCard altura={150} />
            <SkeletonLista linhas={1} />
            <SkeletonLista linhas={1} />
          </Esqueleto>
        ) : aba === 'Números' ? (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <Card>
                <Text style={st.cardTitulo}>Participantes ativos</Text>
                <View style={st.valorLinha}>
                  <Contador valor={resumo.ativos} style={st.valor} />
                  <Text style={st.valorMeta}>crianças e adolescentes</Text>
                </View>
                <View style={st.barraDupla}>
                  {unidadesInfo.map((u) => (
                    <View
                      key={u.nome}
                      style={[
                        st.barraSegmento,
                        {
                          flex: resumo.porUnidade[u.nome],
                          backgroundColor:
                            u.nome === 'Atibaia' ? color.primary : color.primaryLt,
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
                        {
                          backgroundColor:
                            u.nome === 'Atibaia' ? color.primary : color.primaryLt,
                        },
                      ]}
                    />
                    <Text style={st.legenda}>{u.nomeCompleto}</Text>
                    <Text style={st.legendaValor}>{resumo.porUnidade[u.nome]}</Text>
                  </View>
                ))}
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
              <LinhaNav
                titulo="Participantes"
                legenda={`${participantes.length} fichas · frequência por criança`}
                onPress={() => router.push('/secretaria/participantes')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <LinhaNav
                titulo="Relatório"
                legenda="Participação, retenção e qualidade"
                onPress={() => router.push('/secretaria/relatorio')}
              />
            </Animated.View>
          </>
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
                    <Text style={st.legenda}>Formulário no app, ou link para a família</Text>
                    {PENDENTES ? (
                      <View style={st.selo}>
                        <Text style={st.seloRotulo}>{PENDENTES} pendentes</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={st.chevron}>›</Text>
                </Card>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
              <Overline>Fichas</Overline>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Fichas e consentimentos</Text>
                  <Text style={st.legendaValor}>
                    {participantes.length - PENDENTES} de {participantes.length}
                  </Text>
                </View>
                <Barra
                  pct={((participantes.length - PENDENTES) / participantes.length) * 100}
                  cor={color.success}
                />
                <Text style={st.legendaAviso}>
                  {PENDENTES} fichas esperando consentimento assinado
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <LinhaNav
                titulo="Registros e exportação"
                legenda={`${participantes.length} participantes · PDF e CSV`}
              />
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function LinhaNav({
  titulo,
  legenda,
  onPress,
}: {
  titulo: string
  legenda: string
  onPress?: () => void
}) {
  const conteudo = (
    <Card style={st.linhaNav}>
      <View style={st.linhaTexto}>
        <Text style={st.cardTitulo}>{titulo}</Text>
        <Text style={st.legenda}>{legenda}</Text>
      </View>
      {onPress ? <Text style={st.chevron}>›</Text> : null}
    </Card>
  )

  // R24: card com seta e porta. Sem destino, sem seta e sem toque.
  if (!onPress) return conteudo

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && st.pressed}
      accessibilityRole="button">
      {conteudo}
    </Pressable>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },
  legendaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },
  valorMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.85 },
  chevron: { ...type.body, color: color.faint },

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

  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  linhaTexto: { flex: 1, gap: space.xs },
  cardDestaque: {
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
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(245, 165, 36, 0.14)',
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.warn },
  minimo: { minHeight: target.minimo },
})
