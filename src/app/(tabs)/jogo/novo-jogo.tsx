import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { MODALIDADES, campeonato, jogadoresEmCampo, type Modalidade } from '@/data/jogo'
import { unidadesInfo } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11g. Categoria e modalidade sao coisas diferentes (R3):
 * categoria e a divisao por idade e decide quem e elegivel (R2);
 * modalidade e o formato e decide quantos entram em campo.
 */
const CATEGORIAS = ['Sub-12', 'Sub-14', 'Sub-17', 'Sub-20'] as const

export default function NovoJogo() {
  const [adversario, setAdversario] = useState('')
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>('Sub-14')
  const [modalidade, setModalidade] = useState<Modalidade>('Campo')
  const [dataHora, setDataHora] = useState('')
  const [local, setLocal] = useState(unidadesInfo[0].endereco)

  const podeSalvar = adversario.trim().length > 0 && dataHora.trim().length > 0

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Novo jogo"
        subtitulo={`${campeonato.nome} · ${campeonato.rodada}`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.campo}>
          <Text style={st.rotulo}>Adversário</Text>
          <TextInput
            style={st.input}
            value={adversario}
            onChangeText={setAdversario}
            placeholder="Nome do time"
            placeholderTextColor={color.faint}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(motion.medium).delay(40)}
          style={st.campo}>
          <Text style={st.rotulo}>Categoria</Text>
          <View style={st.chips}>
            {CATEGORIAS.map((c) => (
              <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
            ))}
          </View>
          <Text style={st.legenda}>
            {categoria} pega crianças de {Number(categoria.replace(/\D/g, '')) - 1} e{' '}
            {categoria.replace(/\D/g, '')} anos
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(motion.medium).delay(80)}
          style={st.campo}>
          <Text style={st.rotulo}>Modalidade</Text>
          <View style={st.chips}>
            {MODALIDADES.map((m) => (
              <Chip key={m} rotulo={m} ativo={modalidade === m} onPress={() => setModalidade(m)} />
            ))}
          </View>
          <Text style={st.legenda}>{jogadoresEmCampo(modalidade)} em campo</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(motion.medium).delay(120)}
          style={st.campo}>
          <Text style={st.rotulo}>Data e hora</Text>
          <TextInput
            style={st.input}
            value={dataHora}
            onChangeText={setDataHora}
            placeholder="domingo · 15h"
            placeholderTextColor={color.faint}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(motion.medium).delay(160)}
          style={st.campo}>
          <Text style={st.rotulo}>Local</Text>
          <TextInput
            style={st.input}
            value={local}
            onChangeText={setLocal}
            placeholder="Onde o jogo acontece"
            placeholderTextColor={color.faint}
          />
        </Animated.View>

        <Card style={st.aviso}>
          <Text style={st.legenda}>
            Depois de salvar, convoque os atletas elegíveis e monte a escalação pelo card do jogo.
          </Text>
        </Card>

        <Pressable
          onPress={() => router.back()}
          disabled={!podeSalvar}
          style={({ pressed }) => [
            st.botao,
            pressed && st.pressed,
            !podeSalvar && st.botaoDesabilitado,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !podeSalvar }}>
          <Text style={st.botaoRotulo}>Salvar jogo</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.lg, paddingBottom: 120 },
  campo: { gap: space.sm },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  aviso: {},
  pressed: { opacity: 0.85 },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoDesabilitado: { opacity: 0.4 },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
