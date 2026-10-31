import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip, Overline } from '@/components/ui'
import { Aviso, Botao, Link, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { HeroSetor } from '@/components/ui/setor'
import {
  encerradaSozinha,
  entrarNaChamada,
  hojeLocal,
  horaDe,
  juntos,
  NOME_TURMA,
  treinosDoDia,
  TURMAS,
  useChamadasAbertas,
  useChamadasDoDia,
  useCriancas,
  useEquipe,
  useEscalaDaChamada,
  useUnidades,
  type TreinoDoDia,
  type Chamada,
  type Crianca,
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
import { sessao, usePerfil } from '@/data/perfis'
import { color, space, type, ESPACO_FIM_DA_TELA } from '@/theme/tokens'

/**
 * Tela 18. A aba Chamada: as turmas do dia, uma embaixo da outra. O dia vem
 * da escala semanal da unidade (Jogo › Escala): sem treino hoje, nao ha card
 * (a coordenacao ainda pode fazer a chamada de um treino extra). Unidade sem
 * escala montada mostra as duas turmas, como antes.
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

/** "2026-10-17" -> "17 de outubro", direto do texto (sem fuso, sem Intl). */
function diaPorExtenso(data: string) {
  const [, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1] ?? ''}`
}

/** As marcas que contam: so as das criancas que estao na lista da turma. */
function marcadasNaLista(chamada: Chamada | null, daTurma: Crianca[]) {
  return chamada ? daTurma.filter((k) => chamada.marcas[k.id]).length : 0
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
  const recarregarUnidades = unidades.recarregar

  // a aba fica montada: unidade excluida em Ajustes sai daqui na volta
  useFocusEffect(
    useCallback(() => {
      recarregarUnidades()
    }, [recarregarUnidades]),
  )
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
      {/* key: trocar de unidade comeca do zero (sem rede, a lista anterior
          ficaria na tela com o nome da unidade nova) */}
      <TurmasDaUnidade key={unidade.id} unidade={unidade} eu={eu} />
    </ScrollView>
  )
}

function TurmasDaUnidade({ unidade, eu }: { unidade: Unidade; eu: string }) {
  const chamadas = useChamadasDoDia(unidade.id)
  const abertas = useChamadasAbertas(unidade.id)
  const criancas = useCriancas()
  const equipe = useEquipe()
  const fila = useFilaChamada()
  const escala = useEscalaDaChamada()
  const { administraChamada } = usePerfil()
  // dia sem treino na escala: a coordenacao abre as turmas para um treino extra
  const [mesmoAssim, setMesmoAssim] = useState(false)
  const recarregarChamadas = chamadas.recarregar
  const recarregarAbertas = abertas.recarregar
  const recarregarCriancas = criancas.recarregar
  const recarregarEscala = escala.recarregar

  // Voltar para a aba busca tudo de novo: a chamada excluida sai dos cards
  // (a exclusao nem sempre chega pelo Realtime) e a crianca excluida ou
  // desativada na Secretaria sai da contagem da turma.
  useFocusEffect(
    useCallback(() => {
      recarregarChamadas()
      recarregarAbertas()
      recarregarCriancas()
      recarregarEscala()
    }, [recarregarChamadas, recarregarAbertas, recarregarCriancas, recarregarEscala]),
  )

  if (chamadas.carregando || criancas.carregando || escala.carregando) return <Carregando />
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
  // as turmas de hoje: as da escala (ou as duas, sem escala ou no treino
  // extra) e, sempre, as que ja tem chamada hoje
  const dia = treinosDoDia(escala.dados, unidade.id, new Date().getDay())
  const extra = (turma: Turma): TreinoDoDia => ({ turma, hora: 'Treino extra' })
  const previstas = dia.tipo === 'folga' && mesmoAssim ? TURMAS.map(extra) : dia.turmas
  const doDia = [
    ...previstas,
    ...TURMAS.filter((t) => !previstas.some((p) => p.turma === t) && deHoje(t)).map(extra),
  ]
  const encerradas = doDia.filter((t) => deHoje(t.turma)?.estado === 'encerrada').length
  // a mesma lista da tela da turma: ativas, desta turma e desta unidade
  const daTurma = (turma: Turma) =>
    criancas.dados.filter((c) => c.turma === turma && c.unidade_id === unidade.id)
  // de dias anteriores, ainda em andamento (com a fila por cima: encerrar
  // guardado no celular ja tira daqui)
  const ficaramAbertas = abertas.dados
    .map((c) => comAFila(c, fila.acoes, fila.resolvidas))
    .filter((c) => c.estado === 'andamento')

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
              sincronizar().then(() => {
                chamadas.recarregar()
                abertas.recarregar()
              })
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

      {ficaramAbertas.length ? (
        <>
          <View style={st.linhaTopo}>
            <Overline>Ficaram abertas</Overline>
            <Text style={st.contagem}>
              {ficaramAbertas.length} {ficaramAbertas.length === 1 ? 'chamada' : 'chamadas'}
            </Text>
          </View>
          {ficaramAbertas.map((c, i) => (
            <Animated.View key={c.id} entering={entrada(i)}>
              <CardAberta
                chamada={c}
                unidade={unidade}
                total={daTurma(c.turma).length}
                marcadas={marcadasNaLista(c, daTurma(c.turma))}
                eu={eu}
                equipe={equipe}
              />
            </Animated.View>
          ))}
        </>
      ) : null}

      <View style={st.linhaTopo}>
        <Overline>Chamadas de hoje</Overline>
        {doDia.length ? (
          <View style={st.numeroLinha}>
            <NumeroAnimado valor={encerradas} style={st.contagem} />
            <Text style={st.contagem}> de {doDia.length} encerradas</Text>
          </View>
        ) : null}
      </View>

      {dia.tipo === 'sem-escala' ? (
        <Text style={st.dica}>
          A escala desta unidade ainda não foi montada. Monte em Jogo › Escala para a chamada
          aparecer só nos dias de treino.
        </Text>
      ) : null}

      {dia.tipo === 'folga' ? (
        <>
          <Aviso
            titulo={`Hoje não tem treino em ${unidade.nome}.`}
            texto={dia.proximo ? `Próximo treino: ${dia.proximo}` : undefined}
          />
          {administraChamada && !mesmoAssim ? (
            <Botao
              rotulo="Fazer chamada mesmo assim"
              variante="secundario"
              onPress={() => setMesmoAssim(true)}
            />
          ) : null}
        </>
      ) : null}

      {doDia.map(({ turma, hora }, i) => (
        <Animated.View key={turma} entering={entrada(ficaramAbertas.length + i)}>
          <CardTurma
            turma={turma}
            hora={hora}
            unidade={unidade}
            chamada={deHoje(turma)}
            total={daTurma(turma).length}
            marcadas={marcadasNaLista(deHoje(turma), daTurma(turma))}
            eu={eu}
            equipe={equipe}
          />
        </Animated.View>
      ))}

      {doDia.length ? (
        <Animated.View entering={entrada(ficaramAbertas.length + doDia.length)}>
          <Aviso
            titulo="Mais de uma pessoa pode marcar"
            texto="Cada marca aparece na hora para os outros. Qualquer um encerra, e a chamada sobe uma vez só."
          />
        </Animated.View>
      ) : null}
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
  hora,
  unidade,
  chamada,
  total,
  marcadas,
  eu,
  equipe,
}: {
  turma: Turma
  /** "08h" da escala, o horario fixo (sem escala) ou "Treino extra" */
  hora: string
  unidade: Unidade
  chamada: Chamada | null
  total: number
  marcadas: number
  eu: string
  equipe: Record<string, Pessoa>
}) {
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const estadoChave = chamada?.estado ?? 'afazer'
  const estado = ESTADO[estadoChave]
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
      if (semConexao(e) && chamada && euMarcando) {
        // sem sinal, mas a chamada do banco ja esta na tela e eu ja estou
        // nela: abre a mesma (as marcas vao para a fila), sem criar outra
        router.push({ pathname: '/chamada/turma/[id]', params: { id: chamada.id } })
      } else if (semConexao(e)) {
        // sem sinal: a chamada comeca no celular e sobe depois (ao subir,
        // entra na do banco se ja houver uma)
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
      <Pressionavel
        onPress={abrir}
        disabled={abrindo}
        escala={0.98}
        style={st.porta}
        accessibilityRole="button"
        accessibilityLabel={`Chamada dos ${nome}, ${estado.rotulo}`}>
        <View style={st.cabecalho}>
          <View style={st.texto}>
            <Text style={st.turma}>{nome}</Text>
            <Text style={st.legenda}>
              {hora} · {unidade.nome} · {total} {total === 1 ? 'criança' : 'crianças'}
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
                  <View style={st.numeroLinha}>
                    <NumeroAnimado valor={marcadas} style={st.forte} />
                    <Text style={st.forte}> de {total} presentes</Text>
                  </View>
                  <Text style={st.legendaPequena}>
                    {encerradaSozinha(chamada)
                      ? 'Encerrada automaticamente'
                      : `Encerrada às ${horaDe(chamada.encerrada_em)} · por ${juntos(chamada.participantes, eu, equipe)}`}
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
                  <View style={st.numeroLinha}>
                    <NumeroAnimado valor={marcadas} style={st.legendaPequena} />
                    <Text style={st.legendaPequena}> de {total} marcadas até agora</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        ) : null}
      </Pressionavel>

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

/**
 * Uma chamada de dia anterior que ficou em andamento. Abre direto pelo id
 * (entrar_na_chamada so abre a de hoje) para quem estava marcando encerrar.
 */
function CardAberta({
  chamada,
  unidade,
  total,
  marcadas,
  eu,
  equipe,
}: {
  chamada: Chamada
  unidade: Unidade
  total: number
  marcadas: number
  eu: string
  equipe: Record<string, Pessoa>
}) {
  const nome = NOME_TURMA[chamada.turma]
  const euMarcando = chamada.participantes.includes(eu)
  const abrir = () => router.push({ pathname: '/chamada/turma/[id]', params: { id: chamada.id } })

  return (
    <Card style={st.card}>
      <Pressionavel
        onPress={abrir}
        escala={0.98}
        style={st.porta}
        accessibilityRole="button"
        accessibilityLabel={`Chamada dos ${nome} de ${diaPorExtenso(chamada.data)}, ainda aberta`}>
        <View style={st.cabecalho}>
          <View style={st.texto}>
            <Text style={st.turma}>{nome}</Text>
            <Text style={st.legenda}>
              {diaPorExtenso(chamada.data)} · {unidade.nome}
            </Text>
          </View>
          <Selo rotulo="Aberta" tom="ambar" />
          <Icone nome="seta" cor={color.faint} />
        </View>
        <View style={st.divisoria} />
        <View style={st.texto}>
          <View style={st.numeroLinha}>
            <NumeroAnimado valor={marcadas} style={st.forte} />
            <Text style={st.forte}> de {total} marcadas</Text>
          </View>
          <Text style={st.legendaPequena}>
            {chamada.participantes.length
              ? `${capitalizar(juntos(chamada.participantes, eu, equipe))} ${chamada.participantes.length > 1 ? 'estavam' : 'estava'} marcando. `
              : ''}
            Não foi encerrada, então ainda não conta nas métricas.
          </Text>
        </View>
      </Pressionavel>
      {euMarcando ? <Botao rotulo="Abrir para encerrar" onPress={abrir} /> : null}
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
  conteudo: { padding: space.lg, gap: space.md, paddingBottom: ESPACO_FIM_DA_TELA },
  centro: { padding: space.xxl, alignItems: 'center' },
  chips: { flexDirection: 'row', gap: space.sm },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contagem: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },
  // numero que conta (NumeroAnimado) seguido do resto da frase
  numeroLinha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  erro: { ...type.small, fontFamily: 'Inter_400Regular', color: color.danger },

  card: { gap: space.md },
  porta: { gap: space.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  texto: { flex: 1, gap: 2 },
  turma: { ...type.body, fontFamily: 'Inter_700Bold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaPequena: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },
  dica: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  forte: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  divisoria: { height: 1, backgroundColor: color.divider },

  quem: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rodinhas: { flexDirection: 'row', gap: 6 },
  rodinha: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rodinhaTexto: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.onPrimary },
})
