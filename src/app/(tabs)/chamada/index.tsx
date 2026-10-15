import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip, Overline } from '@/components/ui'
import { Aviso, Botao, Link, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { HeroSetor } from '@/components/ui/setor'
import {
  entrarNaChamada,
  hojeLocal,
  horaDe,
  HORARIO,
  juntos,
  NOME_TURMA,
  TURMAS,
  useChamadasDoDia,
  useCriancas,
  useEquipe,
  useUnidades,
  type Chamada,
  type Pessoa,
  type Turma,
  type Unidade,
} from '@/data/chamada'
import {
  chamadaLocal,
  comAFila,
  ehLocal,
  enfileirar,
  esquecerFalhas,
  idLocal,
  semConexao,
  sincronizar,
  useFilaChamada,
} from '@/data/chamada-offline'
import { sessao } from '@/data/perfis'
import { color, motion, space, type } from '@/theme/tokens'

/**
 * Tela 18. A aba Chamada: as duas turmas do dia, uma embaixo da outra.
 *
 * E a primeira aba de todos os perfis e a mesma para todos: o ADM, o
 * treinador e a professora veem o mesmo estado, porque a chamada e uma so
 * por turma, unidade e dia — e vem do banco, ao vivo.
 */
const ESTADO = {
  afazer: { rotulo: 'A fazer', tom: 'ambar' },
  andamento: { rotulo: 'Marcando', tom: 'roxo' },
  encerrada: { rotulo: 'Encerrada', tom: 'verde' },
} as const

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** "Sexta, 2 de outubro" — sem Intl, que derruba o Hermes do Expo Go. */
function hojePorExtenso() {
  const d = new Date()
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

// A unidade escolhida fica lembrada enquanto o app esta aberto.
let unidadeLembrada: string | null = null

export default function ChamadaDeHoje() {
  const { usuarioId } = sessao.useValor()

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Chamada" subtitulo={hojePorExtenso()} />
      {usuarioId ? <ChamadasDoBanco eu={usuarioId} /> : null}
    </SafeAreaView>
  )
}

function ChamadasDoBanco({ eu }: { eu: string }) {
  const unidades = useUnidades()
  const [escolhida, setEscolhida] = useState<string | null>(unidadeLembrada)
  const unidade = unidades.dados.find((u) => u.id === escolhida) ?? unidades.dados[0] ?? null

  if (unidades.carregando) return <Carregando />
  if (unidades.erro) return <Erro texto={unidades.erro} />
  if (!unidade) {
    return (
      <View style={st.conteudo}>
        <Aviso
          tom="ambar"
          titulo="Nenhuma unidade cadastrada"
          texto="A chamada é por unidade. A coordenação precisa cadastrar Atibaia e Caiana no banco."
        />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
      {unidades.dados.length > 1 ? (
        <View style={st.chips}>
          {unidades.dados.map((u) => (
            <Chip
              key={u.id}
              rotulo={u.nome}
              ativo={u.id === unidade.id}
              onPress={() => {
                unidadeLembrada = u.id
                setEscolhida(u.id)
              }}
            />
          ))}
        </View>
      ) : null}
      <TurmasDaUnidade unidade={unidade} eu={eu} />
    </ScrollView>
  )
}

function TurmasDaUnidade({ unidade, eu }: { unidade: Unidade; eu: string }) {
  const chamadas = useChamadasDoDia(unidade.id)
  const criancas = useCriancas()
  const equipe = useEquipe()
  const fila = useFilaChamada()

  if (chamadas.carregando || criancas.carregando) return <Carregando />
  // sem a lista de criancas (nem a guardada no celular) nao ha chamada
  if (criancas.erro) return <Erro texto={criancas.erro} />
  // sem conexao com o banco: segue com o que esta no celular
  const semSinal = !!chamadas.erro

  // a chamada de cada turma: a do banco com a fila por cima, ou a que so
  // existe no celular (comecada sem sinal)
  const deHoje = (turma: Turma): Chamada | null => {
    const doBanco = chamadas.dados[turma]
    if (doBanco) return comAFila(doBanco, fila.acoes, fila.resolvidas)
    return chamadaLocal(idLocal(hojeLocal(), unidade.id, turma), fila.acoes, eu)
  }
  const encerradas = TURMAS.filter((t) => deHoje(t)?.estado === 'encerrada').length

  return (
    <>
      {semSinal ? (
        <Aviso
          tom="ambar"
          titulo="Sem internet agora"
          texto="Dá para fazer a chamada mesmo assim: ela fica guardada no celular e sobe sozinha quando a conexão voltar."
        />
      ) : null}

      {fila.acoes.length ? (
        <View style={st.fila}>
          <Aviso
            tom="roxo"
            titulo={`${fila.acoes.length} ${fila.acoes.length === 1 ? 'ação guardada' : 'ações guardadas'} no celular`}
            texto={
              fila.enviando
                ? 'Enviando agora…'
                : 'Sobe sozinha quando a internet voltar. Até lá, não desinstale o app.'
            }
          />
          <Link
            rotulo={fila.enviando ? 'Enviando…' : 'Enviar agora'}
            onPress={() => {
              sincronizar().then(() => chamadas.recarregar())
            }}
          />
        </View>
      ) : null}

      {fila.falhas.length ? (
        <View style={st.fila}>
          <Aviso tom="ambar" titulo="Algumas ações não subiram" texto={fila.falhas.join(' · ')} />
          <Link rotulo="Entendi" onPress={esquecerFalhas} />
        </View>
      ) : null}

      <View style={st.linhaTopo}>
        <Overline>Chamadas de hoje</Overline>
        <Text style={st.contagem}>
          {encerradas} de {TURMAS.length} encerradas
        </Text>
      </View>

      {TURMAS.map((turma, i) => (
        <Animated.View key={turma} entering={FadeInDown.duration(motion.medium).delay(i * 40)}>
          <CardTurma
            turma={turma}
            unidade={unidade}
            chamada={deHoje(turma)}
            total={
              criancas.dados.filter((c) => c.turma === turma && c.unidade_id === unidade.id).length
            }
            eu={eu}
            equipe={equipe}
          />
        </Animated.View>
      ))}

      <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Aviso
          titulo="Mais de uma pessoa pode marcar"
          texto="Cada marca aparece na hora para os outros. Qualquer um encerra, e a chamada sobe uma vez só."
        />
      </Animated.View>
    </>
  )
}

/**
 * Uma turma do dia. A parte de cima do card e porta: abre a lista para
 * marcar junto ou, encerrada, para corrigir. Encerrada ela fica quieta, em
 * cinza; a fazer ou marcando ela ganha o botao roxo, que e o que falta.
 */
function CardTurma({
  turma,
  unidade,
  chamada,
  total,
  eu,
  equipe,
}: {
  turma: Turma
  unidade: Unidade
  chamada: Chamada | null
  total: number
  eu: string
  equipe: Record<string, Pessoa>
}) {
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const estadoChave = chamada?.estado ?? 'afazer'
  const estado = ESTADO[estadoChave]
  const marcadas = chamada ? Object.keys(chamada.marcas).length : 0
  const ultimaCorrecao = chamada?.correcoes.at(-1)
  const euMarcando = !!chamada?.participantes.includes(eu)
  const nome = NOME_TURMA[turma]

  const abrir = async () => {
    setErro(null)
    setAbrindo(true)
    try {
      // encerrada so abre para corrigir; a que so existe no celular abre
      // direto; nas outras, abrir e entrar nela
      const id =
        chamada && (chamada.estado === 'encerrada' || ehLocal(chamada.id))
          ? chamada.id
          : await entrarNaChamada(unidade.id, turma)
      router.push({ pathname: '/chamada/turma/[id]', params: { id } })
    } catch (e) {
      if (semConexao(e)) {
        // sem sinal: a chamada comeca no celular e sobe depois
        const id = idLocal(hojeLocal(), unidade.id, turma)
        await enfileirar({
          tipo: 'abrir',
          chamada: id,
          unidadeId: unidade.id,
          turma,
          data: hojeLocal(),
        })
        router.push({ pathname: '/chamada/turma/[id]', params: { id } })
      } else {
        setErro('Não foi possível abrir a chamada.')
      }
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <Card style={st.card}>
      <Pressable
        onPress={abrir}
        disabled={abrindo}
        style={({ pressed }) => [st.porta, pressed && st.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Chamada dos ${nome}, ${estado.rotulo}`}>
        <View style={st.cabecalho}>
          <View style={st.texto}>
            <Text style={st.turma}>{nome}</Text>
            <Text style={st.legenda}>
              {HORARIO[turma]} · {unidade.nome} · {total} {total === 1 ? 'criança' : 'crianças'}
            </Text>
          </View>
          <Selo rotulo={estado.rotulo} tom={estado.tom} />
          {abrindo ? (
            <ActivityIndicator color={color.faint} />
          ) : (
            <Icone nome="seta" cor={color.faint} />
          )}
        </View>

        {chamada ? (
          <>
            <View style={st.divisoria} />
            <View style={st.quem}>
              <View style={st.rodinhas}>
                {chamada.participantes.map((id) => (
                  <View key={id} style={st.rodinha}>
                    <Text style={st.rodinhaTexto}>{equipe[id]?.iniciais ?? '·'}</Text>
                  </View>
                ))}
              </View>
              {chamada.estado === 'encerrada' ? (
                <View style={st.texto}>
                  <Text style={st.forte}>
                    {marcadas} de {total} presentes
                  </Text>
                  <Text style={st.legendaPequena}>
                    Encerrada às {horaDe(chamada.encerrada_em)} · por{' '}
                    {juntos(chamada.participantes, eu, equipe)}
                    {ultimaCorrecao
                      ? ` · corrigida por ${juntos([ultimaCorrecao.por], eu, equipe)} às ${horaDe(ultimaCorrecao.em)}`
                      : ''}
                  </Text>
                </View>
              ) : (
                <View style={st.texto}>
                  <Text style={st.forte}>
                    {capitalizar(juntos(chamada.participantes, eu, equipe))}{' '}
                    {chamada.participantes.length > 1 ? 'estão' : 'está'} marcando
                  </Text>
                  <Text style={st.legendaPequena}>
                    {marcadas} de {total} marcadas até agora
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </Pressable>

      {estadoChave === 'afazer' ? (
        <Botao rotulo="Começar chamada" onPress={abrir} desabilitado={abrindo} />
      ) : estadoChave === 'andamento' ? (
        <Botao
          rotulo={euMarcando ? 'Continuar marcando' : 'Marcar junto'}
          onPress={abrir}
          desabilitado={abrindo}
        />
      ) : null}
      {erro ? <Text style={st.erro}>{erro}</Text> : null}
    </Card>
  )
}

function Carregando() {
  return (
    <View style={st.centro}>
      <ActivityIndicator color={color.primaryCh} />
    </View>
  )
}

function Erro({ texto }: { texto: string }) {
  return (
    <View style={st.conteudo}>
      <Aviso tom="ambar" titulo={texto} texto="Confira a internet e abra a aba de novo." />
    </View>
  )
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const st = StyleSheet.create({
  fila: { gap: space.xs },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.md, paddingBottom: 120 },
  centro: { padding: space.xxl, alignItems: 'center' },
  chips: { flexDirection: 'row', gap: space.sm },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contagem: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },
  pressed: { opacity: 0.85 },
  erro: { ...type.small, fontFamily: 'Inter_400Regular', color: color.danger },

  card: { gap: space.md },
  porta: { gap: space.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  texto: { flex: 1, gap: 2 },
  turma: { ...type.body, fontFamily: 'Inter_700Bold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaPequena: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },
  forte: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  divisoria: { height: 1, backgroundColor: color.divider },

  quem: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rodinhas: { flexDirection: 'row', gap: 6 },
  rodinha: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.primaryDk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rodinhaTexto: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.text },
})
