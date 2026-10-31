import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'
import { Stack } from 'expo-router'
import Head from 'expo-router/head'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { StatusBar } from 'expo-status-bar'
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated'
import { useEffect } from 'react'
import { Appearance, Platform, StyleSheet, View } from 'react-native'

import { Confirmacao } from '@/components/ui/confirmacao'
import { Recado } from '@/components/ui/recado'
import { color, escuro } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync()

// O fundo da janela, que aparece por tras das telas no gesto de voltar
// (deslizar da borda): sem isto ele e branco e "pisca" na lateral.
SystemUI.setBackgroundColorAsync(color.bg).catch(() => {})

// O app.json prende o iOS no escuro (userInterfaceStyle). No modo claro,
// teclado, seletores de data e interruptores do sistema seguem o claro.
// (So no app: na web o Appearance nao tem setColorScheme, e la quem cuida
// e o fundo da pagina, abaixo e no +html.tsx.)
if (Platform.OS !== 'web') {
  Appearance.setColorScheme(escuro ? 'dark' : 'light')
} else if (typeof document !== 'undefined') {
  document.body.style.backgroundColor = color.bg
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  // Titulo da aba do navegador e do app instalado pela versao web. Vem
  // antes da espera da fonte: no build da web a fonte nunca carrega, e o
  // titulo sairia vazio. So na web: no app instalado (TestFlight/App Store)
  // o Head liga o Handoff do iOS, que exige um `origin` na config e, sem
  // ele, mostrava um alerta "Expo Head" a cada tela.
  const titulo =
    Platform.OS === 'web' ? (
      <Head>
        <title>ADAM</title>
      </Head>
    ) : null

  // Segurar a splash nativa ate a fonte carregar evita o flash de
  // texto com a fonte do sistema antes da Inter entrar. No web nao ha
  // splash nativa: esperar a fonte so deixava a pagina em branco com
  // internet lenta (ou em aba de fundo). La o app desenha ja e a Inter
  // entra quando chegar.
  if (!fontsLoaded && Platform.OS !== 'web') return titulo

  return (
    <Palco>
      {/* na web, as animacoes de entrada e saida desligam: o Reanimated na
          web deixava blocos empilhados uns por cima dos outros (no PC e no
          Safari do iPhone). No app nativo elas seguem. */}
      {Platform.OS === 'web' ? <ReducedMotionConfig mode={ReduceMotion.Always} /> : null}
      {titulo}
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
          // Native stack: transicoes rodam na thread de UI nativa.
          animation: 'fade',
        }}
      />
      {/* pop-ups por cima de qualquer tela: o recado e o "tem certeza?" */}
      <Recado />
      <Confirmacao />
    </Palco>
  )
}

/**
 * Na web aberta no PC, o app (desenhado para celular) nao estica os cards
 * de ponta a ponta: fica numa coluna central, com o fundo do app dos lados
 * e uma borda fina marcando a coluna. Pop-ups e a barra de menu ficam
 * dentro dela. No celular e no app nativo, nada muda.
 */
function Palco({ children }: { children: React.ReactNode }) {
  // Sempre a mesma arvore (trocar de arvore pela largura remontava o app e
  // dava erro de montagem na web). Quem decide a coluna e o CSS do +html.tsx,
  // pelo atributo data-palco, a partir de 820px de largura.
  return (
    <View style={st.palco} {...({ dataSet: { palco: 'coluna' } } as object)}>
      {children}
    </View>
  )
}

const st = StyleSheet.create({
  palco: { flex: 1, width: '100%', backgroundColor: color.bg },
})
