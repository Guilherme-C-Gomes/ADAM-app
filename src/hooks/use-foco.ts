import { useState } from 'react'
import { Platform, type TextInputProps } from 'react-native'

import { color } from '@/theme/tokens'

/**
 * Campo em foco acende a propria moldura em roxo — em vez da caixa
 * retangular que o navegador desenha por dentro dela (essa sai no CSS do
 * +html.tsx). Todo campo do app usa isto, para o foco ser igual em todos.
 *
 * O campo ja nasce com borda de 1px (transparente quando nao tem moldura
 * propria), entao acender so troca a cor: nada se mexe na tela.
 */
export const COR_FOCO = color.primaryLt

export function useFoco({ onFocus, onBlur }: Pick<TextInputProps, 'onFocus' | 'onBlur'> = {}) {
  const [focado, setFocado] = useState(false)
  return {
    focado,
    /** espalhar no TextInput DEPOIS das props, para valer este par */
    eventos: {
      onFocus: ((e) => {
        setFocado(true)
        // web no celular: o teclado sobe por cima do campo; depois de ele
        // abrir, o campo rola para o meio da tela (no app, o ScrollView do
        // formulario ja ajusta sozinho)
        if (Platform.OS === 'web') {
          const alvo = (e as unknown as { target?: { scrollIntoView?: (o: object) => void } })
            .target
          setTimeout(() => alvo?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 350)
        }
        onFocus?.(e)
      }) satisfies TextInputProps['onFocus'],
      onBlur: ((e) => {
        setFocado(false)
        onBlur?.(e)
      }) satisfies TextInputProps['onBlur'],
    },
  }
}
