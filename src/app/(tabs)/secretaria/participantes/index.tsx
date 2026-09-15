import { FlashList } from '@shopify/flash-list'
import { router, useLocalSearchParams } from 'expo-router'
import { memo, useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Chip, Hero } from '@/components/ui'
import { EstadoVazio } from '@/components/ui/estados'
import { Esqueleto, SkeletonLinha } from '@/components/ui/skeleton'
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

type Linha =
  | { tipo: 'cabecalho'; rotulo: string }
  | { tipo: 'item'; participante: Participante }

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
          {baixa ? '↓' : '↑'} {item.frequencia}%
        </Text>
      </View>
      <Text style={st.chevron}>›</Text>
    </Pressable>
  )
})

export default function Participantes() {
  const carregando = useCarregamento()
  const { filtro: filtroParam } = useLocalSearchParams<{ filtro?: string }>()
  const [filtro, setFiltro] = useState<Filtro>(
    filtroParam === 'baixa' ? 'Baixa freq.' : 'Todos',
  )

  /**
   * A Home entra aqui pedindo a lista de quem esta em queda. A aba
   * costuma ja estar montada, entao ler so o valor inicial ignoraria o
   * pedido a partir da segunda vez.
   *
   * O ajuste acontece durante o render, comparando com o parametro
   * anterior, e nao num efeito: setState dentro de efeito dispara um
   * segundo render em cascata e o React desaconselha.
   */
  const [paramAnterior, setParamAnterior] = useState(filtroParam)
  if (filtroParam !== paramAnterior) {
    setParamAnterior(filtroParam)
    if (filtroParam === 'baixa') setFiltro('Baixa freq.')
  }
  const [busca, setBusca] = useState('')
  // Sem toLocaleTimeString: depende de dados de localizacao que o
  // Hermes do Expo Go nem sempre traz completos.
  const horaAtual = useMemo(() => {
    const agora = new Date()
    const hh = String(agora.getHours()).padStart(2, '0')
    const mm = String(agora.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }, [])

  const filtrados = useMemo(() => {
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

  /**
   * Fora do filtro "Baixa freq." (onde todo mundo ja esta em queda), a
   * lista se agrupa como nas telas 05b/05c do Figma: quem precisa de
   * atencao primeiro, depois quem esta com frequencia saudavel.
   */
  const lista = useMemo(() => {
    if (filtro === 'Baixa freq.') {
      return filtrados.map((p) => ({ tipo: 'item' as const, participante: p }))
    }
    const emQueda = filtrados.filter((p) => p.frequencia < LIMITE_BAIXA_FREQUENCIA)
    const saudaveis = filtrados.filter((p) => p.frequencia >= LIMITE_BAIXA_FREQUENCIA)
    const linhas: Linha[] = []
    if (emQueda.length) {
      linhas.push({ tipo: 'cabecalho', rotulo: `Precisam de atenção · ${emQueda.length}` })
      linhas.push(...emQueda.map((p) => ({ tipo: 'item' as const, participante: p })))
    }
    if (saudaveis.length) {
      linhas.push({ tipo: 'cabecalho', rotulo: 'Frequência saudável' })
      linhas.push(...saudaveis.map((p) => ({ tipo: 'item' as const, participante: p })))
    }
    return linhas
  }, [filtrados, filtro])

  // Referencia estavel: uma funcao nova a cada render invalidaria a
  // memoizacao de todos os itens.
  const abrirPerfil = useCallback((id: string) => {
    router.push({ pathname: '/secretaria/participantes/[id]', params: { id } })
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: Linha }) =>
      item.tipo === 'cabecalho' ? (
        <Text style={st.cabecalhoGrupo}>{item.rotulo}</Text>
      ) : (
        <ItemParticipante item={item.participante} onPress={abrirPerfil} />
      ),
    [abrirPerfil],
  )
  const keyExtractor = useCallback(
    (item: Linha) => (item.tipo === 'cabecalho' ? item.rotulo : item.participante.id),
    [],
  )
  const getItemType = useCallback((item: Linha) => item.tipo, [])

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero
        titulo="Participantes"
        subtitulo={`${participantes.length} ativos · atualizado hoje, ${horaAtual}`}
        acao={{
          icone: '⟲',
          rotulo: 'Limpar filtros',
          onPress: () => {
            setFiltro('Todos')
            setBusca('')
          },
        }}
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
          <Esqueleto>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonLinha key={i} />
            ))}
          </Esqueleto>
        </View>
      ) : (
      <FlashList
        data={lista}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
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
    <EstadoVazio
      titulo="Nenhum participante"
      linhas={[
        'Nada corresponde à busca e ao filtro atuais.',
        'Limpe o campo ou volte para "Todos" para ver a lista completa.',
      ]}
      acao={{ rotulo: 'Cadastrar criança', onPress: () => router.push('/secretaria/participantes/cadastrar') }}
      dica="A ficha leva 2 minutos"
    />
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
  cabecalhoGrupo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

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

})
