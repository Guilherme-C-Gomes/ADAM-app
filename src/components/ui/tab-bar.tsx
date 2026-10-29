import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconeChamada, IconeEstudo, IconeJogo, IconeSecretaria } from '@/components/ui/icones'
import { molaPop, usePilulaDeslizante } from '@/components/ui/movimento'
import { usePendentes } from '@/data/inscricoes'
import { criarRascunho } from '@/hooks/use-rascunho'
import { color, onDark, radius, space, target } from '@/theme/tokens'

const ALTURA_BARRA = 60

/** Folga entre o fim da tela e a pilula, no alto da faixa da barra. */
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
 * Nao e nativa de proposito: o design pede uma pilula de raio 24, que a
 * UITabBar do sistema nao faz. Ela mora numa faixa propria no fim da
 * tela (o conteudo termina acima, nunca passa por baixo) e o setor ativo
 * ganha uma pilula roxa que desliza ate ele.
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

  // uma pilula so, que desliza ate o setor ativo
  const rotaAtiva = state.routes[state.index]
  const chaveAtiva = rotaAtiva ? (rotaAtiva.key ?? rotaAtiva.name) : ''
  const pilula = usePilulaDeslizante(chaveAtiva)

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
        {/* trilho sem borda nem padding: a posicao medida de cada item e
            a mesma que a pilula absoluta usa */}
        <View style={s.trilho}>
          {pilula.medida ? (
            <Animated.View
              pointerEvents="none"
              style={[
                s.pilula,
                {
                  top: pilula.medida.y,
                  width: pilula.medida.largura,
                  height: pilula.medida.altura,
                },
                pilula.estilo,
              ]}
            />
          ) : null}
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
                // ate a pilula ser medida, o item ativo pinta o proprio fundo
                fundo={ativo && !pilula.medida}
                onLayout={pilula.medir(route.key ?? route.name)}
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
    </View>
  )
}

/** Um icone da barra. Ao virar o ativo, da um pulinho (escala 1.15 e volta). */
function ItemBarra({
  nome,
  ativo,
  selo,
  fundo,
  onLayout,
  onPress,
}: {
  nome: keyof typeof ICONES
  ativo: boolean
  /** numero pequeno no canto do icone (0 = sem) */
  selo: number
  fundo: boolean
  onLayout: (e: LayoutChangeEvent) => void
  onPress: () => void
}) {
  const Icone = ICONES[nome]
  const escala = useSharedValue(1)
  const primeiro = useRef(true)

  useEffect(() => {
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
  }, [ativo, escala])

  const pulo = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }))

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      style={({ pressed }) => [s.item, fundo && s.itemAtivo, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={
        selo
          ? `${ROTULOS[nome]}, ${selo} ${selo === 1 ? 'inscrição nova' : 'inscrições novas'}`
          : ROTULOS[nome]
      }>
      <Animated.View style={pulo}>
        <Icone cor={ativo ? color.text : color.muted} />
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
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    height: ALTURA_BARRA,
    paddingHorizontal: space.sm,
    borderRadius: radius.nav,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  trilho: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
  },
  pilula: {
    position: 'absolute',
    left: 0,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  item: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAtivo: { backgroundColor: onDark.fill },
  // Feedback de toque do design: escala 0.97 junto da opacidade.
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
})
