import { FlashList } from '@shopify/flash-list'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { memo, useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Chip, Hero } from '@/components/ui'
import { EstadoVazio } from '@/components/ui/estados'
import { Esqueleto, SkeletonLinha } from '@/components/ui/skeleton'
import { Icone } from '@/components/ui/icone'
import { Pressionavel } from '@/components/ui/movimento'
import { useUnidades } from '@/data/chamada'
import { emQueda, useParticipantes, type Participante } from '@/data/fichas'
import { color, ESPACO_FIM_DA_TELA, radius, space, type } from '@/theme/tokens'
import { COR_FOCO, useFoco } from '@/hooks/use-foco'

const TODOS = 'Todos'
const BAIXA = 'Baixa freq.'

type Linha = { tipo: 'cabecalho'; rotulo: string } | { tipo: 'item'; participante: Participante }

/** Abaixo do limite. Quem ainda nao teve chamada nao entra na conta. */

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
  const semChamada = item.frequencia === null
  const baixa = emQueda(item)
  return (
    <Pressionavel
      onPress={() => onPress(item.id)}
      escala={0.98}
      opacidade={0.7}
      style={st.item}
      accessibilityRole="button"
      accessibilityLabel={
        semChamada
          ? `${item.nome}, ainda sem chamada`
          : `${item.nome}, ${item.frequencia}% de presença`
      }>
      <Avatar iniciais={item.iniciais} foto={item.fotoUrl} />
      <View style={st.itemTexto}>
        <Text style={st.itemNome}>{item.nome}</Text>
        <Text style={st.itemMeta}>
          {item.idade} anos · {item.unidade}
        </Text>
      </View>
      {semChamada ? (
        <View style={[st.chipFreq, st.chipFreqNeutro]}>
          <Text style={[st.chipFreqValor, st.corNeutra]}>sem chamada</Text>
        </View>
      ) : (
        <View style={[st.chipFreq, baixa ? st.chipFreqBaixa : st.chipFreqOk]}>
          <Icone
            nome={baixa ? 'desce' : 'sobe'}
            cor={baixa ? color.warn : color.success}
            tamanho={12}
          />
          <Text style={[st.chipFreqValor, baixa ? st.corBaixa : st.corOk]}>{item.frequencia}%</Text>
        </View>
      )}
      <Icone nome="seta" cor={color.faint} />
    </Pressionavel>
  )
})

