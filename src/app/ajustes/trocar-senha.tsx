import {
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
  type AuthError,
} from '@supabase/supabase-js'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Entrada, Rotulo, TelaForm } from '@/components/ui/form'
import { supabase } from '@/lib/supabase'
import { color, space, type } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Trocar a propria senha. E por aqui que a pessoa troca a senha inicial que
 * a coordenacao definiu em "Novo usuario".
 *
 * Os campos avisam o iOS que e uma senha NOVA da propria pessoa: o teclado
 * oferece uma senha forte e, ao salvar, pergunta se guarda nas Senhas do
 * iCloud.
 */
const MINIMO = 8

/** Cada recusa do Supabase com a sua explicacao; "conexao" so quando foi a rede. */
function motivo(error: AuthError) {
  if (isAuthWeakPasswordError(error) || error.code === 'weak_password') {
    const reasons = isAuthWeakPasswordError(error) ? error.reasons : []
    return reasons.includes('pwned')
      ? 'Essa senha aparece em vazamentos conhecidos. Escolha outra.'
      : `A senha é fraca: use pelo menos ${MINIMO} caracteres, misturando letras e números.`
  }
  if (error.code === 'same_password') return 'A nova senha precisa ser diferente da atual.'
  if (error.code === 'reauthentication_needed')
    return 'Por segurança, saia e entre de novo no app antes de trocar a senha.'
  if (isAuthRetryableFetchError(error) || error.status === 0)
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
  return 'Não foi possível trocar a senha. Tente de novo em instantes.'
}

export default function TrocarSenha() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const curta = senha.length > 0 && senha.length < MINIMO
  const diferente = confirmacao.length > 0 && confirmacao !== senha
  const valida = senha.length >= MINIMO && confirmacao === senha

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)
    if (error) {
      setErro(motivo(error))
      return
    }
    setPronto(true)
  }

  if (pronto) {
    return (
      <TelaForm
        titulo="Trocar senha"
        subtitulo="Pronto"
        voltarPara="/ajustes/conta"
        rodape={<Botao rotulo="Voltar para a conta" onPress={() => voltar('/ajustes/conta')} />}>
        <Aviso titulo="Senha trocada" texto="Da próxima vez que entrar, use a senha nova." />
      </TelaForm>
    )
  }

  return (
    <TelaForm
      titulo="Trocar senha"
      subtitulo="A nova vale a partir de agora"
      voltarPara="/ajustes/conta"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Salvar senha nova'}
          desabilitado={!valida || salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <View style={st.rotulo}>
          <Rotulo>Senha nova</Rotulo>
          <Pressable
            onPress={() => setMostrar((v) => !v)}
            hitSlop={space.md}
            accessibilityRole="button">
            <Text style={st.mostrar}>{mostrar ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        </View>
        <Entrada
          value={senha}
          onChangeText={setSenha}
          placeholder={`Pelo menos ${MINIMO} caracteres`}
          secureTextEntry={!mostrar}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {curta ? <Text style={st.aviso}>Faltam {MINIMO - senha.length} caracteres.</Text> : null}
      </Bloco>

      <Bloco ordem={1}>
        <Entrada
          rotulo="Repita a senha nova"
          value={confirmacao}
          onChangeText={setConfirmacao}
          secureTextEntry={!mostrar}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {diferente ? <Text style={st.aviso}>As duas senhas não estão iguais.</Text> : null}
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  rotulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mostrar: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  aviso: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.warn },
})
