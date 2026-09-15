import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Contador } from '@/components/ui'
import { Esqueleto, SkeletonCard } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import { LIMITE_BAIXA_FREQUENCIA, participantes } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

export default function PerfilParticipante() {
  const carregando = useCarregamento(1000)
  const { id } = useLocalSearchParams<{ id: string }>()
  const p = participantes.find((x) => x.id === id)

  if (!p) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <View style={st.ausente}>
          <Text style={st.ausenteTitulo}>Participante não encontrado</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={st.link}>Voltar para a lista</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const baixa = p.frequencia < LIMITE_BAIXA_FREQUENCIA
  const presencas = p.semanas.filter(Boolean).length

  const dados = [
    { rotulo: 'Unidade', valor: p.unidade },
    { rotulo: 'Turma', valor: p.turma },
    { rotulo: 'Idade', valor: `${p.idade} anos` },
    { rotulo: 'Participa desde', valor: p.desde },
  ]

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={st.topo}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space.sm}
          style={({ pressed }) => [st.botaoIcone, pressed && st.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Text style={st.icone}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={st.conteudo}
        showsVerticalScrollIndicator={false}>
        <View style={st.cabecalho}>
          <Avatar iniciais={p.iniciais} size={68} />
          <Text style={st.nome}>{p.nome}</Text>
          <Text style={st.meta}>
            {p.idade} anos · {p.unidade} · desde {p.desde}
          </Text>
        </View>

        {carregando ? (
          <Esqueleto>
            <SkeletonCard altura={208} />
            <SkeletonCard altura={200} />
            <SkeletonCard altura={100} />
          </Esqueleto>
        ) : (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Card>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Frequência</Text>
            <View style={[st.selo, baixa ? st.seloBaixa : st.seloOk]}>
              <Text style={[st.seloRotulo, baixa ? st.corBaixa : st.corOk]}>
                {baixa ? 'Em atenção' : 'Saudável'}
              </Text>
            </View>
          </View>
          <Text style={st.legenda}>Últimas 8 semanas</Text>

          <View style={st.valorLinha}>
            <Contador valor={p.frequencia} sufixo="%" style={st.valor} />
            <Text style={st.legenda}>
              {presencas} de {p.semanas.length} treinos
            </Text>
          </View>

          <View style={st.semanas}>
            {p.semanas.map((presente, i) => (
              <View
                key={i}
                style={[
                  st.semana,
                  { backgroundColor: presente ? color.success : color.surface2 },
                ]}
                accessibilityLabel={`Semana ${i + 1}: ${presente ? 'presente' : 'ausente'}`}
              />
            ))}
          </View>
          <Text style={st.legenda}>
            {baixa
              ? 'Abaixo do limite de 60% — vale contato da equipe'
              : 'Dentro do esperado para o período'}
          </Text>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
        <Card style={st.cardLista}>
          <View style={st.linhaTopo}>
            <Text style={st.cardTitulo}>Cadastro</Text>
            <View
              style={[
                st.selo,
                p.responsavel === 'Cadastro pendente' ? st.seloBaixa : st.seloOk,
              ]}>
              <Text
                style={[
                  st.seloRotulo,
                  p.responsavel === 'Cadastro pendente' ? st.corBaixa : st.corOk,
                ]}>
                {p.responsavel}
              </Text>
            </View>
          </View>
          {dados.map((d, i) => (
            <View
              key={d.rotulo}
              style={[st.linha, i < dados.length - 1 && st.linhaDivisoria]}>
              <Text style={st.linhaRotulo}>{d.rotulo}</Text>
              <Text style={st.linhaValor}>{d.valor}</Text>
            </View>
          ))}
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Card>
          <Text style={st.cardTitulo}>Observações da equipe</Text>
          <Text style={st.legenda}>{p.observacao}</Text>
        </Card>
        </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  topo: {
    height: target.minimo + space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  botaoIcone: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  icone: { fontSize: 26, lineHeight: 30, color: color.text },
  pressed: { opacity: 0.85 },

  conteudo: { padding: space.lg, gap: space.base, paddingBottom: space.xxxl },
  cabecalho: { alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  nome: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  meta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },

  semanas: { flexDirection: 'row', gap: space.sm },
  semana: { flex: 1, height: 34, borderRadius: 8, borderCurve: 'continuous' },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  seloOk: { backgroundColor: 'rgba(61, 214, 140, 0.12)' },
  seloBaixa: { backgroundColor: 'rgba(245, 165, 36, 0.14)' },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold' },
  corOk: { color: color.success },
  corBaixa: { color: color.warn },

  cardLista: { gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaRotulo: { ...type.body, fontFamily: 'Inter_400Regular', color: color.muted },
  linhaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },

  ausente: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  ausenteTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  link: { ...type.body, fontFamily: 'Inter_600SemiBold', color: onDark.text },
})
