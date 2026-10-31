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
 *
 * Minha conta volta para o inicio ("/"): sem isso, o comeco de "ajustes" era
 * a Configuracao da ADAM, que volta para Minha conta — e o ADM ficava indo e
 * voltando entre as duas. Se o destino for a propria tela, tambem vai ao inicio.
 */
/**
 * Depois de salvar uma ficha: abre a ficha da crianca salva. Se ela ja esta
 * aberta por baixo (veio de "Editar ficha"), volta ate ela; senao, a tela
 * atual vira a ficha — inclusive depois de a pagina recarregar (web), quando
 * nao sobra tela para voltar e o "voltar" ia parar no comeco do setor.
 */
export function abrirFichaSalva(id: string) {
  router.dismissTo({ pathname: '/secretaria/participantes/[id]', params: { id } })
}

export function voltar(destino?: Href) {
  if (router.canGoBack()) {
    router.back()
    return
  }
  const caminho =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : ''
  const setor = caminho.split('/').filter(Boolean)[0]
  const alvo = destino ?? ((setor ? `/${setor}` : '/') as Href)
  const mesmaTela = typeof alvo === 'string' && caminho !== '' && alvo === caminho
  router.replace(mesmaTela ? '/' : alvo)
}
