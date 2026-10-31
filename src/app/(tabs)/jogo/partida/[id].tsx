import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { Keyframe, ReduceMotion } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip } from '@/components/ui'
import { Campo } from '@/components/ui/campo'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao, Entrada, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { DIAS_SEMANA } from '@/data/calendario'
import { formacoesDe, type PosicaoTatica } from '@/data/jogo'
import {
  atualizarJogo,
  diaMes,
  excluirJogo,
  horaCurta,
  rascunhoJogo,
  useDetalheJogo,
  type DetalheJogo,
} from '@/data/jogo-dados'
import { deISO, hojeISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import {
  canvas,
  color,
  motion,
  onDark,
  radius,
  space,
  target,
  type,
  ESPACO_FIM_DA_TELA,
} from '@/theme/tokens'

/** Telas 11c e 11n: a escalacao muda de formacoes conforme a modalidade (R3). */
export default function Escalacao() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const detalhe = useDetalheJogo(id)

  if (!detalhe.dados) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar
          titulo={detalhe.carregando ? 'Abrindo o jogo…' : 'Jogo não encontrado'}
          subtitulo={detalhe.erro ?? 'Volte para a lista de jogos'}
          voltarPara="/jogo"
        />
        {detalhe.carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </SafeAreaView>
    )
  }
  // a modalidade entra na chave: trocar Campo/Society muda as formacoes possiveis
  return (
    <Partida
      key={`${detalhe.dados.jogo.id}-${detalhe.dados.jogo.modalidade}`}
      detalhe={detalhe.dados}
      recarregar={detalhe.recarregar}
    />
  )
}

