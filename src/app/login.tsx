import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.markRow}>
            <AdamSymbol size={36} />
            <AdamWordmark fontSize={26} />
          </View>
          <Text style={styles.tagline}>Painel da coordenação</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="coordenacao@adam.org.br"
            placeholderTextColor={color.faint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              autoComplete="current-password"
              placeholder="••••••••••"
              placeholderTextColor={color.faint}
            />
            <Pressable
              onPress={() => setMostrarSenha((v) => !v)}
              hitSlop={space.md}
              accessibilityRole="button">
              <Text style={styles.inputAction}>
                {mostrarSenha ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button">
          <Text style={styles.buttonLabel}>Entrar</Text>
        </Pressable>

        <Pressable hitSlop={space.sm} accessibilityRole="button">
          <Text style={styles.link}>Esqueci minha senha</Text>
        </Pressable>

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>!</Text>
          <View style={styles.noticeText}>
            <Text style={styles.noticeTitle}>Acesso restrito</Text>
            <Text style={styles.noticeBody}>
              Somente coordenação autorizada
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>ADAM Admin v1 · ONG de utilidade pública</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { flex: 1, paddingHorizontal: space.lg, gap: space.lg },
  header: { marginTop: space.xxl, gap: space.sm },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tagline: { ...type.body, fontFamily: 'Inter_400Regular', color: color.muted },

  field: { gap: space.sm },
  label: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  input: {
    height: 52,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    gap: space.sm,
  },
  inputFlex: {
    flex: 1,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  // Roxo sobre fundo escuro: texto usa primaryLt, nao primary (criterio AA).
  inputAction: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: onDark.text,
  },

  button: {
    height: target.minimo + 8,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: {
    ...type.body,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
  },
  link: {
    ...type.body,
    fontFamily: 'Inter_400Regular',
    color: onDark.text,
    textAlign: 'center',
  },

  notice: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  noticeIcon: {
    ...type.body,
    fontFamily: 'Inter_700Bold',
    color: color.warn,
    width: 20,
    textAlign: 'center',
  },
  noticeText: { flex: 1, gap: space.xs },
  noticeTitle: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  noticeBody: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  footer: {
    ...type.caption,
    fontFamily: 'Inter_400Regular',
    color: color.faint,
    textAlign: 'center',
    paddingBottom: space.base,
  },
})
