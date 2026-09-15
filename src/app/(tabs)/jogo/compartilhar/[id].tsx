import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { convocacoes, partidas } from '@/data/jogo'
import { participantes } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11r. Gera a convocacao para mandar no grupo das familias. Nao
 * escreve nada: so formata o que ja existe.
 *
 * Nome curto ("Davi N.") de proposito: a mensagem sai do app para um
 * grupo de WhatsApp, e nome completo de crianca nao precisa ir junto.
 */
function nomeCurto(nome: string) {
  const [primeiro, segundo] = nome.trim().split(/\s+/)
  if (!segundo) return primeiro
  return `${primeiro} ${segundo.charAt(0)}.`
}

export default function Compartilhar() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const partida = partidas.find((p) => p.id === id)
  const [enviado, setEnviado] = useState(false)

  const { emCampo, banco } = useMemo(() => {
    const lista = convocacoes[id ?? ''] ?? []
    const nomes = (situacao: 'Em campo' | 'Banco') =>
      lista
        .filter((c) => c.situacao === situacao)
        .map((c) => participantes.find((p) => p.id === c.participanteId)?.nome)
        .filter((n): n is string => Boolean(n))
        .map(nomeCurto)
    return { emCampo: nomes('Em campo'), banco: nomes('Banco') }
  }, [id])

  if (!partida) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar titulo="Jogo não encontrado" subtitulo="Volte para a lista de jogos" />
      </SafeAreaView>
    )
  }

  const titulo = `ADAM × ${partida.adversario}`
  const quando = `${partida.dia}, ${partida.data} · ${partida.hora}`
  const onde = `${partida.local} · ${partida.categoria} · ${partida.modalidade}`

  // O texto enviado segue a mesma ordem da previa, linha por linha.
  const mensagem = [
    `*${titulo}*`,
    quando,
    onde,
    '',
    `*EM CAMPO (${emCampo.length})*`,
    emCampo.join(', '),
    '',
    `*BANCO (${banco.length})*`,
    banco.join(', '),
  ].join('\n')

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar titulo="Compartilhar" subtitulo="Convocação para o grupo das famílias" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
          <Overline>Como vai chegar no grupo</Overline>
          <Card style={st.previa}>
            <View style={st.bloco}>
              <Text style={st.titulo}>{titulo}</Text>
              <Text style={st.meta}>{quando}</Text>
              <Text style={st.meta}>{onde}</Text>
            </View>

            <View style={st.bloco}>
              <Text style={st.rotulo}>{`Em campo (${emCampo.length})`}</Text>
              <Text style={st.nomes}>{emCampo.join(', ')}</Text>
            </View>

            {banco.length ? (
              <View style={st.bloco}>
                <Text style={st.rotulo}>{`Banco (${banco.length})`}</Text>
                <Text style={st.nomes}>{banco.join(', ')}</Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        <Pressable
          onPress={async () => {
            await Share.share({ message: mensagem })
            setEnviado(true)
          }}
          style={({ pressed }) => [st.botao, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoRotulo}>Compartilhar convocação</Text>
        </Pressable>

        {enviado ? <Text style={st.confirmacao}>Convocação enviada</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  previa: { gap: space.lg },
  bloco: { gap: space.xs },
  titulo: { ...type.h2, fontFamily: 'Inter_400Regular', color: color.text },
  meta: { ...type.body, fontFamily: 'Inter_400Regular', color: color.muted },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nomes: { ...type.body, fontFamily: 'Inter_400Regular', color: color.text, lineHeight: 26 },
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
  confirmacao: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: color.success,
    textAlign: 'center',
  },
})
