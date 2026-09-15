import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip } from '@/components/ui'
import { HeroVoltar, Segmentado } from '@/components/ui/setor'
import { exercicios, treinos, type CategoriaExercicio } from '@/data/jogo'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11h. A biblioteca e da ADAM, nao do treinador que cadastrou
 * (R18): o que entra aqui fica disponivel para todos os treinos.
 */
const MODOS = ['Do banco', 'Novo exercício'] as const
const CATEGORIAS: (CategoriaExercicio | 'Todos')[] = ['Todos', 'Aquecimento', 'Técnica', 'Tático', 'Jogo']

export default function Biblioteca() {
  const [modo, setModo] = useState<(typeof MODOS)[number]>('Do banco')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<CategoriaExercicio | 'Todos'>('Todos')
  const [noTreino, setNoTreino] = useState<string[]>(() =>
    treinos[2].exercicios.map((e) => e.exercicioId),
  )

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return exercicios
      .filter((e) => (categoria === 'Todos' ? true : e.categoria === categoria))
      .filter((e) => (termo ? e.nome.toLowerCase().includes(termo) : true))
  }, [busca, categoria])

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar titulo="Exercícios" subtitulo="Toque para pôr ou tirar do treino" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Segmentado opcoes={MODOS} valor={modo} onChange={setModo} />

        {modo === 'Do banco' ? (
          <>
            <TextInput
              style={st.busca}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar exercício"
              placeholderTextColor={color.faint}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            <View style={st.filtros}>
              {CATEGORIAS.map((c) => (
                <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
              ))}
            </View>

            <Animated.View entering={FadeInDown.duration(motion.medium)}>
              <Card style={st.cardLista}>
                {lista.map((e, i) => {
                  const dentro = noTreino.includes(e.id)
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() =>
                        setNoTreino((atual) =>
                          dentro ? atual.filter((x) => x !== e.id) : [...atual, e.id],
                        )
                      }
                      style={({ pressed }) => [
                        st.linha,
                        i < lista.length - 1 && st.divisoria,
                        pressed && st.pressed,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: dentro }}
                      accessibilityLabel={e.nome}>
                      <View style={[st.marca, dentro && st.marcaDentro]}>
                        <Text style={[st.marcaIcone, dentro && st.marcaIconeDentro]}>
                          {dentro ? '✓' : '+'}
                        </Text>
                      </View>
                      <View style={st.linhaTexto}>
                        <Text style={st.linhaNome}>{e.nome}</Text>
                        <Text style={st.legenda}>{e.categoria}</Text>
                      </View>
                      <Text style={st.legenda}>{e.duracaoMin} min</Text>
                    </Pressable>
                  )
                })}
              </Card>
            </Animated.View>
          </>
        ) : (
          <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.form}>
            <Text style={st.legenda}>
              O exercício salvo aqui fica disponível para todos os treinos da ADAM.
            </Text>
            <TextInput
              style={st.campo}
              placeholder="Nome do exercício"
              placeholderTextColor={color.faint}
            />
            <TextInput
              style={st.campo}
              placeholder="Duração em minutos"
              placeholderTextColor={color.faint}
              keyboardType="number-pad"
            />
            <TextInput
              style={st.campo}
              placeholder="Material (opcional)"
              placeholderTextColor={color.faint}
            />
            <View style={st.filtros}>
              {CATEGORIAS.filter((c) => c !== 'Todos').map((c) => (
                <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
              ))}
            </View>
          </Animated.View>
        )}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.botao, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoRotulo}>
            {modo === 'Do banco' ? `Concluir · ${noTreino.length} no treino` : 'Salvar exercício'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },

  busca: {
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
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
  marcaDentro: { backgroundColor: color.success, borderColor: color.success },
  marcaIcone: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.faint },
  marcaIconeDentro: { color: color.bg },

  form: { gap: space.md },
  campo: {
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },

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
