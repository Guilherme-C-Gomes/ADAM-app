import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip, Overline } from '@/components/ui'
import { HeroSetor } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import { SEMANAS, chamadaDeHoje, conteudoDaSemana, escalaEstudo } from '@/data/estudo'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 13. Escala (quem da), conteudo (o que se ensina) e chamada (quem
 * veio) sao o mesmo dia de trabalho do professor, entao moram juntos.
 */
export default function Estudo() {
  const [semana, setSemana] = useState<(typeof SEMANAS)[number]>('Esta semana')
  const [todaEscala, setTodaEscala] = useState(false)
  const carregando = useCarregamento()

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Estudo" subtitulo="Semana de 1 a 7 de setembro" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <View style={st.filtros}>
          {SEMANAS.map((s) => (
            <Chip key={s} rotulo={s} ativo={semana === s} onPress={() => setSemana(s)} />
          ))}
        </View>

        {carregando ? (
          <Esqueleto>
            <SkeletonCard altura={140} />
            <SkeletonLista linhas={3} />
            <SkeletonCard altura={96} />
          </Esqueleto>
        ) : (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card style={st.cardChamada}>
            <View style={st.acentoAviso} />
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Chamada de hoje</Text>
              {chamadaDeHoje.aberta ? (
                <View style={st.selo}>
                  <Text style={st.seloRotulo}>aberta</Text>
                </View>
              ) : null}
            </View>
            <Text style={st.legenda}>
              {chamadaDeHoje.hora} · {chamadaDeHoje.turma} ·{' '}
              {chamadaDeHoje.marcadas ? `${chamadaDeHoje.marcadas} marcadas` : 'sem presença marcada'}
            </Text>
            <Pressable
              onPress={() => router.push('/estudo/chamada')}
              style={({ pressed }) => [st.botao, pressed && st.pressed]}
              accessibilityRole="button">
              <Text style={st.botaoRotulo}>Fazer chamada</Text>
            </Pressable>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Escala da semana</Overline>
          <Card style={st.cardLista}>
            {(todaEscala ? escalaEstudo : escalaEstudo.slice(0, 3)).map((l, i, arr) => (
              <View key={l.id} style={[st.linha, i < arr.length - 1 && st.divisoria]}>
                <Text style={st.dia}>{l.dia}</Text>
                <Text style={st.hora}>{l.hora}</Text>
                <Text style={[st.nome, !l.responsavel && st.aviso]}>
                  {l.responsavel ?? 'a definir'}
                </Text>
                <Text style={st.legenda}>{l.turma}</Text>
              </View>
            ))}
            <Pressable
              onPress={() => setTodaEscala((v) => !v)}
              style={st.linha}
              hitSlop={space.sm}
              accessibilityRole="button">
              <Text style={st.link}>
                {todaEscala
                  ? 'Mostrar só os próximos'
                  : `Ver escala completa · ${escalaEstudo.length}`}
              </Text>
            </Pressable>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)} style={st.secao}>
          <Overline>Conteúdo da semana</Overline>
          <Card style={st.linhaNav}>
            <View style={st.linhaTexto}>
              <Text style={st.cardTitulo}>{conteudoDaSemana.tema}</Text>
              <Text style={st.legenda}>{conteudoDaSemana.objetivo}</Text>
              <View style={st.seloRoxo}>
                <Text style={st.seloRoxoRotulo}>{conteudoDaSemana.materiais} materiais</Text>
              </View>
            </View>
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
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },
  filtros: { flexDirection: 'row', gap: space.sm },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  aviso: { color: color.warn },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.85 },
  chevron: { ...type.body, color: color.faint },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },

  cardChamada: { paddingLeft: space.lg, overflow: 'hidden' },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(245, 165, 36, 0.14)',
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.warn },
  seloRoxo: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.primaryDk,
  },
  seloRoxoRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.primaryCh },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  dia: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted, width: 32 },
  hora: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text, width: 36 },
  nome: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },

  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  linhaTexto: { flex: 1, gap: space.xs },

  botao: {
    minHeight: target.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
