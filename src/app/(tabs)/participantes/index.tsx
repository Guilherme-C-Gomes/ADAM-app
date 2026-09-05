import { FlashList } from '@shopify/flash-list'
import { router } from 'expo-router'
import { memo, useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Chip, Hero } from '@/components/ui'
import { SkeletonLinha } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import {
  LIMITE_BAIXA_FREQUENCIA,
  participantes,
  type Participante,
  type Unidade,
} from '@/data/mock'
import { color, radius, space, type } from '@/theme/tokens'

type Filtro = 'Todos' | Unidade | 'Baixa freq.'
const FILTROS: Filtro[] = ['Todos', 'Atibaia', 'Caiana', 'Baixa freq.']

/**
 * Item memoizado: sem isso, cada digito na busca re-renderiza a lista
 * inteira em vez de apenas as linhas que mudaram.
 */
const ItemParticipante = memo(function ItemParticipante({
  item,
  onPress,
}: {
  item: Participante
  onPress: (id: string) => void
}) {
  const baixa = item.frequencia < LIMITE_BAIXA_FREQUENCIA
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [st.item, pressed && st.itemPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.nome}, ${item.frequencia}% de presença`}>
      <Avatar iniciais={item.iniciais} />
      <View style={st.itemTexto}>
        <Text style={st.itemNome}>{item.nome}</Text>
        <Text style={st.itemMeta}>
          {item.idade} anos · {item.unidade}
        </Text>
      </View>
      <View style={[st.chipFreq, baixa ? st.chipFreqBaixa : st.chipFreqOk]}>
        <Text style={[st.chipFreqValor, baixa ? st.corBaixa : st.corOk]}>
          {item.frequencia}%
        </Text>
      </View>
      <Text style={st.chevron}>›</Text>
    </Pressable>
  )
})

export default function Participantes() {
  const carregando = useCarregamento()
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return participantes
      .filter((p) => {
        if (filtro === 'Baixa freq.') return p.frequencia < LIMITE_BAIXA_FREQUENCIA
        if (filtro !== 'Todos') return p.unidade === filtro
        return true
      })
      .filter((p) => (termo ? p.nome.toLowerCase().includes(termo) : true))
      .sort((a, b) => a.frequencia - b.frequencia)
  }, [filtro, busca])

  // Referencia estavel: uma funcao nova a cada render invalidaria a
  // memoizacao de todos os itens.
  const abrirPerfil = useCallback((id: string) => {
    router.push({ pathname: '/participantes/[id]', params: { id } })
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: Participante }) => (
      <ItemParticipante item={item} onPress={abrirPerfil} />
    ),
    [abrirPerfil],
  )
  const keyExtractor = useCallback((item: Participante) => item.id, [])

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero
        titulo="Participantes"
        subtitulo={`${lista.length} de ${participantes.length} no filtro atual`}
      />

      <View style={st.controles}>
        <TextInput
          style={st.busca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome"
          placeholderTextColor={color.faint}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <View style={st.filtros}>
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={f} ativo={filtro === f} onPress={() => setFiltro(f)} />
          ))}
        </View>
      </View>

      {carregando ? (
        <View style={st.lista}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={i > 0 && st.separador}>
              <SkeletonLinha />
            </View>
          ))}
        </View>
      ) : (
      <FlashList
        data={lista}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={st.lista}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={Vazio}
        showsVerticalScrollIndicator={false}
      />
      )}
    </SafeAreaView>
  )
}

function Separador() {
  return <View style={st.separador} />
}

function Vazio() {
  return (
    <View style={st.vazio}>
      <Text style={st.vazioTitulo}>Nenhum participante</Text>
      <Text style={st.vazioTexto}>Ajuste a busca ou troque o filtro.</Text>
    </View>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  controles: { paddingHorizontal: space.lg, paddingTop: space.base, gap: space.md },
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
  lista: { padding: space.lg },
  separador: { height: space.md },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 72,
    paddingHorizontal: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  itemPressed: { opacity: 0.7 },
  chevron: { ...type.body, color: color.faint, marginLeft: -space.xs },
  itemTexto: { flex: 1, gap: 2 },
  itemNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  itemMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  chipFreq: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  chipFreqOk: { backgroundColor: 'rgba(61, 214, 140, 0.12)' },
  chipFreqBaixa: { backgroundColor: 'rgba(245, 165, 36, 0.14)' },
  chipFreqValor: { ...type.small, fontFamily: 'Inter_600SemiBold' },
  corOk: { color: color.success },
  corBaixa: { color: color.warn },

  vazio: { alignItems: 'center', paddingTop: space.xxxl, gap: space.sm },
  vazioTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  vazioTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