export default function Participantes() {
  const { lista: todos, carregando, erro, atualizadoEm, recarregar } = useParticipantes()
  const unidades = useUnidades()
  const params = useLocalSearchParams<{ filtro?: string; unidade?: string }>()
  // a unidade e a baixa frequencia se somam: "Baixa freq." em Atibaia e
  // exatamente quem o card "em queda" de Atibaia contou
  const [unidade, setUnidade] = useState<string>(params.unidade ?? TODOS)
  const [soBaixa, setSoBaixa] = useState(params.filtro === 'baixa')

  // voltar de uma ficha salva traz a lista atualizada
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
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
  const pedido = `${params.filtro ?? ''}|${params.unidade ?? ''}`
  const [pedidoAnterior, setPedidoAnterior] = useState(pedido)
  if (pedido !== pedidoAnterior) {
    setPedidoAnterior(pedido)
    setSoBaixa(params.filtro === 'baixa')
    setUnidade(params.unidade ?? TODOS)
  }
  const [busca, setBusca] = useState('')
  const foco = useFoco()
  const unidadesFiltro = [TODOS, ...unidades.dados.map((u) => u.nome)]

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return todos
      .filter((p) => (unidade === TODOS ? true : p.unidade === unidade))
      .filter((p) => (soBaixa ? emQueda(p) : true))
      .filter((p) => (termo ? p.nome.toLowerCase().includes(termo) : true))
      .sort((a, b) => (a.frequencia ?? 101) - (b.frequencia ?? 101))
  }, [todos, unidade, soBaixa, busca])

  /**
   * Fora do filtro "Baixa freq." (onde todo mundo ja esta em queda), a
   * lista se agrupa como nas telas 05b/05c do Figma: quem precisa de
   * atencao primeiro, depois quem esta com frequencia saudavel. Quem
   * ainda nao teve chamada encerrada fica por ultimo, a parte.
   */
  const lista = useMemo(() => {
    if (soBaixa) {
      return filtrados.map((p) => ({ tipo: 'item' as const, participante: p }))
    }
    const grupos: [string, Participante[]][] = [
      ['Precisam de atenção', filtrados.filter(emQueda)],
      ['Frequência saudável', filtrados.filter((p) => p.frequencia !== null && !emQueda(p))],
      ['Ainda sem chamada', filtrados.filter((p) => p.frequencia === null)],
    ]
    const linhas: Linha[] = []
    for (const [rotulo, grupo] of grupos) {
      if (!grupo.length) continue
      linhas.push({ tipo: 'cabecalho', rotulo: `${rotulo} · ${grupo.length}` })
      linhas.push(...grupo.map((p) => ({ tipo: 'item' as const, participante: p })))
    }
    return linhas
  }, [filtrados, soBaixa])

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

  const subtitulo = carregando
    ? 'Carregando as fichas…'
    : `${todos.length} ${todos.length === 1 ? 'ativo' : 'ativos'} · atualizado hoje, ${atualizadoEm}`

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero
        titulo="Participantes"
        subtitulo={subtitulo}
        acao={{
          icone: 'sync',
          rotulo: 'Atualizar e limpar filtros',
          onPress: () => {
            setUnidade(TODOS)
            setSoBaixa(false)
            setBusca('')
            recarregar()
          },
        }}
      />

      <View style={st.controles}>
        <TextInput
          style={[st.busca, foco.focado && st.focado]}
          {...foco.eventos}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome"
          placeholderTextColor={color.faint}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <View style={st.filtros}>
          {unidadesFiltro.map((f) => (
            <Chip key={f} rotulo={f} ativo={unidade === f} onPress={() => setUnidade(f)} />
          ))}
          <Chip rotulo={BAIXA} ativo={soBaixa} onPress={() => setSoBaixa((v) => !v)} />
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
      ) : erro ? (
        <EstadoVazio
          titulo="Sem conexão com as fichas"
          linhas={[erro, 'Confira a internet e tente de novo.']}
          acao={{ rotulo: 'Tentar de novo', onPress: recarregar }}
        />
      ) : (
        <FlashList
          data={lista}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          contentContainerStyle={st.lista}
          ItemSeparatorComponent={Separador}
          ListEmptyComponent={todos.length ? SemResultado : SemFichas}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

function Separador() {
  return <View style={st.separador} />
}

function SemResultado() {
  return (
    <EstadoVazio
      titulo="Nenhum participante"
      linhas={[
        'Nada corresponde à busca e ao filtro atuais.',
        'Limpe o campo ou volte para "Todos" para ver a lista completa.',
      ]}
    />
  )
}

function SemFichas() {
  return (
    <EstadoVazio
      titulo="Nenhuma criança cadastrada"
      linhas={['As fichas que a Secretaria cadastrar aparecem aqui, com a frequência de cada uma.']}
      acao={{
        rotulo: 'Cadastrar criança',
        onPress: () => router.push('/secretaria/participantes/cadastrar'),
      }}
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
    borderWidth: 1,
    borderColor: 'transparent',
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  focado: { borderColor: COR_FOCO },
  filtros: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  lista: { padding: space.lg, paddingBottom: ESPACO_FIM_DA_TELA },
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
  itemTexto: { flex: 1, gap: 2 },
  itemNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  itemMeta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  chipFreq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  chipFreqOk: { backgroundColor: 'rgba(61, 214, 140, 0.12)' },
  chipFreqBaixa: { backgroundColor: 'rgba(245, 165, 36, 0.14)' },
  chipFreqNeutro: { backgroundColor: color.surface2 },
  chipFreqValor: { ...type.small, fontFamily: 'Inter_600SemiBold' },
  corOk: { color: color.success },
  corBaixa: { color: color.warn },
  corNeutra: { color: color.muted },
})
