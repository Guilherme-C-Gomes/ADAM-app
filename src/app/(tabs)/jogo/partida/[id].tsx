import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip } from '@/components/ui'
import { Campo } from '@/components/ui/campo'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao, Entrada, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { DIAS_SEMANA } from '@/data/calendario'
import { formacoesDe } from '@/data/jogo'
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
import { canvas, color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

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

        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Campo posicoes={mapa[formacao] ?? mapa[nomes[0]]} largura={larguraCampo} />
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

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/jogo/convocados/[id]', params: { id: jogo.id } })
            }
            style={({ pressed }) => pressed && st.pressed}
            accessibilityRole="button"
            accessibilityLabel="Ver convocados">
            <Card style={st.grupo}>
              <View style={st.linhaGrupo}>
                <View style={st.linhaTexto}>
                  <Text style={st.cardTitulo}>Convocados</Text>
                  <Text style={st.legenda}>
                    {convocados.length
                      ? `${emCampo} em campo · ${noBanco} no banco`
                      : 'Ninguém convocado ainda'}
                  </Text>
                </View>
                <Icone nome="seta" cor={color.faint} />
              </View>
            </Card>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: '/jogo/comissao', params: { alvo: jogo.id } })}
            style={({ pressed }) => [st.comissao, pressed && st.pressed]}
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
          </Pressable>
        </Animated.View>

        {jaFoi ? (
          <Animated.View entering={FadeInDown.duration(motion.medium).delay(60)}>
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

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
          <Pressable
            onPress={() => salvar({ formacao }, 'Escalação salva', true)}
            disabled={salvando}
            style={({ pressed }) => [st.botao, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.botaoRotulo}>{salvando ? 'Salvando…' : 'Salvar escalação'}</Text>
          </Pressable>
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
          <Animated.View
            entering={FadeInDown.duration(motion.medium).delay(120)}
            style={st.excluir}>
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

const st = StyleSheet.create({
  placar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  placarLado: { flex: 1 },
  placarX: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.muted, paddingBottom: space.md },
  editar: { alignSelf: 'center', paddingTop: space.base },
  excluir: { gap: space.sm, marginTop: space.lg },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
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
  pressed: { opacity: 0.85 },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
