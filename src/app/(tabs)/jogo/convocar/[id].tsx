import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Chip } from '@/components/ui'
import { EstadoVazio } from '@/components/ui/estados'
import { HeroVoltar } from '@/components/ui/setor'
import { convocacoes, idadesDaCategoria, partidas } from '@/data/jogo'
import { POSICOES, participantes, type FuncaoCampo } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11q. A lista de elegiveis sai da idade da categoria (R2) — nao
 * existe lista mantida a mao.
 *
 * R4: quem nao tem funcao cadastrada aparece em "Todos" e desaparece
 * nos outros filtros. Isso e o empurrao para completar a ficha, nao um
 * bug: o filtro precisa filtrar de verdade (R10).
 */
const FILTROS: readonly (FuncaoCampo | 'Todos')[] = ['Todos', ...POSICOES]

export default function Convocar() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const partida = partidas.find((p) => p.id === id)

  const [filtro, setFiltro] = useState<FuncaoCampo | 'Todos'>('Todos')
  const [escolhidos, setEscolhidos] = useState<string[]>([])

  const jaConvocados = useMemo(
    () => new Set((convocacoes[id ?? ''] ?? []).map((c) => c.participanteId)),
    [id],
  )

  const faixa = idadesDaCategoria(partida?.categoria ?? '')

  const elegiveis = useMemo(
    () =>
      participantes
        .filter((p) => p.idade >= faixa.min && p.idade <= faixa.max)
        .filter((p) => !jaConvocados.has(p.id))
        .filter((p) => (filtro === 'Todos' ? true : p.funcaoCampo === filtro)),
    [faixa.min, faixa.max, jaConvocados, filtro],
  )

  if (!partida) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar titulo="Jogo não encontrado" subtitulo="Volte para a lista de jogos" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Convocar"
        subtitulo={`${partida.categoria} pega ${faixa.min} e ${faixa.max} anos`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <View style={st.filtros}>
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={f} ativo={filtro === f} onPress={() => setFiltro(f)} />
          ))}
        </View>

        {elegiveis.length ? (
          <Animated.View entering={FadeInDown.duration(motion.medium)}>
            <Card style={st.cardLista}>
              {elegiveis.map((p, i) => {
                const marcado = escolhidos.includes(p.id)
                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      setEscolhidos((atual) =>
                        marcado ? atual.filter((x) => x !== p.id) : [...atual, p.id],
                      )
                    }
                    style={({ pressed }) => [
                      st.linha,
                      i < elegiveis.length - 1 && st.divisoria,
                      pressed && st.pressed,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: marcado }}
                    accessibilityLabel={p.nome}>
                    <View style={[st.marca, marcado && st.marcaAtiva]}>
                      <Text style={[st.marcaIcone, marcado && st.marcaIconeAtiva]}>
                        {marcado ? '✓' : '+'}
                      </Text>
                    </View>
                    <Avatar iniciais={p.iniciais} size={36} />
                    <View style={st.linhaTexto}>
                      <Text style={st.linhaNome}>{p.nome}</Text>
                      <Text style={st.legenda}>
                        {p.idade} anos · {p.unidade}
                      </Text>
                    </View>
                    <View style={st.selo}>
                      <Text style={st.seloRotulo}>{p.funcaoCampo ?? 'sem posição'}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </Card>
          </Animated.View>
        ) : (
          <EstadoVazio
            titulo="Ninguém elegível aqui"
            linhas={
              filtro === 'Todos'
                ? [`Nenhuma criança de ${faixa.min} ou ${faixa.max} anos está livre para este jogo.`]
                : [
                    `Nenhum elegível com a função ${filtro}.`,
                    'Quem ainda não tem função cadastrada só aparece em "Todos".',
                  ]
            }
          />
        )}

        <Pressable
          onPress={() => router.back()}
          disabled={!escolhidos.length}
          style={({ pressed }) => [
            st.botao,
            pressed && st.pressed,
            !escolhidos.length && st.botaoDesabilitado,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !escolhidos.length }}>
          <Text style={st.botaoRotulo}>
            {escolhidos.length ? `Convocar ${escolhidos.length}` : 'Selecione quem convocar'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  filtros: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },

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

  marca: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  marcaAtiva: { backgroundColor: color.success, borderColor: color.success },
  marcaIcone: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.faint },
  marcaIconeAtiva: { color: color.bg },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

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
