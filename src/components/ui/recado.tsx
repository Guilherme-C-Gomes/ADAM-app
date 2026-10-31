import { useEffect } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import Animated from 'react-native-reanimated'

import { Icone } from '@/components/ui/icone'
import { cartaoEntra, cartaoSai, fundoEntra, fundoSai, seloEntra } from '@/components/ui/movimento'
import { criarRascunho } from '@/hooks/use-rascunho'
import { color, escuro, radius, space, type } from '@/theme/tokens'

/**
 * Pop-up de confirmacao ("Usuario adicionado com sucesso"). Mora no layout
 * raiz, por cima de tudo, para a tela que salvou poder voltar na hora e o
 * recado continuar visivel na tela de destino.
 *
 * Nao usa o Alert do React Native: na versao web ele nao aparece.
 */
type Tom = 'sucesso' | 'aviso'

const recado = criarRascunho({ texto: null as string | null, tom: 'sucesso' as Tom, vez: 0 })

// O recado entra (o selo assenta em ~520ms, ver `seloEntra`) e fica parado:
// o de sucesso so 400ms, e um "deu certo" que se ve de relance; o aviso
// (erro, "sobe quando a internet voltar", senha nova) tem frase para ler.
const ENTRADA = 520
const PARADO: Record<Tom, number> = { sucesso: 400, aviso: 4000 }

/**
 * Mostra o pop-up. Chamar de novo troca o texto e reinicia o tempo.
 * `aviso` e para o que a pessoa precisa ler: fica mais e vem com o alerta.
 */
export function mostrarRecado(texto: string, tom: Tom = 'sucesso') {
  recado.definir({ texto, tom, vez: recado.ler().vez + 1 })
}

const fechar = () => recado.definir({ texto: null })

export function Recado() {
  const { texto, tom, vez } = recado.useValor()
  const aviso = tom === 'aviso'

  // fecha sozinho; um recado novo (outra `vez`) reinicia a contagem
  useEffect(() => {
    if (!texto) return
    const tempo = setTimeout(fechar, ENTRADA + PARADO[tom])
    return () => clearTimeout(tempo)
  }, [texto, tom, vez])

  if (!texto) return null

  return (
    <Animated.View
      key={vez}
      entering={fundoEntra}
      exiting={fundoSai}
      style={st.fundo}
      pointerEvents="box-none">
      <Pressable
        onPress={fechar}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={texto}
        accessibilityHint="Toque para fechar">
        <Animated.View entering={cartaoEntra} exiting={cartaoSai} style={st.cartao}>
          {/* o check estoura logo depois do cartao assentar */}
          <Animated.View entering={seloEntra} style={[st.selo, aviso && st.seloAviso]}>
            <Icone
              nome={aviso ? 'alerta' : 'check'}
              cor={aviso ? color.warn : color.success}
              tamanho={22}
              traco={2.4}
            />
          </Animated.View>
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
    backgroundColor: escuro ? 'rgba(10, 10, 18, 0.55)' : 'rgba(22, 19, 29, 0.3)',
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
  seloAviso: { backgroundColor: 'rgba(245, 165, 36, 0.14)' },
  texto: {
    ...type.body,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
    textAlign: 'center',
  },
})
