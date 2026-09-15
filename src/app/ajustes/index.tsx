import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Hero, Overline } from '@/components/ui'
import { Esqueleto, SkeletonLista } from '@/components/ui/skeleton'
import { useCarregamento } from '@/hooks/use-carregamento'
import { alternarModoOffline, useModoOffline } from '@/hooks/use-modo-offline'
import { contaAtual, turmas, unidadesInfo, usuarios } from '@/data/mock'
import { color, motion, onDark, space, target, type } from '@/theme/tokens'

export default function Ajustes() {
  const carregando = useCarregamento()
  const offline = useModoOffline()

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Hero titulo="Ajustes" subtitulo="Conta e configuração do app" />

      <ScrollView
        contentContainerStyle={st.conteudo}
        showsVerticalScrollIndicator={false}>
        {carregando ? (
          <Esqueleto>
            <SkeletonLista linhas={1} />
            <SkeletonLista linhas={3} />
            <SkeletonLista linhas={1} />
          </Esqueleto>
        ) : (
          <>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
        <Pressable
          onPress={() => router.push('/ajustes/conta')}
          style={({ pressed }) => pressed && st.pressed}
          accessibilityRole="button">
          <Card style={st.linhaNav}>
            <Avatar iniciais={contaAtual.iniciais} size={44} />
            <View style={st.linhaNavTexto}>
              <Text style={st.cardTitulo}>{contaAtual.nome}</Text>
              <Text style={st.legenda}>{contaAtual.email}</Text>
            </View>
            <Text style={st.chevron}>›</Text>
          </Card>
        </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)}>
        <Overline>Configuração da ADAM</Overline>

        <Card style={st.cardLista}>
          <Pressable
            onPress={() => router.push('/ajustes/unidades')}
            style={({ pressed }) => [st.linha, st.linhaDivisoria, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.linhaRotulo}>Unidades e turmas</Text>
            <View style={st.linhaFinal}>
              <Text style={st.linhaValor}>
                {unidadesInfo.length} e {turmas.length}
              </Text>
              <Text style={st.chevron}>›</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/ajustes/usuarios')}
            style={({ pressed }) => [st.linha, st.linhaDivisoria, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.linhaRotulo}>Usuários e permissões</Text>
            <View style={st.linhaFinal}>
              <Text style={st.linhaValor}>{usuarios.length} pessoas</Text>
              <Text style={st.chevron}>›</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/ajustes/acessos')}
            style={({ pressed }) => [st.linha, pressed && st.pressed]}
            accessibilityRole="button">
            <Text style={st.linhaRotulo}>Registro de acessos</Text>
            <View style={st.linhaFinal}>
              <Text style={st.linhaValor}>últimos 30 dias</Text>
              <Text style={st.chevron}>›</Text>
            </View>
          </Pressable>
        </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)}>
        <Overline>Demonstração</Overline>
        <Card style={st.linhaNav}>
          <View style={st.linhaNavTexto}>
            <Text style={st.cardTitulo}>Simular sem conexão</Text>
            <Text style={st.legenda}>Mostra o banner offline na tela Início</Text>
          </View>
          <Switch
            value={offline}
            onValueChange={alternarModoOffline}
            trackColor={{ true: onDark.fill, false: color.surface2 }}
          />
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
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: space.xxxl },

  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  pressed: { opacity: 0.85 },

  linhaNav: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  linhaNavTexto: { flex: 1, gap: 2 },
  chevron: { ...type.body, color: color.faint },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaRotulo: { ...type.body, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },
  linhaFinal: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  linhaValor: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
