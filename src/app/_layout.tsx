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
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { Confirmacao } from '@/components/ui/confirmacao'
import { Recado } from '@/components/ui/recado'
import { color } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync()

// O fundo da janela, que aparece por tras das telas no gesto de voltar
// (deslizar da borda): sem isto ele e branco e "pisca" na lateral.
SystemUI.setBackgroundColorAsync(color.bg).catch(() => {})

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
    <>
      {titulo}
      <StatusBar style="light" />
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
    </>
  )
}
