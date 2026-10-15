import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated'

import { Icone } from '@/components/ui/icone'
import { criarRascunho } from '@/hooks/use-rascunho'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Pop-up de confirmacao ("Usuario adicionado com sucesso"). Mora no layout
 * raiz, por cima de tudo, para a tela que salvou poder voltar na hora e o
 * recado continuar visivel na tela de destino.
 *
 * Nao usa o Alert do React Native: na versao web ele nao aparece.
 */
const recado = criarRascunho({ texto: null as string | null, vez: 0 })

const DURACAO = 2600

/** Mostra o pop-up. Chamar de novo troca o texto e reinicia o tempo. */
export function mostrarRecado(texto: string) {
  recado.definir({ texto, vez: recado.ler().vez + 1 })
}

const fechar = () => recado.definir({ texto: null })

export function Recado() {
  const { texto, vez } = recado.useValor()

  // fecha sozinho; um recado novo (outra `vez`) reinicia a contagem
  useEffect(() => {
    if (!texto) return
    const tempo = setTimeout(fechar, DURACAO)
    return () => clearTimeout(tempo)
  }, [texto, vez])

  if (!texto) return null

  return (
    <Animated.View
      key={vez}
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={st.fundo}
      pointerEvents="box-none">
      <Pressable
        onPress={fechar}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={texto}
        accessibilityHint="Toque para fechar">
        <Animated.View entering={ZoomIn.duration(180)} style={st.cartao}>
          <View style={st.selo}>
            <Icone nome="check" cor={color.success} tamanho={22} traco={2.4} />
          </View>
          <Text style={st.texto}>{texto}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

const st = StyleSheet.create({
  fundo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: 'rgba(10, 10, 18, 0.55)',
    zIndex: 1000,
    elevation: 1000,
  },
  cartao: {
    minWidth: 240,
    maxWidth: 340,
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  selo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 214, 140, 0.14)',
  },
  texto: {
    ...type.body,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
    textAlign: 'center',
  },
})