function Partida({ detalhe, recarregar }: { detalhe: DetalheJogo; recarregar: () => unknown }) {
  const { jogo, convocados, comissao } = detalhe
  const { nomes, mapa } = formacoesDe(jogo.modalidade)
  const [formacao, setFormacao] = useState(
    jogo.formacao && nomes.includes(jogo.formacao) ? jogo.formacao : nomes[0],
  )
  const [golsAdam, setGolsAdam] = useState(jogo.golsAdam === null ? '' : String(jogo.golsAdam))
  const [golsAdv, setGolsAdv] = useState(
    jogo.golsAdversario === null ? '' : String(jogo.golsAdversario),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // excluir e so de quem administra o Jogo (o banco tambem recusa os outros)
  const { administraJogo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  const emCampo = convocados.filter((c) => c.situacao === 'campo').length
  const noBanco = convocados.length - emCampo
  const larguraCampo = canvas.width - canvas.gutter * 2
  const jaFoi = jogo.data <= hojeISO()
  const numero = (t: string) => (t.trim() === '' ? null : Number(t.replace(/\D/g, '')))

  const salvar = async (
    dados: Parameters<typeof atualizarJogo>[1],
    recado: string,
    sair = false,
  ) => {
    setErro(null)
    setSalvando(true)
    try {
      await atualizarJogo(jogo.id, dados)
      mostrarRecado(recado)
      if (sair) voltar('/jogo')
      else recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: `Excluir o jogo contra ${jogo.adversario}?`,
      texto:
        'A convocação, a comissão, a tática e o placar saem junto, e o jogo deixa de contar nos números do Jogo. Não dá para desfazer.',
      confirmar: 'Excluir jogo',
      perigo: true,
    })
    if (!certeza) return
    setErroExcluir(null)
    setExcluindo(true)
    try {
      await excluirJogo(jogo.id)
      mostrarRecado('Jogo excluído')
      voltar('/jogo')
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir.')
      setExcluindo(false)
    }
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={`ADAM × ${jogo.adversario}`}
        subtitulo={`${DIAS_SEMANA[deISO(jogo.data).getDay()].toLowerCase()} ${diaMes(jogo.data)}, ${horaCurta(jogo.hora)} · ${jogo.categoria} · ${jogo.modalidade}`}
        voltarPara="/jogo"
        acao={{
          icone: 'menu',
          rotulo: 'Compartilhar convocação',
          onPress: () =>
            router.push({ pathname: '/jogo/compartilhar/[id]', params: { id: jogo.id } }),
        }}
      />

      <ScrollView
        contentContainerStyle={st.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        <View style={st.formacoes}>
          {nomes.map((f) => (
            <Chip key={f} rotulo={f} ativo={formacao === f} onPress={() => setFormacao(f)} />
          ))}
        </View>

        <Animated.View entering={entrada(0)}>
          <CampoTatico
            formacao={formacao}
            posicoes={mapa[formacao] ?? mapa[nomes[0]]}
            largura={larguraCampo}
          />
        </Animated.View>

        <View style={st.linhaTopo}>
          <Text style={st.legenda}>
            {jogo.formacao ? `Tática salva: ${jogo.formacao}` : 'Nenhuma tática salva ainda'}
          </Text>
          <Pressable
            onPress={() => salvar({ formacao }, `Tática ${formacao} salva`)}
            disabled={salvando}
            hitSlop={space.sm}
            accessibilityRole="button">
            <Text style={st.link}>Salvar tática</Text>
          </Pressable>
        </View>

        <Animated.View entering={entrada(1)}>
          <Pressionavel
            onPress={() =>
              router.push({ pathname: '/jogo/convocados/[id]', params: { id: jogo.id } })
            }
            accessibilityRole="button"
            accessibilityLabel="Ver convocados">
            <Card style={st.grupo}>
              <View style={st.linhaGrupo}>
                <View style={st.linhaTexto}>
                  <Text style={st.cardTitulo}>Convocados</Text>
                  {convocados.length ? (
                    <View style={st.contagem}>
                      <NumeroAnimado valor={emCampo} style={st.legenda} />
                      <Text style={st.legenda}>{' em campo · '}</Text>
                      <NumeroAnimado valor={noBanco} style={st.legenda} />
                      <Text style={st.legenda}>{' no banco'}</Text>
                    </View>
                  ) : (
                    <Text style={st.legenda}>Ninguém convocado ainda</Text>
                  )}
                </View>
                <Icone nome="seta" cor={color.faint} />
              </View>
            </Card>
          </Pressionavel>

          <Pressionavel
            onPress={() => router.push({ pathname: '/jogo/comissao', params: { alvo: jogo.id } })}
            style={st.comissao}
            accessibilityRole="button"
            accessibilityLabel="Comissão técnica do jogo">
            <Card style={st.grupo}>
              <View style={st.linhaGrupo}>
                <View style={st.linhaTexto}>
                  <Text style={st.cardTitulo}>Comissão técnica</Text>
                  <Text style={st.legenda}>Quem conduz o jogo</Text>
                </View>
                <Selo
                  rotulo={`${comissao.length} ${comissao.length === 1 ? 'escalado' : 'escalados'}`}
                  tom={comissao.length ? 'roxo' : 'ambar'}
                />
                <Icone nome="seta" cor={color.faint} />
              </View>
            </Card>
          </Pressionavel>
        </Animated.View>

        {jaFoi ? (
          <Animated.View entering={entrada(2)}>
            <Card style={st.grupo}>
              <Text style={st.cardTitulo}>Resultado</Text>
              <View style={st.placar}>
                <View style={st.placarLado}>
                  <Entrada
                    rotulo="ADAM"
                    value={golsAdam}
                    onChangeText={setGolsAdam}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="—"
                  />
                </View>
                <Text style={st.placarX}>×</Text>
                <View style={st.placarLado}>
                  <Entrada
                    rotulo={jogo.adversario}
                    value={golsAdv}
                    onChangeText={setGolsAdv}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="—"
                  />
                </View>
              </View>
              <Botao
                rotulo="Salvar resultado"
                variante="secundario"
                desabilitado={salvando || (golsAdam.trim() === '') !== (golsAdv.trim() === '')}
                onPress={() =>
                  salvar(
                    { golsAdam: numero(golsAdam), golsAdversario: numero(golsAdv) },
                    'Resultado salvo',
                  )
                }
              />
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={entrada(3)}>
          <Pressionavel
            onPress={() => salvar({ formacao }, 'Escalação salva', true)}
            disabled={salvando}
            style={st.botao}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>{salvando ? 'Salvando…' : 'Salvar escalação'}</Text>
          </Pressionavel>
          <Pressable
            onPress={() => {
              rascunhoJogo.definir({
                id: jogo.id,
                campeonato: jogo.campeonato ?? '',
                adversario: jogo.adversario,
                categoria: jogo.categoria as never,
                data: jogo.data,
                hora: jogo.hora,
                local: jogo.local,
                modalidade: jogo.modalidade,
              })
              router.push('/jogo/novo-jogo')
            }}
            hitSlop={space.sm}
            style={st.editar}
            accessibilityRole="button">
            <Text style={st.link}>Editar dados do jogo</Text>
          </Pressable>
        </Animated.View>

        {administraJogo ? (
          <Animated.View entering={entrada(4)} style={st.excluir}>
            {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
            <Botao
              rotulo={excluindo ? 'Excluindo…' : 'Excluir jogo'}
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

/** Mesmo tamanho de ficha do Campo, para os jogadores caberem no desenho. */
const FICHA = 34

/**
 * Jogador que entra crescendo de 0.6 e acendendo, um depois do outro.
 * Um Keyframe novo por ficha: o atraso de cada uma e dela.
 */
function fichaEntra(i: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.6 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: motion.backOut },
  })
    .duration(360)
    .delay(Math.min(i * motion.stagger, 300))
    .reduceMotion(ReduceMotion.System)
}

/**
 * O campo desenhado pelo Campo (sem jogadores) e as fichas por cima.
 * A chave de cada ficha leva a formacao: trocar a tatica remonta as
 * fichas e elas entram de novo em cascata, cada uma no lugar novo.
 */
function CampoTatico({
  formacao,
  posicoes,
  largura,
}: {
  formacao: string
  posicoes: PosicaoTatica[]
  largura: number
}) {
  const altura = Math.round(largura * 1.16)
  return (
    <View style={[st.campo, { width: largura, height: altura }]}>
      <Campo posicoes={[]} largura={largura} />
      {posicoes.map((p, i) => (
        <Animated.View
          key={`${formacao}-${p.numero}`}
          entering={fichaEntra(i)}
          style={[
            st.ficha,
            {
              // fy 0 e a linha de fundo do ADAM, que na tela fica embaixo
              left: p.fx * (largura - FICHA),
              top: (1 - p.fy) * (altura - FICHA),
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel={`Jogador ${p.numero}`}>
          <Text style={st.fichaNumero}>{p.numero}</Text>
        </Animated.View>
      ))}
    </View>
  )
}

const st = StyleSheet.create({
  campo: { alignSelf: 'center' },
  ficha: {
    position: 'absolute',
    width: FICHA,
    height: FICHA,
    borderRadius: FICHA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.cheio,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fichaNumero: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.onPrimary },
  contagem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  placar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  placarLado: { flex: 1 },
  placarX: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.muted, paddingBottom: space.md },
  editar: { alignSelf: 'center', paddingTop: space.base },
  excluir: { gap: space.sm, marginTop: space.lg },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
  formacoes: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  grupo: { paddingVertical: space.xs, gap: 0 },
  divisoria: { height: 1, backgroundColor: color.divider },
  linhaGrupo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },

  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },
  confirmacao: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.success },
  comissao: { marginTop: space.sm },
  linhaTexto: { flex: 1, gap: 2 },

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
