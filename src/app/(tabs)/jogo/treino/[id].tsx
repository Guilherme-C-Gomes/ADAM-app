import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Barra, Card, Overline } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, molaPop, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { NOME_TURMA } from '@/data/chamada'
import { excluirTreino, horaCurta, marcarExercicio, nomeNaEquipe, useJogo } from '@/data/jogo-dados'
import { usePerfil } from '@/data/perfis'
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
 * Tela 11d. A lista aqui e a MESMA que foi montada em "Planejar treino"
 * (R19): nao existe segunda lista de exercicios do dia. Marcar grava na
 * hora, entao dois tecnicos no campo veem o mesmo andamento.
 */
export default function TreinoExercicios() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { treinos, exercicios, equipe, carregando } = useJogo()
  const [aberto, setAberto] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // excluir e so de quem administra o Jogo (o banco tambem recusa os outros)
  const { administraJogo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)
  const treino = treinos.find((t) => t.id === id)

  // excluindo, o treino some da memoria antes de a tela sair: nada de "nao encontrado"
  if (!treino && excluindo) return <SafeAreaView style={st.screen} edges={['top']} />
  if (!treino) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar
          titulo={carregando ? 'Abrindo o treino…' : 'Treino não encontrado'}
          subtitulo="Volte para a lista de treinos"
          voltarPara="/jogo"
        />
        {carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </SafeAreaView>
    )
  }

  const total = treino.exercicios.length
  const concluidos = treino.exercicios.filter((e) => e.feito).length
  const alternar = async (exercicioId: string, feito: boolean) => {
    setErro(null)
    try {
      await marcarExercicio(treino.id, exercicioId, !feito)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível marcar.')
    }
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={`Treino dos ${NOME_TURMA[treino.turma]}`}
        subtitulo={[
          horaCurta(treino.hora),
          treino.local,
          nomeNaEquipe(equipe, treino.responsavelId) ?? 'técnico a definir',
        ]
          .filter(Boolean)
          .join(' · ')}
        voltarPara="/jogo"
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        <Animated.View entering={entrada(0)}>
          <Card>
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Exercícios de hoje</Text>
              <View style={st.contagemLinha}>
                <NumeroAnimado valor={concluidos} style={st.contagem} />
                <Text style={st.contagem}>{` de ${total}`}</Text>
              </View>
            </View>
            <Barra pct={total ? (concluidos / total) * 100 : 0} cor={color.success} />
            <Text style={st.legenda}>
              {total ? 'Marque conforme for dando' : 'Nenhum exercício no plano deste treino'}
            </Text>
          </Card>
        </Animated.View>

        {total ? (
          <Animated.View entering={entrada(1)} style={st.secao}>
            <Overline>Exercícios</Overline>
            <Card style={st.cardLista}>
              {treino.exercicios.map((item, i) => {
                const ex = exercicios.find((e) => e.id === item.exercicioId)
                const expandido = aberto === item.exercicioId
                return (
                  <Animated.View
                    key={item.exercicioId}
                    entering={entrada(i, { base: 50 })}
                    style={[st.item, i < treino.exercicios.length - 1 && st.divisoria]}>
                    <View style={st.linha}>
                      <Pressable
                        onPress={() => alternar(item.exercicioId, item.feito)}
                        hitSlop={space.md}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.feito }}
                        accessibilityLabel={`Marcar ${ex?.nome ?? 'exercício'}`}>
                        <MarcaFeita feito={item.feito} />
                      </Pressable>
                      <Pressionavel
                        onPress={() => setAberto(expandido ? null : item.exercicioId)}
                        escala={0.98}
                        opacidade={0.7}
                        style={st.linhaTexto}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: expandido }}
                        accessibilityLabel={`${ex?.nome ?? 'Exercício'}, ver como fazer`}>
                        <Text style={[st.linhaNome, item.feito && st.linhaNomeFeita]}>
                          {ex?.nome ?? 'Exercício removido da biblioteca'}
                        </Text>
                        <Text style={st.legenda}>{item.duracaoMin} min</Text>
                      </Pressionavel>
                    </View>
                    {expandido ? (
                      <Animated.View
                        entering={entrada(0, { duracao: motion.medium })}
                        style={st.detalhe}>
                        {ex?.material ? (
                          <Text style={st.material}>Material · {ex.material}</Text>
                        ) : null}
                        <Text style={st.legenda}>
                          {ex?.descricao ?? 'Sem descrição cadastrada na biblioteca.'}
                        </Text>
                        {ex?.video ? (
                          <Pressable
                            onPress={() => Linking.openURL(`https://${ex.video}`)}
                            hitSlop={space.sm}
                            style={st.videoLinha}
                            accessibilityRole="link">
                            <Icone nome="play" cor={onDark.text} tamanho={12} />
                            <Text style={st.video}>Ver o vídeo</Text>
                          </Pressable>
                        ) : null}
                      </Animated.View>
                    ) : null}
                  </Animated.View>
                )
              })}
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={entrada(2)}>
          <Pressionavel
            onPress={() =>
              router.push({ pathname: '/jogo/avaliacao/[id]', params: { id: treino.id } })
            }
            style={st.botao}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>
              {treino.encerrado
                ? treino.avaliado
                  ? 'Rever a avaliação'
                  : 'Avaliar o treino'
                : 'Encerrar treino'}
            </Text>
          </Pressionavel>
        </Animated.View>

        {administraJogo ? (
          <Animated.View entering={entrada(3)} style={st.excluir}>
            {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
            <Botao
              rotulo={excluindo ? 'Excluindo…' : 'Excluir treino'}
              variante="perigo"
              desabilitado={excluindo}
              onPress={async () => {
                const certeza = await pedirConfirmacao({
                  titulo: 'Excluir este treino?',
                  texto:
                    'A lista de exercícios, a comissão e a avaliação saem junto, e o treino deixa de contar nos números do Jogo. Não dá para desfazer.',
                  confirmar: 'Excluir treino',
                  perigo: true,
                })
                if (!certeza) return
                setErroExcluir(null)
                setExcluindo(true)
                try {
                  await excluirTreino(treino.id)
                  mostrarRecado('Treino excluído')
                  voltar('/jogo')
                } catch (e) {
                  setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir.')
                  setExcluindo(false)
                }
              }}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * A bolinha do exercicio. Quando acende (feito), encolhe e volta com a
 * mola de pop; ao abrir a tela ja aparece pronta, sem pular.
 */
function MarcaFeita({ feito }: { feito: boolean }) {
  const escala = useSharedValue(1)
  const primeiro = useRef(true)

  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    if (!feito) return
    escala.set(
      withSequence(
        withTiming(0.8, { duration: motion.instant, reduceMotion: ReduceMotion.System }),
        withSpring(1, molaPop),
      ),
    )
  }, [feito, escala])

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }))

  return (
    <Animated.View style={[st.marca, feito && st.marcaFeita, pop]}>
      {feito ? <Icone nome="check" cor={color.bg} tamanho={14} /> : null}
    </Animated.View>
  )
}

const st = StyleSheet.create({
  videoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
  secao: { gap: space.md },
  excluir: { gap: space.sm, marginTop: space.lg },

  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  contagemLinha: { flexDirection: 'row', alignItems: 'center' },
  contagem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.success },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  item: { paddingVertical: space.xs },
  detalhe: { paddingLeft: 36, paddingBottom: space.md, gap: space.xs },
  material: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },
  video: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },
  linhaNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaNomeFeita: { color: color.muted },

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
  marcaFeita: { backgroundColor: color.success, borderColor: color.success },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.onPrimary },
})
