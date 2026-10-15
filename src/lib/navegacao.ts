import { router, type Href } from 'expo-router'
import { Platform } from 'react-native'

/**
 * Voltar uma tela. No celular sempre ha para onde voltar; na versao web
 * nem sempre: quem abre ou recarrega o navegador direto numa tela (o Safari
 * recarrega sozinho ao voltar para a aba) fica sem historico, e o
 * `router.back()` puro nao faz nada — o botao parecia quebrado.
 *
 * Sem historico, vai para `destino` ou, sem destino, para o comeco do setor
 * da tela atual ("/ajustes/novo-usuario" -> "/ajustes"). Todo "voltar" do
 * app passa por aqui, nunca pelo `router.back()` direto.
 */
export function voltar(destino?: Href) {
  if (router.canGoBack()) {
    router.back()
    return
  }
  const caminho =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : ''
  const setor = caminho.split('/').filter(Boolean)[0]
  router.replace(destino ?? ((setor ? `/${setor}` : '/') as Href))
}
