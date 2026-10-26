import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DiasDaSemana, FraseViva } from '@/components/escala/pecas'
import { fraseGravada, linhasDaTurma } from '@/components/escala/semana'
import { Card, Chip, Overline } from '@/components/ui'
import { Aviso, Calendario, SeletorPeriodo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, Pressionavel } from '@/components/ui/movimento'
import { HeroSetor, Segmentado } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'
import { DIAS_CURTOS, rotuloCurto, rotuloLongo } from '@/data/calendario'
import { NOME_TURMA, TURMAS, useUnidades, type Turma } from '@/data/chamada'
import { LIMITE_COMPREENSAO } from '@/data/jogo'
import {
  abrirPlano,
  diaMes,
  diasDoMes,
  horaCurta,
  nomeNaEquipe,
  novoJogo,
  rascunhoFiltroJogos,
  useJogo,
  useJogos,
  useTreinosDoMes,
} from '@/data/jogo-dados'
import { deISO, hojeISO, paraISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
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
 * Tela 11. O setor Jogo em tres abas: os treinos (o de hoje, os proximos e
 * a ultima avaliacao), os jogos do periodo e a escala dos tecnicos. Tudo do
 * banco (data/jogo-dados.ts).
 */
const ABAS = ['Treinos', 'Jogos', 'Escala'] as const
type Aba = (typeof ABAS)[number]

export default function Jogo() {
  const [aba, setAba] = useState<Aba>('Treinos')
  const dados = useJogo()
  const jogos = useJogos()

  const subtitulo =
    aba === 'Treinos'
      ? rotuloLongo(new Date())
      : aba === 'Jogos'
        ? jogos.intervalo.rotulo.charAt(0).toUpperCase() + jogos.intervalo.rotulo.slice(1)
        : `Toda semana · ${dados.escala.length} ${dados.escala.length === 1 ? 'horário' : 'horários'}`
  const carregando = aba === 'Jogos' ? jogos.carregando : dados.carregando

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Jogo" subtitulo={subtitulo} />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Segmentado opcoes={ABAS} valor={aba} onChange={setAba} />

        {carregando ? (
          <Esqueleto>
            <SkeletonLista linhas={2} />
            <SkeletonLista linhas={2} />
            <SkeletonCard altura={96} />
          </Esqueleto>
        ) : aba === 'Treinos' ? (
          <Treinos />
        ) : aba === 'Jogos' ? (
          <Jogos />
        ) : (
          <Escala />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Treinos() {
  const { treinos, equipe, ultimaAvaliacao, erro } = useJogo()
  const unidades = useUnidades()
  const varias = unidades.dados.length > 1
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''
  const hoje = hojeISO()
  const deHoje = treinos.filter((t) => t.data === hoje)
  const proximos = treinos.filter((t) => t.data > hoje)

  return (
    <>
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

      <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
        <Overline>Treinos de hoje</Overline>
        {deHoje.length ? (
          <Card style={st.cardLista}>
            {deHoje.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/jogo/treino/[id]', params: { id: t.id } })}
                style={({ pressed }) => [
                  st.linhaTreino,
                  i < deHoje.length - 1 && st.divisoria,
                  pressed && st.pressed,
                ]}
                accessibilityRole="button">
                <View style={st.acento} />
                <View style={st.linhaTexto}>
                  <Text style={st.linhaNome}>
                    {NOME_TURMA[t.turma]}
                    {varias ? ` · ${nomeUnidade(t.unidadeId)}` : ''}
                  </Text>
                  <Text style={st.legenda}>
                    {[t.local, nomeNaEquipe(equipe, t.responsavelId) ?? 'técnico a definir']
                      .filter(Boolean)
                      .join(' · ')}
                    {t.encerrado ? ' · encerrado' : ''}
                  </Text>
                </View>
                <View style={st.selo}>
                  <Text style={st.seloRotulo}>{horaCurta(t.hora)}</Text>
                </View>
                <Icone nome="seta" cor={color.faint} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <Text style={st.legenda}>Nenhum treino marcado para hoje.</Text>
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
        <Overline>Próximos treinos</Overline>
        {proximos.length ? (
          <Card style={st.cardLista}>
            {proximos.map((t, i) => {
              const responsavel = nomeNaEquipe(equipe, t.responsavelId)
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    abrirPlano(t)
                    router.push('/jogo/planejar')
                  }}
                  style={({ pressed }) => [
                    st.linha,
                    i < proximos.length - 1 && st.divisoria,
                    pressed && st.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Treino de ${rotuloCurto(deISO(t.data))}, abrir o plano`}>
                  <View style={st.linhaTexto}>
                    <Text style={st.linhaNome}>
                      {rotuloCurto(deISO(t.data))} · {horaCurta(t.hora)}
                    </Text>
                    <Text style={[st.legenda, !responsavel && st.legendaAviso]}>
                      {responsavel ?? 'técnico a definir'} · {t.exercicios.length}{' '}
                      {t.exercicios.length === 1 ? 'exercício' : 'exercícios'}
                    </Text>
                  </View>
                  <Text style={st.legenda}>{NOME_TURMA[t.turma]}</Text>
                  <Icone nome="seta" cor={color.faint} />
                </Pressable>
              )
            })}
          </Card>
        ) : (
          <Card>
            <Text style={st.legenda}>Nenhum treino planejado daqui para frente.</Text>
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Pressable
          onPress={() => {
            abrirPlano()
            router.push('/jogo/planejar')
          }}
          style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoSecundarioRotulo}>Planejar treino</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)}>
        <Pressable
          onPress={() => router.push('/jogo/avaliacoes')}
          style={({ pressed }) => pressed && st.pressed}
          accessibilityRole="button"
          accessibilityLabel="Ver avaliações dos treinos">
          <Card>
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Último treino avaliado</Text>
              <View style={st.quando}>
                {ultimaAvaliacao ? (
                  <Text style={st.legenda}>
                    {rotuloCurto(deISO(ultimaAvaliacao.data))} · {NOME_TURMA[ultimaAvaliacao.turma]}
                  </Text>
                ) : null}
                <Icone nome="seta" cor={color.faint} />
              </View>
            </View>
            {ultimaAvaliacao ? (
              <View style={st.notas}>
                <Nota valor={ultimaAvaliacao.treino} rotulo="treino" />
                <Nota
                  valor={ultimaAvaliacao.entenderam}
                  rotulo="entenderam"
                  alerta={
                    ultimaAvaliacao.entenderam !== null &&
                    ultimaAvaliacao.entenderam < LIMITE_COMPREENSAO
                  }
                />
                <Nota valor={ultimaAvaliacao.dificuldade} rotulo="dificuldade" />
              </View>
            ) : (
              <Text style={st.legenda}>
                Nenhum treino avaliado ainda. A avaliação aparece ao encerrar o treino.
              </Text>
            )}
          </Card>
        </Pressable>
      </Animated.View>
    </>
  )
}

function Jogos() {
  const { lista, erro, intervalo, filtro } = useJogos()
  const rotulo = `${filtro.categoria === 'Todas' ? 'Todas' : filtro.categoria} · ${intervalo.rotulo}`

  return (
    <>
      <SeletorPeriodo
        rotulo={rotulo}
        onAnterior={() => rascunhoFiltroJogos.definir({ passo: filtro.passo - 1 })}
        onProximo={() => rascunhoFiltroJogos.definir({ passo: filtro.passo + 1 })}
        onPress={() => router.push('/jogo/filtros')}
      />

      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

      <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
        <Overline>{`Jogos · ${lista.length}`}</Overline>
        {lista.length ? (
          lista.map((j, i) => {
            const placar =
              j.golsAdam !== null && j.golsAdversario !== null
                ? `${j.golsAdam} × ${j.golsAdversario}`
                : null
            return (
              <Animated.View key={j.id} entering={FadeInDown.duration(motion.medium).delay(i * 40)}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/jogo/partida/[id]', params: { id: j.id } })
                  }
                  style={({ pressed }) => pressed && st.pressed}
                  accessibilityRole="button">
                  <Card style={st.cardPartida}>
                    <View style={st.acento} />
                    <View style={st.linhaTexto}>
                      <Text style={st.linhaNome}>
                        ADAM × {j.adversario}
                        {placar ? `  ${placar}` : ''}
                      </Text>
                      <Text style={st.legenda}>
                        {DIAS_CURTOS[deISO(j.data).getDay()]} {diaMes(j.data)} · {horaCurta(j.hora)}
                      </Text>
                      <Text style={st.legenda}>
                        {[j.local, j.campeonato].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <View style={st.selos}>
                      <View style={st.seloCategoria}>
                        <Text style={st.seloCategoriaRotulo}>{j.categoria}</Text>
                      </View>
                      <View style={st.selo}>
                        <Text style={st.seloRotulo}>{j.modalidade}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </Animated.View>
            )
          })
        ) : (
          <Card>
            <Text style={st.legenda}>Nenhum jogo nesse período com esse filtro.</Text>
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Pressable
          onPress={() => {
            novoJogo()
            router.push('/jogo/novo-jogo')
          }}
          style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoSecundarioRotulo}>Adicionar jogo</Text>
        </Pressable>
      </Animated.View>
    </>
  )
}

function Escala() {
  const { escala, equipe, erro } = useJogo()
  const unidades = useUnidades()
  const { editaEscala } = usePerfil()
  const varias = unidades.dados.length > 1
  const [unidadeId, setUnidadeId] = useState<string | null>(null)
  const unidade = unidadeId ?? unidades.dados[0]?.id ?? null
  // uma unidade so: nao filtra (a escala inteira e dela)
  const filtro = varias ? unidade : null

  // O calendario: cada dia com treino (da escala da semana ou marcado na
  // data) ganha um fundo e as iniciais de quem vai; ambar se falta tecnico.
  // Tocar abre o dia.
  const agora = new Date()
  const [mes, setMes] = useState({ ano: agora.getFullYear(), mes: agora.getMonth() })
  const doMes = useTreinosDoMes(mes.ano, mes.mes)
  const marcas = diasDoMes(mes.ano, mes.mes, escala, doMes.lista, equipe, filtro)
  const pendentes = Object.values(marcas).filter((m) => m.tom === 'pendente').length
  const ehEsteMes = mes.ano === agora.getFullYear() && mes.mes === agora.getMonth()
  // a escala da semana mudou (ou trocou a unidade): as datas acendem em onda
  const onda = `${filtro}|${escala
    .filter((l) => !filtro || l.unidadeId === filtro)
    .map((l) => `${l.unidadeId}${l.diaSemana}${l.hora}${l.turma}${l.tecnicoId}`)
    .sort()
    .join()}`

  const editar = (turma?: Turma) =>
    router.push({
      pathname: '/jogo/escala',
      params: { ...(unidade ? { unidade } : {}), ...(turma ? { turma } : {}) },
    })

  return (
    <>
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

      <Animated.View entering={entrada(0)} style={st.secao}>
        <Overline>Treinos da semana</Overline>
        {varias ? (
          <View style={st.chips}>
            {unidades.dados.map((u) => (
              <Chip
                key={u.id}
                rotulo={u.nome}
                ativo={unidade === u.id}
                onPress={() => setUnidadeId(u.id)}
              />
            ))}
          </View>
        ) : null}
        {TURMAS.map((t) => {
          const linhas = linhasDaTurma(escala, filtro, t)
          const frase = fraseGravada(escala, equipe, filtro, t)
          const semTecnico = linhas.some((l) => !l.tecnicoId)
          const conteudo = (
            <>
              {semTecnico ? <View style={st.acentoAviso} /> : null}
              <View style={st.linhaTopo}>
                <Text style={st.cardTitulo}>{NOME_TURMA[t]}</Text>
                <DiasDaSemana dias={linhas.map((l) => l.diaSemana)} pequeno />
              </View>
              <FraseViva
                texto={
                  frase ??
                  (editaEscala
                    ? `Escolha os dias de treino de ${NOME_TURMA[t]}`
                    : `A coordenação técnica ainda não marcou os treinos de ${NOME_TURMA[t]}.`)
                }
                apagada={!frase}
              />
              {editaEscala ? (
                <View style={st.quando}>
                  <Text style={st.editar}>
                    {frase ? 'Mudar dias, horário ou técnico' : 'Montar'}
                  </Text>
                  <Icone nome="seta" cor={color.primaryLt} />
                </View>
              ) : null}
            </>
          )
          return editaEscala ? (
            <Pressionavel
              key={t}
              onPress={() => editar(t)}
              escala={0.98}
              style={[st.cardSemana, semTecnico && st.cardSemanaAviso]}
              accessibilityRole="button"
              accessibilityLabel={`${frase ?? `${NOME_TURMA[t]} sem treinos na semana`} Editar.`}>
              {conteudo}
            </Pressionavel>
          ) : (
            <View key={t} style={[st.cardSemana, semTecnico && st.cardSemanaAviso]}>
              {conteudo}
            </View>
          )
        })}
      </Animated.View>

      <Animated.View entering={entrada(1)} style={st.secao}>
        <Overline>Escala do mês</Overline>
        {doMes.erro ? <Aviso tom="ambar" titulo={doMes.erro} /> : null}
        <Calendario
          ano={mes.ano}
          mes={mes.mes}
          marcas={marcas}
          onda={onda}
          comIniciais
          hoje={ehEsteMes ? agora.getDate() : null}
          onEscolher={(dia) =>
            router.push({
              pathname: '/jogo/escala-dia',
              params: { data: paraISO(new Date(mes.ano, mes.mes, dia)) },
            })
          }
          onMudarMes={(d) => {
            const novo = new Date(mes.ano, mes.mes + d, 1)
            setMes({ ano: novo.getFullYear(), mes: novo.getMonth() })
          }}
        />
        <View style={st.legendaCalendario}>
          <View style={st.itemLegenda}>
            <View style={[st.pontoLegenda, st.pontoVerde]} />
            <Text style={st.legenda}>com técnico</Text>
          </View>
          <View style={st.itemLegenda}>
            <View style={[st.pontoLegenda, st.pontoAmbar]} />
            <Text style={[st.legenda, pendentes > 0 && st.legendaAviso]}>
              {pendentes
                ? `falta técnico em ${pendentes} ${pendentes === 1 ? 'dia' : 'dias'}`
                : 'falta técnico'}
            </Text>
          </View>
          <View style={st.itemLegenda}>
            <View style={st.iniciaisLegenda}>
              <Text style={st.iniciaisLegendaTexto}>AB</Text>
            </View>
            <Text style={st.legenda}>quem vai</Text>
          </View>
        </View>
        <Text style={st.legenda}>
          {editaEscala
            ? 'Toque num dia para trocar o técnico, escolher as pessoas ou adicionar um treino só naquela data.'
            : 'Toque num dia para ver quem está escalado.'}
        </Text>
      </Animated.View>

      {editaEscala ? (
        <Animated.View entering={entrada(2)}>
          <Pressionavel
            onPress={() => editar()}
            style={st.botaoSecundario}
            accessibilityRole="button">
            <Text style={st.botaoSecundarioRotulo}>Editar treinos da semana</Text>
          </Pressionavel>
        </Animated.View>
      ) : null}
    </>
  )
}

function Nota({
  valor,
  rotulo,
  alerta,
}: {
  valor: number | null
  rotulo: string
  alerta?: boolean
}) {
  return (
    <View style={st.nota}>
      <Text style={[st.notaValor, alerta && st.notaValorAlerta]}>
        {valor === null ? '—' : valor.toFixed(1).replace('.', ',')}
      </Text>
      <Text style={st.legenda}>{rotulo}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  legendaCalendario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.base,
    rowGap: space.xs,
  },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pontoLegenda: { width: 14, height: 14, borderRadius: 7 },
  pontoVerde: { backgroundColor: 'rgba(61, 214, 140, 0.16)' },
  pontoAmbar: {
    backgroundColor: 'rgba(245, 165, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 36, 0.6)',
  },
  iniciaisLegenda: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.success,
  },
  iniciaisLegendaTexto: {
    fontSize: 8,
    lineHeight: 10,
    fontFamily: 'Inter_700Bold',
    color: color.text,
  },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  cardSemana: {
    padding: space.base,
    paddingLeft: space.lg,
    gap: space.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  cardSemanaAviso: { borderColor: 'rgba(245, 165, 36, 0.45)' },
  editar: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  quando: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
  secao: { gap: space.md },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { color: color.warn },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.7 },

  cardLista: { paddingVertical: space.xs, gap: 0, overflow: 'hidden' },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaTreino: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingLeft: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },

  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: onDark.fill,
  },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },

  selos: { alignItems: 'flex-end', gap: space.sm },
  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.muted },
  seloCategoria: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloCategoriaRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

  cardPartida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },

  notas: { flexDirection: 'row', justifyContent: 'space-between' },
  nota: { flex: 1, gap: space.xs },
  notaValor: { ...type.h1, fontFamily: 'Inter_700Bold', color: color.text },
  notaValorAlerta: { color: color.warn },

  botaoSecundario: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    // o mesmo secundario do app: roxo claro, abaixo do principal (roxo cheio)
    backgroundColor: 'rgba(158, 5, 210, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(194, 75, 238, 0.55)',
  },
  botaoSecundarioRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
})
