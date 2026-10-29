import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Chip } from '@/components/ui'
import { EstadoVazio } from '@/components/ui/estados'
import { Aviso } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, molaPop, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { idadesDaCategoria } from '@/data/jogo'
import { convocar, NOME_POSICAO, useAtletas, useDetalheJogo, type Atleta } from '@/data/jogo-dados'
import { voltar } from '@/lib/navegacao'
import {
  color,
  motion,
  onDark,
  radius,
  space,
  target,
  type,
  ESPACO_FIM_DA_TELA,
} from '@/theme/tokens'

/**
 * Tela 11q. A lista de elegiveis sai da idade da categoria (R2) — nao existe
 * lista mantida a mao.
 *
 * R4: quem nao tem posicao cadastrada aparece em "Todos" e desaparece nos
 * outros filtros. Isso e o empurrao para completar a ficha, nao um bug: o
 * filtro precisa filtrar de verdade (R10).
 */
type Filtro = NonNullable<Atleta['posicao']> | 'todos'
const FILTROS: Filtro[] = ['todos', 'goleiro', 'defesa', 'meio', 'ataque']
const CURTO: Record<Filtro, string> = {
  todos: 'Todos',
  goleiro: 'Gol',
  defesa: 'Def',
  meio: 'Meio',
  ataque: 'Ata',
}

export default function Convocar() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const detalhe = useDetalheJogo(id)
  const atletas = useAtletas()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const jogo = detalhe.dados?.jogo
  const faixa = idadesDaCategoria(jogo?.categoria ?? '')
  const jaConvocados = useMemo(
    () => new Set((detalhe.dados?.convocados ?? []).map((c) => c.criancaId)),
    [detalhe.dados],
  )
  const elegiveis = atletas.lista
    .filter((p) => p.idade >= faixa.min && p.idade <= faixa.max)
    .filter((p) => !jaConvocados.has(p.id))
    .filter((p) => (filtro === 'todos' ? true : p.posicao === filtro))

  if (!jogo) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar
          titulo={detalhe.carregando ? 'Abrindo…' : 'Jogo não encontrado'}
          subtitulo="Volte para a lista de jogos"
          voltarPara="/jogo"
        />
        {detalhe.carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </SafeAreaView>
    )
  }

  const confirmar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      await convocar(jogo.id, escolhidos)
      mostrarRecado(
        `${escolhidos.length} ${escolhidos.length === 1 ? 'criança convocada' : 'crianças convocadas'}`,
      )
      voltar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível convocar.')
      setSalvando(false)
    }
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Convocar"
        subtitulo={`${jogo.categoria} · só crianças de ${faixa.min} e ${faixa.max} anos`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        <View style={st.filtros}>
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={CURTO[f]} ativo={filtro === f} onPress={() => setFiltro(f)} />
          ))}
        </View>

        {atletas.carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : atletas.erro ? (
          <Aviso tom="ambar" titulo={atletas.erro} texto="Volte e abra de novo em instantes." />
        ) : elegiveis.length ? (
          <Animated.View entering={entrada(0)}>
            <Card style={st.cardLista}>
              {elegiveis.map((p, i) => {
                const marcado = escolhidos.includes(p.id)
                return (
                  <Animated.View key={p.id} entering={entrada(i, { base: 40 })}>
                    <Pressionavel
                      onPress={() =>
                        setEscolhidos((atual) =>
                          marcado ? atual.filter((x) => x !== p.id) : [...atual, p.id],
                        )
                      }
                      escala={0.98}
                      opacidade={0.7}
                      style={[st.linha, i < elegiveis.length - 1 && st.divisoria]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: marcado }}
                      accessibilityLabel={p.nome}>
                      <MarcaConvocar marcado={marcado} />
                      <Avatar iniciais={p.iniciais} size={36} />
                      <View style={st.linhaTexto}>
                        <Text style={st.linhaNome}>{p.nome}</Text>
                        <Text style={st.legenda}>{p.idade} anos</Text>
                      </View>
                      <View style={st.selo}>
                        <Text style={st.seloRotulo}>
                          {p.posicao ? NOME_POSICAO[p.posicao] : 'sem posição'}
                        </Text>
                      </View>
                    </Pressionavel>
                  </Animated.View>
                )
              })}
            </Card>
          </Animated.View>
        ) : (
          <EstadoVazio
            titulo="Ninguém elegível aqui"
            linhas={
              filtro === 'todos'
                ? [
                    `Nenhuma criança de ${faixa.min} ou ${faixa.max} anos está livre para este jogo.`,
                  ]
                : [
                    `Nenhum elegível com a posição ${NOME_POSICAO[filtro]}.`,
                    'Quem ainda não tem posição cadastrada só aparece em "Todos".',
                  ]
            }
          />
        )}

        {/* o apagado mora fora: a mola do toque cuida da opacidade do botao */}
        <View style={(!escolhidos.length || salvando) && st.botaoDesabilitado}>
          <Pressionavel
            onPress={confirmar}
            disabled={!escolhidos.length || salvando}
            style={st.botao}
            accessibilityRole="button"
            accessibilityState={{ disabled: !escolhidos.length || salvando }}>
            {escolhidos.length && !salvando ? (
              <View style={st.botaoLinha}>
                <Text style={st.botaoRotulo}>Convocar </Text>
                <NumeroAnimado valor={escolhidos.length} style={st.botaoRotulo} />
              </View>
            ) : (
              <Text style={st.botaoRotulo}>
                {salvando ? 'Convocando…' : 'Escolha quem convocar'}
              </Text>
            )}
          </Pressionavel>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * A bolinha de convocar. Quando acende, encolhe e volta com a mola de
 * pop; ao abrir a tela ja aparece pronta, sem pular.
 */
function MarcaConvocar({ marcado }: { marcado: boolean }) {
  const escala = useSharedValue(1)
  const primeiro = useRef(true)

  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    if (!marcado) return
    escala.set(
      withSequence(
        withTiming(0.8, { duration: motion.instant, reduceMotion: ReduceMotion.System }),
        withSpring(1, molaPop),
      ),
    )
  }, [marcado, escala])

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }))

  return (
    <Animated.View style={[st.marca, marcado && st.marcaAtiva, pop]}>
      <Icone
        nome={marcado ? 'check' : 'mais'}
        cor={marcado ? color.bg : color.muted}
        tamanho={14}
      />
    </Animated.View>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
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

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primary,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.text },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoDesabilitado: { opacity: 0.4 },
  botaoLinha: { flexDirection: 'row', alignItems: 'center' },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
