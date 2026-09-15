import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip } from '@/components/ui'
import { Campo } from '@/components/ui/campo'
import { HeroVoltar } from '@/components/ui/setor'
import { convocacoes, formacoesDe, partidas } from '@/data/jogo'
import { canvas, color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/** Telas 11c e 11n: a escalacao muda de formacoes conforme a modalidade (R3). */
export default function Escalacao() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const partida = partidas.find((p) => p.id === id)

  const { nomes, mapa } = formacoesDe(partida?.modalidade ?? 'Campo')
  const [formacao, setFormacao] = useState(nomes[0])
  const [salva, setSalva] = useState<string | null>(null)

  if (!partida) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar titulo="Jogo não encontrado" subtitulo="Volte para a lista de jogos" />
      </SafeAreaView>
    )
  }

  const convocacao = convocacoes[partida.id] ?? []
  const emCampo = convocacao.filter((c) => c.situacao === 'Em campo').length
  const noBanco = convocacao.length - emCampo
  const larguraCampo = canvas.width - canvas.gutter * 2

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={`ADAM × ${partida.adversario}`}
        subtitulo={`${partida.dia}, ${partida.data} · ${partida.hora} · ${partida.categoria} · ${partida.modalidade}`}
        acao={{
          icone: '⤴',
          rotulo: 'Compartilhar convocação',
          onPress: () =>
            router.push({ pathname: '/jogo/compartilhar/[id]', params: { id: partida.id } }),
        }}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <View style={st.formacoes}>
          {nomes.map((f) => (
            <Chip key={f} rotulo={f} ativo={formacao === f} onPress={() => setFormacao(f)} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Campo posicoes={mapa[formacao]} largura={larguraCampo} />
        </Animated.View>

        <View style={st.linhaTopo}>
          <Text style={st.legenda}>Toque num jogador para mover</Text>
          <Pressable
            onPress={() => setSalva(formacao)}
            hitSlop={space.sm}
            accessibilityRole="button">
            <Text style={st.link}>Salvar tática</Text>
          </Pressable>
        </View>

        {salva ? (
          <Text style={st.confirmacao}>Tática {salva} salva para este jogo</Text>
        ) : null}

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/jogo/convocados/[id]', params: { id: partida.id } })
            }
            style={({ pressed }) => pressed && st.pressed}
            accessibilityRole="button"
            accessibilityLabel="Ver convocados">
            <Card style={st.linhaNav}>
              <View style={st.linhaTexto}>
                <Text style={st.cardTitulo}>Convocados</Text>
                <Text style={st.legenda}>
                  {emCampo} em campo · {noBanco} no banco
                </Text>
              </View>
              <Text style={st.chevron}>›</Text>
            </Card>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Pressable
            onPress={() => {
              setSalva(formacao)
              router.back()
            }}
            style={({ pressed }) => [st.botao, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>Salvar escalação</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  formacoes: { flexDirection: 'row', gap: space.sm },

  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },
  confirmacao: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.success },
  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  linhaTexto: { flex: 1, gap: 2 },
  chevron: { ...type.body, color: color.faint },
  pressed: { opacity: 0.85 },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
