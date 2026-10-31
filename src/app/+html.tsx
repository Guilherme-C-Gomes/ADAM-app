import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

/**
 * O HTML de toda pagina da versao web (so roda no build, no Node — nada de
 * window aqui).
 *
 * E o que faz o site virar "app" no celular enquanto as lojas nao liberam:
 * no Safari, Compartilhar > Adicionar a Tela de Inicio instala com o icone
 * do ADAM, abre em tela cheia e sem a barra do navegador. No Android, o
 * Chrome oferece "Instalar app" pelo manifest.
 */
const CSS_CAMPOS = [
  // puxar a lista para baixo (ou passar do fim): o Safari do iPhone fazia o
  // "elastico" e os blocos animados ficavam fora do lugar, uns por cima dos
  // outros. Sem elastico na pagina nem nas listas.
  'html,body{overscroll-behavior:none;}',
  'div{overscroll-behavior-y:none;}',
  'input,textarea,select{outline:none!important;-webkit-tap-highlight-color:transparent;}',
  'input:focus,textarea:focus,input:focus-visible,textarea:focus-visible{outline:none!important;box-shadow:none!important;}',
].join('')

const TEMA_ANTES_DE_DESENHAR = `try {
  if (localStorage.getItem('adam-tema') === 'claro') {
    document.documentElement.style.backgroundColor = '#F6F5FA'
    document.documentElement.style.colorScheme = 'light'
    var meta = document.querySelector('meta[name=theme-color]')
    if (meta) meta.setAttribute('content', '#F6F5FA')
    var esquema = document.querySelector('meta[name=color-scheme]')
    if (esquema) esquema.setAttribute('content', 'light')
    document.write('<style>html,body{background-color:#F6F5FA !important;}</style>')
  }
} catch (e) {}`

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover: o app desenha atras do notch e cuida da area
            segura sozinho, como no app nativo */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0A0A12" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="Painel da ADAM: chamada, jogo, secretaria e estudo." />

        {/* app instalado no iPhone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ADAM" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icones/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />

        <ScrollViewStyleReset />
        {/* sem isto, abrir o app mostra um clarao branco antes do fundo escuro */}
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background-color:#0A0A12;}' }} />
        {/* modo claro (escolha guardada no aparelho, theme/tema-guardado.ts):
            troca o fundo, a cor da barra do navegador e o esquema antes de
            desenhar, para nao piscar escuro ao abrir */}
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DE_DESENHAR }} />
        {/* campo de texto: o navegador (o Safari do iPhone mais que todos)
            desenha uma caixa azul retangular por dentro da moldura arredondada.
            Ela sai daqui, em todo estado de foco; quem mostra o foco e a
            propria moldura, que acende em roxo (hooks/use-foco.ts) */}
        <style dangerouslySetInnerHTML={{ __html: CSS_CAMPOS }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
