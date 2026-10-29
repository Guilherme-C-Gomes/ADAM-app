import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconeChamada, IconeEstudo, IconeJogo, IconeSecretaria } from '@/components/ui/icones'
import { molaPop } from '@/components/ui/movimento'
import { usePendentes } from '@/data/inscricoes'
import { criarRascunho } from '@/hooks/use-rascunho'
import { color, motion, space } from '@/theme/tokens'

/** Lado de cada botao da barra (quadrado, cantos arredondados). */
const LADO = 54
const ALTURA_BARRA = LADO

/** Folga entre o fim da tela e os botoes, no alto da faixa da barra. */
const FOLGA_TOPO = space.sm

/** A barra esta na tela agora? (some dentro dos formularios) */
const barraNaTela = criarRascunho({ visivel: false })

/**
 * Altura exata da faixa da barra no fim da tela (0 quando ela nao
 * aparece): folga de cima + pilula + margem de baixo do iPhone. O layout
 * das abas usa isso como paddingBottom da cena, entao o conteudo termina
 * acima da barra e nunca passa por baixo dela.
 */
export function useEspacoDaBarra() {
  const { visivel } = barraNaTela.useValor()
  const insets = useSafeAreaInsets()
  return visivel ? FOLGA_TOPO + ALTURA_BARRA + Math.max(insets.bottom, space.base) : 0
}

/**
 * Barra da Chamada e dos setores do perfil.
 *
 * A Chamada vem primeiro para todo mundo. Os setores que o perfil nao usa
 * nem chegam aqui: o layout das abas os protege (`Tabs.Protected`), e rota
 * protegida sai do estado do navegador.
 *
 * Nao e nativa de proposito: botoes pequenos e separados, no centro (como
 * a barra do Pinterest), que a UITabBar do sistema nao faz. Ela mora numa
 * faixa propria no fim da tela (o conteudo termina acima, nunca passa por
 * baixo) e o setor ativo se enche de roxo, com um pulinho no icone.
 *
 * Ajustes nao mora aqui: chega pelo perfil no topo das telas.
 */
const ICONES = {
  chamada: IconeChamada,
  jogo: IconeJogo,
  secretaria: IconeSecretaria,
  estudo: IconeEstudo,
} as const

const ROTULOS = {
  chamada: 'Chamada',
  jogo: 'Jogo',
  secretaria: 'Secretaria',
  estudo: 'Estudo',
} as const

/**
 * Recorte do que a barra usa das props do navegador. Tipar assim evita
 * depender de `@react-navigation/bottom-tabs`, que e dependencia
 * transitiva do expo-router e nao esta no package.json.
 */
type EstadoRota = {
  index?: number
  routes: { key?: string; name: string; state?: EstadoRota }[]
}

type PropsBarra = {
  state: EstadoRota & { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean
    }
    navigate: (nome: string) => void
  }
}

/**
 * Telas que continuam mostrando a barra. No Figma, formulario e
 * seletor ocupam a tela inteira: quem esta preenchendo uma ficha nao
 * troca de setor no meio.
 */
const COM_BARRA = new Set([
  'index',
  'treino/[id]',
  'planejar',
  'relatorio',
  'criancas',
  'aula/[id]',
  'participantes',
  '[id]',
])

/** Nome da rota mais funda em foco, segmento por segmento. */
function caminhoFocado(estado: EstadoRota): string[] {
  const rota = estado.routes[estado.index ?? estado.routes.length - 1]
  if (!rota) return []
  return [rota.name, ...(rota.state ? caminhoFocado(rota.state) : [])]
}

export function TabBar({ state, navigation }: PropsBarra) {
  const insets = useSafeAreaInsets()
  // inscricoes pelo link esperando cadastro: numero no icone da Secretaria
  const { total: inscricoesNovas } = usePendentes()

  // O primeiro segmento e o setor; do segundo em diante e a pilha dele.
  const dentroDoSetor = caminhoFocado(state).slice(1)
  const visivel = !dentroDoSetor.some((nome) => !COM_BARRA.has(nome))

  useEffect(() => {
    barraNaTela.definir({ visivel })
  }, [visivel])

  if (!visivel) return null

  const baixo = Math.max(insets.bottom, space.base)
  return (
    // faixa propria no fim da tela, no fundo liso da tela: a cena termina
    // acima dela (paddingBottom no layout das abas), sem sobrepor nem degrade
    <View style={[s.wrapper, { paddingBottom: baixo }]} pointerEvents="box-none">
      <View style={s.barra}>
        {state.routes.map((route, i) => {
          const nome = route.name as keyof typeof ICONES
          if (!ICONES[nome]) return null
          const ativo = state.index === i
          return (
            <ItemBarra
              key={route.key}
              nome={nome}
              ativo={ativo}
              selo={nome === 'secretaria' ? (inscricoesNovas ?? 0) : 0}
              onPress={() => {
                const evento = navigation.emit({
                  type: 'tabPress',
                  target: route.key ?? route.name,
                  canPreventDefault: true,
                })
                if (!ativo && !evento.defaultPrevented) {
                  navigation.navigate(route.name)
                }
              }}
            />
          )
        })}
      </View>
    </View>
  )
}

/**
 * Um botao da barra. Ao virar o ativo, o fundo se enche de roxo e o icone
 * da um pulinho (escala 1.15 e volta).
 */
function ItemBarra({
  nome,
  ativo,
  selo,
  onPress,
}: {
  nome: keyof typeof ICONES
  ativo: boolean
  /** numero pequeno no canto do icone (0 = sem) */
  selo: number
  onPress: () => void
}) {
  const Icone = ICONES[nome]
  const escala = useSharedValue(1)
  const cheio = useSharedValue(ativo ? 1 : 0)
  const primeiro = useRef(true)

  useEffect(() => {
    cheio.set(
      withTiming(ativo ? 1 : 0, { duration: motion.base, reduceMotion: ReduceMotion.System }),
    )
    // na abertura do app nao pula: so quando o setor muda
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    if (!ativo) return
    escala.set(
      withSequence(
        withTiming(1.15, { duration: 110, reduceMotion: ReduceMotion.System }),
        withSpring(1, molaPop),
      ),
    )
  }, [ativo, escala, cheio])

  const pulo = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }))
  const fundo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(cheio.get(), [0, 1], [color.surface2, color.primary]),
    borderColor: interpolateColor(cheio.get(), [0, 1], [color.border, color.primary]),
  }))

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && s.pressed}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={
        selo
          ? `${ROTULOS[nome]}, ${selo} ${selo === 1 ? 'inscrição nova' : 'inscrições novas'}`
          : ROTULOS[nome]
      }>
      <Animated.View style={[s.item, fundo]}>
        <Animated.View style={pulo}>
          <Icone cor={ativo ? color.text : color.muted} />
        </Animated.View>
        {selo ? (
          <View style={s.selo}>
            <Text style={s.seloTexto}>{selo > 9 ? '9+' : selo}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}

const s = StyleSheet.create({
  selo: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primary,
    borderWidth: 2,
    borderColor: color.surface2,
  },
  seloTexto: { fontSize: 10, lineHeight: 12, fontFamily: 'Inter_700Bold', color: color.text },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: FOLGA_TOPO,
    paddingHorizontal: space.lg,
    backgroundColor: color.bg,
  },
  // botoes soltos, lado a lado no centro: cada um e o seu proprio quadrado
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    height: ALTURA_BARRA,
  },
  item: {
    width: LADO,
    height: LADO,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // a sombra destaca o botao do fundo escuro (no iPhone; no Android, elevation)
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  // Feedback de toque do design: escala 0.97 junto da opacidade.
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
})
