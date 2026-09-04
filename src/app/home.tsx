import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { supabase } from '@/lib/supabase'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Destino do login. Ainda um esqueleto: a Home real (tela 04 do Figma)
 * traz o resumo da coordenacao e a lista de participantes em FlashList.
 * Por ora confirma que a sessao abriu e permite sair.
 */
export default function Home() {
  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.markRow}>
          <AdamSymbol size={32} />
          <AdamWordmark fontSize={22} />
        </View>

        <Text style={styles.titulo}>Sessão aberta</Text>
        <Text style={styles.corpo}>
          A Home da coordenação entra aqui — resumo do período e lista de
          participantes.
        </Text>

        <Pressable
          onPress={sair}
          style={({ pressed }) => [styles.botao, pressed && { opacity: 0.85 }]}
          accessibilityRole="button">
          <Text style={styles.botaoRotulo}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.xxl, gap: space.base },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  corpo: { ...type.body, fontFamily: 'Inter_400Regular', color: color.muted },
  botao: {
    marginTop: space.base,
    height: target.minimo,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: onDark.text },
})
