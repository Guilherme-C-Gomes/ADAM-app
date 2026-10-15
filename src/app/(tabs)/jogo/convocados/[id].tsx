import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card } from '@/components/ui'
import { EstadoVazio } from '@/components/ui/estados'
import { Aviso } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { HeroVoltar, Segmentado } from '@/components/ui/setor'
import { jogadoresEmCampo } from '@/data/jogo'
import {
  definirSituacao,
  desconvocar,
  NOME_POSICAO,
  useAtletas,
  useDetalheJogo,
  type Situacao,
} from '@/data/jogo-dados'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Telas 11o e 11o2. Duas situacoes, uma lista: quem esta em campo e quem
 * esta no banco. Tocar numa linha remaneja entre as duas — e o que a
 * escalacao le depois. O x tira da convocacao.
 *
 * R3: quantos cabem em campo sai da modalidade, nao de numero fixo.
 */
export default function Convocados() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const detalhe = useDetalheJogo(id)
  const atletas = useAtletas()
  const [situacao, setSituacao] = useState<Situacao>('campo')
  // mudancas feitas aqui, por cima do que veio do banco (aparecem na hora)
  const [ajustes, setAjustes] = useState<Record<string, Situacao | 'fora'>>({})
  const [erro, setErro] = useState<string | null>(null)

  const jogo = detalhe.dados?.jogo
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

  const lista = (detalhe.dados?.convocados ?? [])
    .map((c) => ({ ...c, situacao: ajustes[c.criancaId] ?? c.situacao }))
    .filter((c): c is { criancaId: string; situacao: Situacao } => c.situacao !== 'fora')
  const pessoa = (criancaId: string) => atletas.lista.find((a) => a.id === criancaId)
  const limiteCampo = jogadoresEmCampo(jogo.modalidade)
  const emCampo = lista.filter((c) => c.situacao === 'campo').length
  const noBanco = lista.length - emCampo
  const porSituacao = lista.filter((c) => c.situacao === situacao)

  const remanejar = async (criancaId: string, atual: Situacao) => {
    const nova: Situacao = atual === 'campo' ? 'banco' : 'campo'
    setAjustes((a) => ({ ...a, [criancaId]: nova }))
    setErro(null)
    try {
      await definirSituacao(jogo.id, criancaId, nova)
    } catch (e) {
      setAjustes((a) => ({ ...a, [criancaId]: atual }))
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar.')
    }
  }

  const tirar = async (criancaId: string, atual: Situacao) => {
    setAjustes((a) => ({ ...a, [criancaId]: 'fora' }))
    setErro(null)
    try {
      await desconvocar(jogo.id, criancaId)
    } catch (e) {
      setAjustes((a) => ({ ...a, [criancaId]: atual }))
      setErro(e instanceof Error ? e.message : 'Não foi possível tirar.')
    }
  }

  const rotuloCampo = `Em campo · ${emCampo}`
  const rotuloBanco = `Banco · ${noBanco}`

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Convocados"
        subtitulo={`ADAM × ${jogo.adversario} · ${jogo.categoria} · ${jogo.modalidade}`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        <Segmentado
          opcoes={[rotuloCampo, rotuloBanco] as const}
          valor={situacao === 'campo' ? rotuloCampo : rotuloBanco}
          onChange={(v) => setSituacao(v.startsWith('Em campo') ? 'campo' : 'banco')}
        />

        {situacao === 'campo' && lista.length && emCampo !== limiteCampo ? (
          <Card style={st.aviso}>
            <View style={st.acentoAviso} />
            <Text style={st.avisoTexto}>
              {emCampo < limiteCampo
                ? `Faltam ${limiteCampo - emCampo} para completar os ${limiteCampo} de ${jogo.modalidade.toLowerCase()}`
                : `${emCampo - limiteCampo} a mais do que os ${limiteCampo} de ${jogo.modalidade.toLowerCase()}`}
            </Text>
          </Card>
        ) : null}

        {porSituacao.length ? (
          <Animated.View entering={FadeInDown.duration(motion.medium)}>
            <Card style={st.cardLista}>
              {porSituacao.map((c, i) => {
                const p = pessoa(c.criancaId)
                return (
                  <View
                    key={c.criancaId}
                    style={[st.linha, i < porSituacao.length - 1 && st.divisoria]}>
                    <Pressable
                      onPress={() => remanejar(c.criancaId, c.situacao)}
                      style={({ pressed }) => [st.linhaToque, pressed && st.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${p?.nome ?? 'Criança'}, mover para ${
                        situacao === 'campo' ? 'o banco' : 'o campo'
                      }`}>
                      <Avatar iniciais={p?.iniciais ?? '?'} size={36} />
                      <View style={st.linhaTexto}>
                        <Text style={st.linhaNome}>{p?.nome ?? 'Criança sem ficha ativa'}</Text>
                        <Text style={st.legenda}>{p ? `${p.idade} anos` : ''}</Text>
                      </View>
                      <View style={st.selo}>
                        <Text style={st.seloRotulo}>
                          {p?.posicao ? NOME_POSICAO[p.posicao] : 'sem posição'}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => tirar(c.criancaId, c.situacao)}
                      hitSlop={space.md}
                      accessibilityRole="button"
                      accessibilityLabel={`Tirar ${p?.nome ?? 'criança'} da convocação`}>
                      <Icone nome="fechar" cor={color.muted} />
                    </Pressable>
                  </View>
                )
              })}
            </Card>
          </Animated.View>
        ) : (
          <EstadoVazio
            titulo={situacao === 'campo' ? 'Ninguém em campo' : 'Banco vazio'}
            linhas={[
              lista.length
                ? 'Toque em quem já está convocado para mover entre campo e banco.'
                : 'Convoque atletas elegíveis para este jogo.',
            ]}
          />
        )}

        <Pressable
          onPress={() => router.push({ pathname: '/jogo/convocar/[id]', params: { id: jogo.id } })}
          style={({ pressed }) => [st.botao, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoRotulo}>Convocar crianças</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  linhaToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },

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
  pressed: { opacity: 0.7 },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

  aviso: { paddingLeft: space.lg, overflow: 'hidden' },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
  avisoTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },

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
