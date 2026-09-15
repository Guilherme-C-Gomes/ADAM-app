import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconeEstudo, IconeJogo, IconeSecretaria } from '@/components/ui/icones'
import { color, onDark, radius, space, target } from '@/theme/tokens'

/**
 * Barra dos tres setores (Jogo, Secretaria, Estudo).
 *
 * E flutuante e nao nativa de proposito: o design pede pilula de vidro
 * com raio 24 sobre o conteudo, que a UITabBar do sistema nao faz. O
 * setor ativo ganha a pilula roxa cheia.
 *
 * Ajustes nao mora aqui: chega pelo perfil no topo das telas.
 */
const ICONES = {
  jogo: IconeJogo,
  secretaria: IconeSecretaria,
  estudo: IconeEstudo,
} as const

const ROTULOS = {
  jogo: 'Jogo',
  secretaria: 'Secretaria',
  estudo: 'Estudo',
} as const

/**
 * Recorte do que a barra usa das props do navegador. Tipar assim evita
 * depender de `@react-navigation/bottom-tabs`, que e dependencia
 * transitiva do expo-router e nao esta no package.json.
 */
type PropsBarra = {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (e: {
      type: 'tabPress'
      target: string
      canPreventDefault: true
    }) => { defaultPrevented: boolean }
    navigate: (nome: string) => void
  }
}

export function TabBar({ state, navigation }: PropsBarra) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[s.wrapper, { paddingBottom: Math.max(insets.bottom, space.base) }]}>
      <View style={s.barra}>
        {state.routes.map((route, i) => {
          const nome = route.name as keyof typeof ICONES
          const Icone = ICONES[nome]
          if (!Icone) return null

          const ativo = state.index === i

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const evento = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!ativo && !evento.defaultPrevented) {
                  navigation.navigate(route.name)
                }
              }}
              style={({ pressed }) => [s.item, ativo && s.itemAtivo, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={ROTULOS[nome]}>
              <Icone cor={ativo ? color.text : color.muted} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    height: 60,
    paddingHorizontal: space.sm,
    borderRadius: radius.nav,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
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
