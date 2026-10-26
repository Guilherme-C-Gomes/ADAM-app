import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Botao } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { cartaoEntra, cartaoSai, fundoEntra, fundoSai } from '@/components/ui/movimento'
import { criarRascunho } from '@/hooks/use-rascunho'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * "Tem certeza?" antes do que nao tem volta (excluir usuario, excluir
 * ficha). Mora no layout raiz, como o recado, e responde por promessa:
 *
 *   if (await pedirConfirmacao({ titulo: 'Excluir?', ... })) apagar()
 *
 * Nao usa o Alert do React Native: na versao web ele nao aparece.
 */
type Pedido = {
  titulo: string
  texto: string
  /** o rotulo do botao que confirma */
  confirmar: string
  perigo?: boolean
}

const pedido = criarRascunho({
  atual: null as (Pedido & { responder: (sim: boolean) => void }) | null,
})

export function pedirConfirmacao(p: Pedido) {
  return new Promise<boolean>((resolver) => {
    // um pedido anterior sem resposta conta como "nao"
    pedido.ler().atual?.responder(false)
    pedido.definir({
      atual: {
        ...p,
        responder: (sim) => {
          pedido.definir({ atual: null })
          resolver(sim)
        },
      },
    })
  })
}

export function Confirmacao() {
  const { atual } = pedido.useValor()
  if (!atual) return null

  return (
    <Animated.View
      entering={fundoEntra}
      exiting={fundoSai}
      style={st.fundo}
      accessibilityViewIsModal>
      {/* tocar fora cancela */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => atual.responder(false)}
        accessibilityLabel="Cancelar"
      />
      <Animated.View
        entering={cartaoEntra}
        exiting={cartaoSai}
        style={st.cartao}
        accessibilityRole="alert">
        <View style={[st.selo, atual.perigo && st.seloPerigo]}>
          <Icone nome="alerta" cor={atual.perigo ? color.danger : color.warn} tamanho={22} />
        </View>
        <Text style={st.titulo}>{atual.titulo}</Text>
        <Text style={st.texto}>{atual.texto}</Text>
        <View style={st.botoes}>
          <Botao
            rotulo={atual.confirmar}
            variante={atual.perigo ? 'perigo' : 'primario'}
            onPress={() => atual.responder(true)}
          />
          <Botao rotulo="Cancelar" variante="secundario" onPress={() => atual.responder(false)} />
        </View>
      </Animated.View>
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
    backgroundColor: 'rgba(10, 10, 18, 0.7)',
    zIndex: 1001,
    elevation: 1001,
  },
  cartao: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
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
    backgroundColor: 'rgba(245, 165, 36, 0.14)',
  },
  seloPerigo: { backgroundColor: 'rgba(255, 122, 181, 0.14)' },
  titulo: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.text, textAlign: 'center' },
  texto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, textAlign: 'center' },
  botoes: { alignSelf: 'stretch', gap: space.sm, marginTop: space.sm },
})
