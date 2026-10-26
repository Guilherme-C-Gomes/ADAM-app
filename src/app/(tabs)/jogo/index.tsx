import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Overline } from '@/components/ui'
import { Aviso, Calendario, SeletorPeriodo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { HeroSetor, Segmentado } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'
import { DIAS_CURTOS, rotuloCurto, rotuloLongo } from '@/data/calendario'
import { NOME_TURMA, useUnidades } from '@/data/chamada'
import { LIMITE_COMPREENSAO } from '@/data/jogo'
import {
  abrirPlano,
  diaMes,
  horaCurta,
  marcasDoMes,
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
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''
  const semTecnico = escala.filter((l) => !l.tecnicoId)

  // O calendario: cada dia com treino ou horario fixo ganha uma bolinha —
  // verde se todos tem tecnico, ambar se falta. Tocar abre o dia.
  const agora = new Date()
  const [mes, setMes] = useState({ ano: agora.getFullYear(), mes: agora.getMonth() })
  const doMes = useTreinosDoMes(mes.ano, mes.mes)
  const marcas = marcasDoMes(mes.ano, mes.mes, escala, doMes.lista)
  const pendentes = Object.values(marcas).filter((m) => m === 'pendente').length
  const ehEsteMes = mes.ano === agora.getFullYear() && mes.mes === agora.getMonth()

  return (
    <>
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

      <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
        <Overline>Escala do mês</Overline>
        <Calendario
          ano={mes.ano}
          mes={mes.mes}
          marcas={marcas}
          hoje={ehEsteMes ? agora.getDate() : undefined}
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
          <View style={[st.pontoLegenda, { backgroundColor: color.success }]} />
          <Text style={st.legenda}>com técnico</Text>
          <View
            style={[st.pontoLegenda, { backgroundColor: color.warn, marginLeft: space.base }]}
          />
          <Text style={st.legenda}>
            {pendentes
              ? `falta técnico em ${pendentes} ${pendentes === 1 ? 'dia' : 'dias'}`
              : 'falta técnico'}
          </Text>
        </View>
        <Text style={st.legenda}>
          {editaEscala
            ? 'Toque num dia para escolher o técnico daquela data.'
            : 'Toque num dia para ver quem está escalado.'}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
        <Overline>Horários fixos da semana</Overline>
        {escala.length ? (
          <Card style={st.cardLista}>
            {escala.map((l, i) => {
              const tecnico = nomeNaEquipe(equipe, l.tecnicoId)
              return (
                <View key={l.id} style={[st.linha, i < escala.length - 1 && st.divisoria]}>
                  <Text style={st.escalaDia}>{DIAS_CURTOS[l.diaSemana]}</Text>
                  <Text style={st.escalaHora}>{horaCurta(l.hora)}</Text>
                  <Text style={[st.escalaNome, !tecnico && st.legendaAviso]} numberOfLines={1}>
                    {tecnico ?? 'a definir'}
                  </Text>
                  <Text style={st.legenda}>
                    {NOME_TURMA[l.turma]}
                    {varias ? ` · ${nomeUnidade(l.unidadeId)}` : ''}
                  </Text>
                </View>
              )
            })}
          </Card>
        ) : (
          <Card>
            <Text style={st.legenda}>
              {editaEscala
                ? 'A escala ainda está vazia. Adicione os horários de treino da semana.'
                : 'A coordenação técnica ainda não montou a escala.'}
            </Text>
          </Card>
        )}
      </Animated.View>

      {semTecnico.length ? (
        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
          <Pressable
            onPress={() => router.push('/jogo/escala')}
            disabled={!editaEscala}
            style={({ pressed }) => pressed && st.pressed}
            accessibilityRole={editaEscala ? 'button' : 'text'}>
            <Card style={st.cardAlerta}>
              <View style={st.acentoAviso} />
              <View style={st.linhaTexto}>
                <Text style={st.cardTitulo}>
                  {semTecnico.length}{' '}
                  {semTecnico.length === 1 ? 'horário sem técnico' : 'horários sem técnico'}
                </Text>
                <Text style={st.legenda}>
                  {semTecnico
                    .map((l) => `${DIAS_CURTOS[l.diaSemana]} ${horaCurta(l.hora)}`)
                    .join(', ')}
                </Text>
              </View>
              {editaEscala ? <Icone nome="seta" cor={color.faint} /> : null}
            </Card>
          </Pressable>
        </Animated.View>
      ) : null}

      {editaEscala ? (
        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Pressable
            onPress={() => router.push('/jogo/escala')}
            style={({ pressed }) => [st.botaoSecundario, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoSecundarioRotulo}>Editar escala</Text>
          </Pressable>
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
  legendaCalendario: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pontoLegenda: { width: 8, height: 8, borderRadius: 4 },
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
  cardAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },

  escalaDia: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted, width: 32 },
  escalaHora: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text, width: 36 },
  escalaNome: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },

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
