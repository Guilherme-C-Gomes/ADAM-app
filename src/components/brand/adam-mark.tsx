import { Image } from 'expo-image'
import { Text } from 'react-native'

import { color } from '@/theme/tokens'

/**
 * Simbolo da marca, direto do kit oficial (Marca > Institucional >
 * PNG fundo transparente > "simbolo regular roxo").
 *
 * A arte e monocromatica em #9E05D1, praticamente o token `primary`
 * (#9E05D2) — a diferenca de um bit por canal nao e perceptivel.
 *
 * Cuidado ao trocar de arquivo: no kit, "simbolo tridimencional roxo-43"
 * esta nomeado como roxo mas a arte e preta, e sumiria no fundo escuro.
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
