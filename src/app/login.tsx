import { router } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { entrar as entrarNaConta, ErroDeAcesso, retomarSessao } from '@/lib/auth'
import { VERSAO } from '@/lib/versao'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'
import { COR_FOCO, useFoco } from '@/hooks/use-foco'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const focoEmail = useFoco()
  const focoSenha = useFoco()
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Ligado por padrao: o celular e da pessoa, e pedir senha a cada chamada
  // (duas por dia) faz desistir do app. Desliga no aparelho compartilhado.
  const [lembrar, setLembrar] = useState(true)

  const podeEntrar = !entrando && email.trim().length > 0

  /**
   * Entra pela conta do Supabase (lib/auth.ts). Os campos avisam o iOS o
   * que sao (`textContentType`), e e isso que liga as Senhas do iCloud:
   * o teclado oferece a senha salva, preenche com Face ID e, no primeiro
   * login, pergunta se quer salvar.
   */
  // A espera abaixo termina depois que a tela pode ter saido; sem esta
  // guarda, o replace dispararia uma navegacao fantasma.
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  /**
   * Ja tem sessao lembrada neste aparelho? Entra direto. Sem isto, quem
   * chegava pelo login (o atalho da Tela de Inicio salvo nesta tela, ou o
   * navegador reaberto aqui) digitava a senha de novo mesmo com o "Lembrar
   * este aparelho" ligado — so a abertura em "/" procurava a sessao.
   */
  const [conferindo, setConferindo] = useState(true)
  useEffect(() => {
    let ativo = true
    retomarSessao().then((lembrado) => {
      if (!ativo) return
      if (lembrado) router.replace('/chamada')
      else setConferindo(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  const entrar = useCallback(async () => {
    setErro(null)
    setEntrando(true)
    try {
      await entrarNaConta(email, senha, lembrar)
      if (!montado.current) return
      router.replace('/chamada')
    } catch (e) {
      if (!montado.current) return
      setErro(e instanceof ErroDeAcesso ? e.message : 'Não foi possível entrar. Tente de novo.')
    } finally {
      if (montado.current) setEntrando(false)
    }
  }, [email, senha, lembrar])

  if (conferindo) {
    return (
      <SafeAreaView style={[styles.screen, styles.conferindo]} edges={['top', 'bottom']}>
        <AdamSymbol size={36} />
        <ActivityIndicator color={color.primaryCh} />
      </SafeAreaView>
    )
  }

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
            style={[styles.input, focoEmail.focado && styles.focado]}
            {...focoEmail.eventos}
            value={email}
            onChangeText={setEmail}
            placeholder="seu.email@adam.ong.br"
            placeholderTextColor={color.faint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            keyboardType="email-address"
            inputMode="email"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <View style={[styles.inputRow, focoSenha.focado && styles.focado]}>
            <TextInput
              {...focoSenha.eventos}
              style={styles.inputFlex}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              autoComplete="current-password"
              textContentType="password"
              placeholder="••••••••••"
              placeholderTextColor={color.faint}
              returnKeyType="go"
              onSubmitEditing={entrar}
            />
            <Pressable
              onPress={() => setMostrarSenha((v) => !v)}
              hitSlop={space.md}
              accessibilityRole="button">
              <Text style={styles.inputAction}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={entrar}
          disabled={!podeEntrar}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            !podeEntrar && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !podeEntrar, busy: entrando }}>
          {entrando ? (
            <ActivityIndicator color={color.text} />
          ) : (
            <Text style={styles.buttonLabel}>Entrar</Text>
          )}
        </Pressable>

        <View style={styles.lembrar}>
          <View style={styles.lembrarTexto}>
            <Text style={styles.lembrarTitulo}>Lembrar este aparelho</Text>
            <Text style={styles.lembrarLegenda}>Não pede a senha de novo neste celular</Text>
          </View>
          <Switch
            value={lembrar}
            onValueChange={setLembrar}
            trackColor={{ true: color.primary, false: color.surface2 }}
            accessibilityLabel="Lembrar este aparelho"
          />
        </View>

        {erro !== null ? <Text style={styles.erro}>{erro}</Text> : null}

        {/*
          A tela de recuperar senha ainda nao foi desenhada (secao 13 do
          documento de estrutura). Ate ela existir, o link diz o que
          fazer em vez de nao levar a lugar nenhum.
        */}
        <Pressable
          onPress={() => setErro('Peça para a coordenação do ADAM redefinir a sua senha.')}
          hitSlop={space.sm}
          accessibilityRole="button">
          <Text style={styles.link}>Esqueci minha senha</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>ADAM {VERSAO} · ONG de utilidade pública</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conferindo: { alignItems: 'center', justifyContent: 'center', gap: space.lg },
  lembrar: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lembrarTexto: { flex: 1, gap: 2 },
  lembrarTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  lembrarLegenda: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
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
    borderWidth: 1,
    borderColor: 'transparent',
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  focado: { borderColor: COR_FOCO },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
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
  buttonDisabled: { opacity: 0.4 },
  erro: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.danger,
    textAlign: 'center',
  },
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
