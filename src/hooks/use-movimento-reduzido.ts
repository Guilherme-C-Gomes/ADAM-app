import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Movimento reduzido nao e opcional: movimento grande provoca enjoo e
 * tontura de verdade em quem tem sensibilidade vestibular.
 *
 * A regra do design e trocar deslocamento por opacidade, nunca remover
 * o feedback — entao quem usa este hook desenha direto no valor final,
 * mas continua respondendo ao toque.
 */
export function useMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(false)

  useEffect(() => {
    let vivo = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (vivo) setReduzido(v)
    })

    const inscricao = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzido)
    return () => {
      vivo = false
      inscricao.remove()
    }
  }, [])

  return reduzido
}
