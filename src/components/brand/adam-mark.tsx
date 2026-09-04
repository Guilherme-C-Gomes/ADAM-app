import { Text, View } from 'react-native'

import { color, type } from '@/theme/tokens'

/**
 * PENDENTE: o simbolo da marca ainda nao veio do Figma.
 *
 * O desenho abaixo NAO e o simbolo do ADAM — e um marcador visivel de
 * propositao, para nao passar por fiel. Para fechar:
 *   1. No Figma, selecione o no `Marca_Simbolo` de qualquer tela
 *   2. Painel direito > Exportar > SVG > Exportar
 *   3. Me mande o arquivo (ou salve em assets/marca-simbolo.svg)
 *
 * Ai eu troco por `react-native-svg`, ja instalado, preservando a
 * geometria exata do no.
 */
export function AdamSymbol({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderColor: color.primary,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: color.primary, fontSize: size * 0.4 }}>?</Text>
    </View>
  )
}

/**
 * O wordmark do Figma e um lettering desenhado (cada letra e um vetor),
 * nao texto tipografado. Ate os vetores chegarem, renderizamos em Inter
 * Bold com espacamento aberto, que e a aproximacao mais proxima.
 */
export function AdamWordmark({ fontSize }: { fontSize: number }) {
  return (
    <Text
      style={{
        color: color.text,
        fontFamily: 'Inter_700Bold',
        fontSize,
        letterSpacing: fontSize * 0.06,
      }}>
      ADAM
    </Text>
  )
}

export const brandType = type
