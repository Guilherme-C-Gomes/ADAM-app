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
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'

import { Confirmacao } from '@/components/ui/confirmacao'
import { Recado } from '@/components/ui/recado'
import { color, escuro } from '@/theme/tokens'

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
    <Palco>
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

/** A partir desta largura (PC, tablet deitado) o app vira uma coluna central. */
const LARGURA_DE_PC = 820
const COLUNA = 720

/**
 * Na web aberta no PC, o app (desenhado para celular) nao estica os cards
 * de ponta a ponta: fica numa coluna central, com o fundo do app dos lados
 * e uma borda fina marcando a coluna. Pop-ups e a barra de menu ficam
 * dentro dela. No celular e no app nativo, nada muda.
 */
function Palco({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions()
  if (Platform.OS !== 'web' || width < LARGURA_DE_PC) return <>{children}</>
  return (
    <View style={st.palco}>
      <View style={st.coluna}>{children}</View>
    </View>
  )
}

const st = StyleSheet.create({
  palco: { flex: 1, alignItems: 'center', backgroundColor: color.bg },
  coluna: {
    flex: 1,
    width: '100%',
    maxWidth: COLUNA,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.divider,
    overflow: 'hidden',
  },
})
