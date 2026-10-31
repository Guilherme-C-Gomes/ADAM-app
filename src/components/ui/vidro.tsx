import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { StyleSheet, type ColorValue } from 'react-native'

/** O aparelho tem o Liquid Glass (iOS 26)? Na web e em iOS antigo, nao. */
export const TEM_VIDRO = isLiquidGlassAvailable()

/**
 * Fundo de vidro (Liquid Glass) das barras e botoes do app. Fica atras do
 * conteudo, ocupando o pai inteiro, e nao recebe toque (quem recebe e o
 * botao). Sem Liquid Glass nao desenha nada: o pai mostra o fundo de sempre
 * — por isso quem usa troca o proprio fundo por transparente so com
 * TEM_VIDRO.
 */
export function Vidro({ tom, raio }: { tom?: ColorValue; raio: number }) {
  if (!TEM_VIDRO) return null
  return (
    <GlassView
      pointerEvents="none"
      style={[st.vidro, { borderRadius: raio }]}
      glassEffectStyle="regular"
      colorScheme="dark"
      tintColor={tom}
    />
  )
}

/** Tons do vidro: o roxo da marca e as variantes dos botoes. */
export const TONS_DO_VIDRO = {
  roxo: '#9E06D1',
  roxoClaro: 'rgba(158, 6, 209, 0.35)',
  perigo: 'rgba(255, 122, 181, 0.35)',
} as const

/** Para o pai: sem fundo nem borda proprios, o vidro faz as vezes. */
export const semFundo = { backgroundColor: 'transparent', borderColor: 'transparent' } as const

const st = StyleSheet.create({
  vidro: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
})
