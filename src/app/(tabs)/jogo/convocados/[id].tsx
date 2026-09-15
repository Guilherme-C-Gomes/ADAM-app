import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card } from '@/components/ui'
import { EstadoVazio } from '@/components/ui/estados'
import { HeroVoltar, Segmentado } from '@/components/ui/setor'
import {
  convocacoes,
  jogadoresEmCampo,
  partidas,
  type SituacaoConvocacao,
} from '@/data/jogo'
import { participantes } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Telas 11o e 11o2. Duas situacoes, uma lista: quem esta em campo e
 * quem esta no banco. Tocar numa linha remaneja entre as duas — e o
 * que a escalacao le depois.
 *
 * R3: quantos cabem em campo sai da modalidade, nao de numero fixo.
 */
export default function Convocados() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const partida = partidas.find((p) => p.id === id)

  const [lista, setLista] = useState(() => convocacoes[id ?? ''] ?? [])
  const [situacao, setSituacao] = useState<SituacaoConvocacao>('Em campo')

  const porSituacao = useMemo(
    () =>
      lista
        .filter((c) => c.situacao === situacao)
        .map((c) => ({ convocacao: c, pessoa: participantes.find((p) => p.id === c.participanteId) }))
        .filter((x) => x.pessoa),
    [lista, situacao],
  )

  if (!partida) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar titulo="Jogo não encontrado" subtitulo="Volte para a lista de jogos" />
      </SafeAreaView>
    )
  }

  const limiteCampo = jogadoresEmCampo(partida.modalidade)
  const emCampo = lista.filter((c) => c.situacao === 'Em campo').length
  const noBanco = lista.length - emCampo

  const remanejar = (participanteId: string) =>
    setLista((atual) =>
      atual.map((c) =>
        c.participanteId === participanteId
          ? { ...c, situacao: c.situacao === 'Em campo' ? 'Banco' : 'Em campo' }
          : c,
      ),
    )

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Convocados"
        subtitulo={`ADAM × ${partida.adversario} · ${partida.categoria} · ${partida.modalidade}`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Segmentado
          opcoes={[`Em campo · ${emCampo}`, `Banco · ${noBanco}`] as const}
          valor={situacao === 'Em campo' ? `Em campo · ${emCampo}` : `Banco · ${noBanco}`}
          onChange={(v) => setSituacao(v.startsWith('Em campo') ? 'Em campo' : 'Banco')}
        />

        {situacao === 'Em campo' && emCampo !== limiteCampo ? (
          <Card style={st.aviso}>
            <View style={st.acentoAviso} />
            <Text style={st.avisoTexto}>
              {emCampo < limiteCampo
                ? `Faltam ${limiteCampo - emCampo} para completar os ${limiteCampo} de ${partida.modalidade.toLowerCase()}`
                : `${emCampo - limiteCampo} a mais do que os ${limiteCampo} de ${partida.modalidade.toLowerCase()}`}
            </Text>
          </Card>
        ) : null}

        {porSituacao.length ? (
          <Animated.View entering={FadeInDown.duration(motion.medium)}>
            <Card style={st.cardLista}>
              {porSituacao.map(({ pessoa }, i) => (
                <Pressable
                  key={pessoa!.id}
                  onPress={() => remanejar(pessoa!.id)}
                  style={({ pressed }) => [
                    st.linha,
                    i < porSituacao.length - 1 && st.divisoria,
                    pressed && st.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${pessoa!.nome}, mover para ${
                    situacao === 'Em campo' ? 'o banco' : 'o campo'
                  }`}>
                  <Avatar iniciais={pessoa!.iniciais} size={36} />
                  <View style={st.linhaTexto}>
                    <Text style={st.linhaNome}>{pessoa!.nome}</Text>
                    <Text style={st.legenda}>
                      {pessoa!.idade} anos · {pessoa!.unidade}
                    </Text>
                  </View>
                  <View style={st.selo}>
                    <Text style={st.seloRotulo}>{pessoa!.funcaoCampo ?? 'sem posição'}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </Animated.View>
        ) : (
          <EstadoVazio
            titulo={situacao === 'Em campo' ? 'Ninguém em campo' : 'Banco vazio'}
            linhas={[
              'Convoque atletas elegíveis para este jogo.',
              'Toque em quem já está convocado para mover entre campo e banco.',
            ]}
          />
        )}

        <Pressable
          onPress={() =>
            router.push({ pathname: '/jogo/convocar/[id]', params: { id: partida.id } })
          }
          style={({ pressed }) => [st.botao, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoRotulo}>Convocar mais atletas</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  pressed: { opacity: 0.7 },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

  aviso: { paddingLeft: space.lg, overflow: 'hidden' },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
  avisoTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },

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
