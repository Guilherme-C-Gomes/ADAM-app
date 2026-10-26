import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Overline } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { rotuloCurto } from '@/data/calendario'
import { NOME_TURMA } from '@/data/chamada'
import {
  encerrarTreino,
  excluirAvaliacao,
  horaCurta,
  lerAvaliacao,
  useJogo,
  type Notas,
} from '@/data/jogo-dados'
import { deISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { COR_FOCO, useFoco } from '@/hooks/use-foco'
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
 * Tela 11m. Nada aqui e obrigatorio (R8): existe "Pular por agora", e
 * resposta arrancada a forca vira 3 em tudo e nao serve para nada.
 *
 * Cada escala leva a legenda das duas pontas porque dificuldade alta nao e
 * nota ruim, e informacao para calibrar o proximo treino (R9).
 */
const ESCALA = [0, 1, 2, 3, 4, 5] as const

type Avaliacao = Notas & { observacoes: string }

export default function TreinoAvaliacao() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { treinos } = useJogo()
  const treino = treinos.find((t) => t.id === id)
  // "Rever a avaliacao" abre com as notas que ja estavam gravadas
  const [lida, setLida] = useState<{
    de: string | null
    avaliacao: Avaliacao | null
    erro: string | null
  }>({ de: null, avaliacao: null, erro: null })
  useEffect(() => {
    if (!id) return
    let ativo = true
    lerAvaliacao(id).then(
      (avaliacao) => {
        if (ativo) setLida({ de: id, avaliacao, erro: null })
      },
      (e) => {
        if (ativo)
          setLida({
            de: id,
            avaliacao: null,
            erro: e instanceof Error ? e.message : 'Não foi possível ler a avaliação.',
          })
      },
    )
    return () => {
      ativo = false
    }
  }, [id])

  const subtitulo = treino
    ? `${NOME_TURMA[treino.turma]} · ${rotuloCurto(deISO(treino.data))} · ${horaCurta(treino.hora)}`
    : 'Avaliação do treino'

  if (!id || lida.de !== id || lida.erro) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar titulo="Como foi o treino?" subtitulo={subtitulo} voltarPara="/jogo" />
        <View style={st.conteudo}>
          {lida.erro ? (
            <Aviso tom="ambar" titulo={lida.erro} />
          ) : (
            <ActivityIndicator color={color.primaryCh} />
          )}
        </View>
      </SafeAreaView>
    )
  }
  return <Formulario key={id} id={id} subtitulo={subtitulo} inicial={lida.avaliacao} />
}

function Formulario({
  id,
  subtitulo,
  inicial,
}: {
  id: string
  subtitulo: string
  inicial: Avaliacao | null
}) {
  const [notaTreino, setNotaTreino] = useState<number | null>(inicial?.treino ?? null)
  const [notaCompreensao, setNotaCompreensao] = useState<number | null>(inicial?.entenderam ?? null)
  const [notaDificuldade, setNotaDificuldade] = useState<number | null>(
    inicial?.dificuldade ?? null,
  )
  const foco = useFoco()
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // excluir a avaliacao ja gravada e so de quem administra o Jogo
  const { administraJogo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir esta avaliação?',
      texto:
        'As notas e as observações deste treino saem, e ele deixa de contar nas avaliações do Jogo. O treino continua encerrado. Não dá para desfazer.',
      confirmar: 'Excluir avaliação',
      perigo: true,
    })
    if (!certeza) return
    setErroExcluir(null)
    setExcluindo(true)
    try {
      await excluirAvaliacao(id)
      mostrarRecado('Avaliação excluída')
      voltar('/jogo')
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir.')
      setExcluindo(false)
    }
  }

  const terminar = async (comNotas: boolean) => {
    setErro(null)
    setSalvando(true)
    try {
      await encerrarTreino(
        id,
        comNotas
          ? {
              treino: notaTreino,
              entenderam: notaCompreensao,
              dificuldade: notaDificuldade,
              observacoes,
            }
          : null,
      )
      mostrarRecado(comNotas ? 'Treino encerrado e avaliado' : 'Treino encerrado')
      router.dismissTo('/jogo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível encerrar.')
      setSalvando(false)
    }
  }
  const algumaNota =
    notaTreino !== null ||
    notaCompreensao !== null ||
    notaDificuldade !== null ||
    !!observacoes.trim()

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar titulo="Como foi o treino?" subtitulo={subtitulo} voltarPara="/jogo" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
          <Overline>Como foi o treino</Overline>
          <Escala valor={notaTreino} onChange={setNotaTreino} min="fraco" max="ótimo" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Eles entenderam o exercício</Overline>
          <Escala valor={notaCompreensao} onChange={setNotaCompreensao} min="nada" max="tudo" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)} style={st.secao}>
          <Overline>Dificuldade para eles</Overline>
          <Escala valor={notaDificuldade} onChange={setNotaDificuldade} min="fácil" max="difícil" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)} style={st.secao}>
          <Overline>Observações</Overline>
          <TextInput
            style={[st.campo, foco.focado && st.focado]}
            {...foco.eventos}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="O que vale lembrar para o próximo treino"
            placeholderTextColor={color.faint}
            multiline
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(160)} style={st.fim}>
          <Pressable
            onPress={() => terminar(true)}
            disabled={salvando || !algumaNota}
            style={({ pressed }) => [
              st.botao,
              (salvando || !algumaNota) && { opacity: 0.5 },
              pressed && st.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: salvando || !algumaNota }}>
            <Text style={st.botaoRotulo}>{salvando ? 'Salvando…' : 'Salvar avaliação'}</Text>
          </Pressable>
          <Pressable
            onPress={() => terminar(false)}
            disabled={salvando}
            hitSlop={space.sm}
            accessibilityRole="button">
            <Text style={st.link}>Encerrar sem avaliar</Text>
          </Pressable>
        </Animated.View>

        {inicial && administraJogo ? (
          <Animated.View entering={FadeInDown.duration(motion.medium).delay(200)} style={st.fim}>
            {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
            <Botao
              rotulo={excluindo ? 'Excluindo…' : 'Excluir avaliação'}
              variante="perigo"
              desabilitado={excluindo || salvando}
              onPress={excluir}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function Escala({
  valor,
  onChange,
  min,
  max,
}: {
  valor: number | null
  onChange: (v: number) => void
  min: string
  max: string
}) {
  return (
    <View style={st.escalaBloco}>
      <View style={st.escalaLinha}>
        {ESCALA.map((n) => {
          const ativo = valor === n
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={({ pressed }) => [st.alvo, ativo && st.alvoAtivo, pressed && st.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Nota ${n}`}>
              <Text style={[st.alvoRotulo, ativo && st.alvoRotuloAtivo]}>{n}</Text>
            </Pressable>
          )
        })}
      </View>
      <View style={st.pontas}>
        <Text style={st.ponta}>{min}</Text>
        <Text style={st.ponta}>{max}</Text>
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.lg, paddingBottom: ESPACO_FIM_DA_TELA },
  secao: { gap: space.md },
  fim: { gap: space.base, alignItems: 'stretch' },
  pressed: { opacity: 0.7 },

  escalaBloco: { gap: space.sm },
  escalaLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  alvo: {
    flex: 1,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  alvoAtivo: { backgroundColor: onDark.fill, borderColor: onDark.fill },
  alvoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.muted },
  alvoRotuloAtivo: { color: color.text },
  pontas: { flexDirection: 'row', justifyContent: 'space-between' },
  ponta: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },

  campo: {
    minHeight: 96,
    padding: space.base,
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

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  link: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    textAlign: 'center',
  },
})
