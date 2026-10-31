import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Botao } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { cartaoEntra, cartaoSai, fundoEntra, fundoSai } from '@/components/ui/movimento'
import { criarRascunho } from '@/hooks/use-rascunho'
import { color, escuro, radius, space, type } from '@/theme/tokens'

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
  /** o rotulo do outro botao; sem ele, "Cancelar" */
  cancelar?: string
  perigo?: boolean
  /**
   * Para o que nao tem volta de jeito nenhum (excluir a ficha da crianca):
   * so confirma depois de a pessoa digitar exatamente esta palavra.
   */
  digitar?: string
}

const pedido = criarRascunho({
  atual: null as (Pedido & { responder: (sim: boolean) => void }) | null,
  /** muda a cada pedido: o campo de digitar comeca vazio de novo */
  vez: 0,
})

export function pedirConfirmacao(p: Pedido) {
  return new Promise<boolean>((resolver) => {
    // um pedido anterior sem resposta conta como "nao"
    pedido.ler().atual?.responder(false)
    pedido.definir({
      vez: pedido.ler().vez + 1,
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

/** Ja tem um "tem certeza?" na tela (um aviso automatico nao passa por cima). */
export const haConfirmacaoAberta = () => pedido.ler().atual !== null

export function Confirmacao() {
  const { atual, vez } = pedido.useValor()
  if (!atual) return null
  return <Cartao key={vez} atual={atual} />
}

function Cartao({ atual }: { atual: Pedido & { responder: (sim: boolean) => void } }) {
  const [digitado, setDigitado] = useState('')
  // com palavra exigida: so libera quando bate exatamente (maiusculas)
  const liberado = !atual.digitar || digitado === atual.digitar

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
        {atual.digitar ? (
          <View style={st.digitar}>
            <Text style={st.texto}>
              Para confirmar, escreva <Text style={st.palavra}>{atual.digitar}</Text> em letras
              maiúsculas:
            </Text>
            <TextInput
              value={digitado}
              onChangeText={setDigitado}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={atual.digitar}
              placeholderTextColor={color.faint}
              style={st.campo}
              accessibilityLabel={`Escreva ${atual.digitar} para confirmar`}
            />
          </View>
        ) : null}
        <View style={st.botoes}>
          <Botao
            rotulo={atual.confirmar}
            variante={atual.perigo ? 'perigo' : 'primario'}
            desabilitado={!liberado}
            onPress={() => atual.responder(true)}
          />
          <Botao
            rotulo={atual.cancelar ?? 'Cancelar'}
            variante="secundario"
            onPress={() => atual.responder(false)}
          />
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const st = StyleSheet.create({
  digitar: { alignSelf: 'stretch', gap: space.sm },
  palavra: { fontFamily: 'Inter_700Bold', color: color.danger },
  campo: {
    ...type.body,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
    textAlign: 'center',
    letterSpacing: 2,
    paddingVertical: space.md,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface2,
  },
  fundo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: escuro ? 'rgba(10, 10, 18, 0.7)' : 'rgba(22, 19, 29, 0.38)',
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
