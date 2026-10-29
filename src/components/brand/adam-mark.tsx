import { Image } from 'expo-image'
import { Text } from 'react-native'

import { color } from '@/theme/tokens'

/**
 * Simbolo da marca: a mao em 3D, miolo branco, contorno e volume no roxo
 * da marca e borda branca de adesivo (fundo transparente). Veio do arquivo
 * "Design sem nome.pdf" da coordenacao, em 29/10/2026; o roxo e o #9E06D1
 * do token `primary`.
 */

const SYMBOL = require('../../../assets/brand/adam-symbol.png')

/** Proporcao original do asset: 625x625. */
export function AdamSymbol({ size }: { size: number }) {
  return (
    <Image
      source={SYMBOL}
      style={{ width: size, height: size }}
      contentFit="contain"
      // Marca e decorativa: o nome do app ja vem no wordmark ao lado.
      accessible={false}
    />
  )
}

/**
 * PENDENTE: o wordmark do Figma e lettering vetorial desenhado, e o kit
 * so o traz fundido ao simbolo (em "marca regular"), sem versao isolada
 * e sem versao branca. Ate ela chegar, Inter Bold com espacamento aberto
 * e a aproximacao mais proxima.
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
