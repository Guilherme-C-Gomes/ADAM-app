import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Chip, Overline } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao, CampoSeletor, Entrada, Link, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { rotuloCurto, rotuloLongo } from '@/data/calendario'
import { NOME_TURMA, useUnidades } from '@/data/chamada'
import {
  excluirTreino,
  horaCurta,
  nomeNaEquipe,
  rascunhoTreino,
  responsavelDoPlano,
  salvarTreino,
  useJogo,
} from '@/data/jogo-dados'
import { deISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, motion, space, target, type } from '@/theme/tokens'

/**
 * Telas 11f e 11f2. O que se monta aqui e exatamente o que o tecnico
 * recebe para marcar em campo (R19) — uma lista so, gravada no banco.
 *
 * Quem e responsavel e quem entra na comissao e da coordenacao tecnica: o
 * treinador planeja os exercicios e ve quem esta escalado. Sem ninguem
 * escolhido, vale o tecnico que a escala da semana poe naquele horario.
 */
export default function PlanejarTreino() {
  const plano = rascunhoTreino.useValor()
  const { exercicios, equipe, escala } = useJogo()
  const unidades = useUnidades()
  // excluir e so de quem administra o Jogo (o banco tambem recusa os outros)
  const { editaEscala, administraJogo } = usePerfil()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  const unidadeId = plano.unidadeId ?? unidades.dados[0]?.id ?? null
  const responsavelId = responsavelDoPlano(plano, escala, unidadeId)
  const responsavel = nomeNaEquipe(equipe, responsavelId)

  const itens = plano.exercicios.flatMap((item) => {
    const ex = exercicios.find((e) => e.id === item.exercicioId)
    return ex ? [{ ...item, nome: ex.nome }] : []
  })
  const totalMin = itens.reduce((soma, e) => soma + e.duracaoMin, 0)
  const data = plano.data
    ? `${rotuloCurto(deISO(plano.data))} · ${horaCurta(plano.hora)}`
    : 'escolher'

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      rascunhoTreino.definir({ unidadeId, responsavelId })
      await salvarTreino(editaEscala)
      mostrarRecado(plano.id ? 'Treino salvo' : 'Treino planejado')
      voltar('/jogo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o treino.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
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
      await excluirTreino(id)
      mostrarRecado('Treino excluído')
      voltar('/jogo')
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir.')
      setExcluindo(false)
    }
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={plano.id || excluindo ? 'Plano do treino' : 'Planejar treino'}
        subtitulo={plano.data ? rotuloLongo(deISO(plano.data)) : 'Escolha a data'}
        voltarPara="/jogo"
      />

      <ScrollView
        contentContainerStyle={st.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        {unidades.dados.length > 1 ? (
          <View style={st.chips}>
            {unidades.dados.map((u) => (
              <Chip
                key={u.id}
                rotulo={u.nome}
                ativo={unidadeId === u.id}
                onPress={() => rascunhoTreino.definir({ unidadeId: u.id })}
              />
            ))}
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card style={st.cardCampos}>
            <View style={st.campos}>
              <CampoSeletor
                rotulo="Turma"
                valor={NOME_TURMA[plano.turma]}
                onPress={() => router.push('/jogo/data-treino')}
              />
              <View style={st.separadorV} />
              <CampoSeletor
                rotulo="Data"
                valor={data}
                vazio={!plano.data}
                onPress={() => router.push('/jogo/data-treino')}
              />
            </View>

            <View style={st.divisoria} />

            <Pressable
              onPress={() =>
                router.push({ pathname: '/jogo/comissao', params: { alvo: 'treino' } })
              }
              style={({ pressed }) => [st.comissao, pressed && st.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Comissão técnica do treino">
              <Text style={st.rotulo}>Comissão técnica</Text>
              <View style={st.comissaoLinha}>
                <Avatar
                  iniciais={equipe.find((p) => p.id === responsavelId)?.iniciais ?? '?'}
                  size={26}
                />
                <Text style={[st.valor, !responsavel && st.aviso]} numberOfLines={1}>
                  {responsavel ?? 'técnico a definir'}
                </Text>
                {plano.comissao.length ? (
                  <Selo rotulo={`+${plano.comissao.length} escalados`} />
                ) : null}
                <Icone nome="seta" cor={color.faint} />
              </View>
            </Pressable>
          </Card>
        </Animated.View>

        <Entrada
          rotulo="Local"
          value={plano.local}
          onChangeText={(local) => rascunhoTreino.definir({ local })}
          placeholder="Ex.: Praça Olímpia"
        />

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>{`Exercícios do treino · ${itens.length}`}</Overline>
          <Card style={st.cardLista}>
            {itens.map((ex, i) => (
              <Pressable
                key={ex.exercicioId}
                onPress={() =>
                  router.push({ pathname: '/jogo/exercicio/[id]', params: { id: ex.exercicioId } })
                }
                style={({ pressed }) => [st.linha, st.linhaDivisoria, pressed && st.pressed]}
                accessibilityRole="button">
                <Text style={st.ordem}>{i + 1}</Text>
                <Text style={st.linhaNome}>{ex.nome}</Text>
                <Text style={st.legenda}>{ex.duracaoMin} min</Text>
              </Pressable>
            ))}

            <View style={st.linha}>
              <View style={st.linhaTexto}>
                <Link
                  rotulo="Adicionar exercício"
                  onPress={() => router.push('/jogo/biblioteca')}
                />
              </View>
              <Text style={st.legenda}>{totalMin} min</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Botao
            rotulo={salvando ? 'Salvando…' : 'Salvar treino'}
            desabilitado={!unidadeId || !plano.data || salvando}
            onPress={salvar}
          />
        </Animated.View>

        {plano.id && administraJogo ? (
          <Animated.View
            entering={FadeInDown.duration(motion.medium).delay(120)}
            style={st.excluir}>
            {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
            <Botao
              rotulo={excluindo ? 'Excluindo…' : 'Excluir treino'}
              variante="perigo"
              desabilitado={excluindo || salvando}
              onPress={() => plano.id && excluir(plano.id)}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  aviso: { color: color.warn },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },
  excluir: { gap: space.sm, marginTop: space.lg },

  cardCampos: { gap: 0, paddingVertical: space.xs },
  campos: { flexDirection: 'row', gap: space.md },
  separadorV: { width: 1, backgroundColor: color.divider },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  comissao: { gap: space.sm, paddingVertical: space.md },
  comissaoLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  valor: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text, flex: 1 },
  divisoria: { height: 1, backgroundColor: color.divider },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1 },
  ordem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt, width: 14 },
  linhaNome: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  pressed: { opacity: 0.7 },
})
