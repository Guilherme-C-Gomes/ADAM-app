import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Overline } from '@/components/ui'
import { HeroSetor, Segmentado } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import {
  LIMITE_COMPREENSAO,
  avaliacaoRecente,
  campeonato,
  escalaSemana,
  partidas,
  treinos,
} from '@/data/jogo'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

const ABAS = ['Treinos', 'Jogos', 'Escala'] as const
type Aba = (typeof ABAS)[number]

const SUBTITULO: Record<Aba, string> = {
  Treinos: 'Sábado, 5 de setembro',
  Jogos: `${campeonato.nome} · ${campeonato.rodada}`,
  Escala: 'Semana de 1 a 7 de setembro',
}

export default function Jogo() {
  const [aba, setAba] = useState<Aba>('Treinos')
  const carregando = useCarregamento()

  const treinosHoje = treinos.filter((t) => t.hoje)
  const proximos = treinos.filter((t) => !t.hoje)
  const semTecnico = escalaSemana.filter((l) => l.tecnico === null)

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Jogo" subtitulo={SUBTITULO[aba]} />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Segmentado opcoes={ABAS} valor={aba} onChange={setAba} />

        {carregando ? (
          <Esqueleto>
            <SkeletonLista linhas={2} />
            <SkeletonLista linhas={2} />
            <SkeletonCard altura={96} />
          </Esqueleto>
        ) : aba === 'Treinos' ? (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
              <Overline>Treinos de hoje</Overline>
              <Card style={st.cardLista}>
                {treinosHoje.map((t, i) => (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push(`/jogo/treino/${t.id}`)}
                    style={({ pressed }) => [
                      st.linhaTreino,
                      i < treinosHoje.length - 1 && st.divisoria,
                      pressed && st.pressed,
                    ]}
                    accessibilityRole="button">
                    <View style={st.acento} />
                    <View style={st.linhaTexto}>
                      <Text style={st.linhaNome}>{t.turma}</Text>
                      <Text style={st.legenda}>
                        {t.local} · {t.responsavel ?? 'a definir'}
                      </Text>
                    </View>
                    <View style={st.selo}>
                      <Text style={st.seloRotulo}>{t.hora}</Text>
                    </View>
                    <Text style={st.chevron}>›</Text>
                  </Pressable>
                ))}
              </Card>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(motion.medium).delay(40)}
              style={st.secao}>
              <Overline>Próximos treinos</Overline>
              <Card style={st.cardLista}>
                {proximos.map((t, i) => (
                  <View
                    key={t.id}
                    style={[st.linha, i < proximos.length - 1 && st.divisoria]}>
                    <View style={st.linhaTexto}>
                      <Text style={st.linhaNome}>
                        {t.data} · {t.hora}
                      </Text>
                      <Text style={[st.legenda, !t.responsavel && st.legendaAviso]}>
                        {t.responsavel ?? 'a definir'}
                      </Text>
                    </View>
                    <Text style={st.legenda}>{t.turma}</Text>
                  </View>
                ))}
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <Pressable
                onPress={() => router.push('/jogo/planejar')}
                style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
                accessibilityRole="button">
                <Text style={st.botaoSecundarioRotulo}>Planejar treino</Text>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)}>
              <Card>
                <View style={st.linhaTopo}>
                  <Text style={st.cardTitulo}>Como estão os treinos</Text>
                  <Text style={st.legenda}>{avaliacaoRecente.avaliados} avaliados</Text>
                </View>
                <View style={st.notas}>
                  <Nota valor={avaliacaoRecente.treino} rotulo="treino" />
                  <Nota
                    valor={avaliacaoRecente.entenderam}
                    rotulo="entenderam"
                    alerta={avaliacaoRecente.entenderam < LIMITE_COMPREENSAO}
                  />
                  <Nota valor={avaliacaoRecente.dificuldade} rotulo="dificuldade" />
                </View>
              </Card>
            </Animated.View>
          </>
        ) : aba === 'Jogos' ? (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
              <Overline>{`Próximos jogos · ${partidas.length}`}</Overline>
              {partidas.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/jogo/partida/${p.id}`)}
                  style={({ pressed }) => pressed && st.pressed}
                  accessibilityRole="button">
                  <Card style={st.cardPartida}>
                    <View style={st.acento} />
                    <View style={st.linhaTexto}>
                      <Text style={st.linhaNome}>ADAM × {p.adversario}</Text>
                      <Text style={st.legenda}>
                        {p.dia}, {p.data} · {p.hora}
                      </Text>
                      <Text style={st.legenda}>{p.local}</Text>
                    </View>
                    <View style={st.selos}>
                      <View style={st.seloCategoria}>
                        <Text style={st.seloCategoriaRotulo}>{p.categoria}</Text>
                      </View>
                      <View style={st.selo}>
                        <Text style={st.seloRotulo}>{p.modalidade}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
              <Card style={st.linhaNav}>
                <View style={st.linhaTexto}>
                  <Text style={st.cardTitulo}>Classificação e resultados</Text>
                  <Text style={st.legenda}>
                    {campeonato.posicao} · {campeonato.pontos} pontos · {campeonato.jogos} jogos
                  </Text>
                </View>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <Pressable
                onPress={() => router.push('/jogo/novo-jogo')}
                style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
                accessibilityRole="button">
                <Text style={st.botaoSecundarioRotulo}>Adicionar jogo</Text>
              </Pressable>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
              <Overline>Escala dos técnicos</Overline>
              <Card style={st.cardLista}>
                {escalaSemana.map((l, i) => (
                  <View
                    key={l.id}
                    style={[st.linha, i < escalaSemana.length - 1 && st.divisoria]}>
                    <Text style={st.escalaDia}>{l.dia}</Text>
                    <Text style={st.escalaHora}>{l.hora}</Text>
                    <Text style={[st.escalaNome, !l.tecnico && st.legendaAviso]}>
                      {l.tecnico ?? 'a definir'}
                    </Text>
                    <Text style={st.legenda}>{l.turma}</Text>
                  </View>
                ))}
              </Card>
            </Animated.View>

            {semTecnico.length ? (
              <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
                <Pressable
                  onPress={() => router.push('/jogo/escala')}
                  style={({ pressed }) => pressed && st.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={`${semTecnico.length} treinos sem técnico, abrir escala`}>
                  <Card style={st.cardAlerta}>
                    <View style={st.acentoAviso} />
                    <View style={st.linhaTexto}>
                      <Text style={st.cardTitulo}>
                        {semTecnico.length} treinos sem técnico
                      </Text>
                      <Text style={st.legenda}>
                        {semTecnico.map((l) => `${l.dia}, ${l.hora}`).join(' e ')}
                      </Text>
                    </View>
                    <Text style={st.chevron}>›</Text>
                  </Card>
                </Pressable>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
              <Pressable
                onPress={() => router.push('/jogo/escala')}
                style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
                accessibilityRole="button">
                <Text style={st.botaoSecundarioRotulo}>Editar escala</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Nota({
  valor,
  rotulo,
  alerta,
}: {
  valor: number
  rotulo: string
  alerta?: boolean
}) {
  return (
    <View style={st.nota}>
      <Text style={[st.notaValor, alerta && st.notaValorAlerta]}>
        {valor.toFixed(1).replace('.', ',')}
      </Text>
      <Text style={st.legenda}>{rotulo}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { color: color.warn },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.7 },
  chevron: { ...type.body, color: color.faint },

  cardLista: { paddingVertical: space.xs, gap: 0, overflow: 'hidden' },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaTreino: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingLeft: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },

  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
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

  selos: { alignItems: 'flex-end', gap: space.sm },
  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.muted },
  seloCategoria: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloCategoriaRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

  cardPartida: {
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
  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },

  escalaDia: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted, width: 32 },
  escalaHora: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text, width: 36 },
  escalaNome: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },

  notas: { flexDirection: 'row', justifyContent: 'space-between' },
  nota: { flex: 1, gap: space.xs },
  notaValor: { ...type.h1, fontFamily: 'Inter_700Bold', color: color.text },
  notaValorAlerta: { color: color.warn },

  botaoSecundario: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  botaoSecundarioRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
