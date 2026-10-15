import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Entrada, Grupo, Opcao, Rotulo, TelaForm } from '@/components/ui/form'
import type { Funcao, Permissao } from '@/data/perfis'
import { criarUsuario, FUNCOES, PERMISSOES } from '@/data/usuarios'
import { color, space, type } from '@/theme/tokens'
import { mostrarRecado } from '@/components/ui/recado'
import { voltar } from '@/lib/navegacao'

/**
 * Tela 14b. A coordenacao cria o acesso com uma senha inicial e passa para a
 * pessoa, que troca depois em Minha conta. A conta nasce confirmada e ja
 * liberada — quem decide quem entra e a coordenacao, nao um e-mail de
 * convite.
 *
 * A criacao roda na Edge Function `criar-usuario` (supabase/functions): e
 * ela que tem a chave secreta, e ela confere de novo se quem pede e ADM.
 */
const MINIMO_SENHA = 8

export default function NovoUsuario() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [funcao, setFuncao] = useState<Funcao | null>('treinador')
  const [permissao, setPermissao] = useState<Permissao>('ver_registrar')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const senhaCurta = senha.length > 0 && senha.length < MINIMO_SENHA
  const pronto =
    nome.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    senha.length >= MINIMO_SENHA &&
    (funcao !== null || permissao === 'acesso_total')

  const criar = async () => {
    setErro(null)
    setCriando(true)
    try {
      await criarUsuario({ nome: nome.trim(), email: email.trim(), senha, funcao, permissao })
      mostrarRecado('Usuário adicionado com sucesso')
      // de volta a lista, que recarrega ao ganhar foco e ja mostra a pessoa
      voltar('/ajustes/usuarios')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o usuário.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <TelaForm
      titulo="Novo usuário"
      voltarPara="/ajustes/usuarios"
      subtitulo="Você define a senha inicial e passa para a pessoa"
      rodape={
        <Botao
          rotulo={criando ? 'Criando…' : 'Criar acesso'}
          desabilitado={!pronto || criando}
          onPress={criar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Entrada
          rotulo="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Nome da pessoa"
          autoComplete="off"
          textContentType="none"
        />
      </Bloco>

      <Bloco ordem={1}>
        <Entrada
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="nome@adam.ong.br"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          // e o e-mail de OUTRA pessoa: o iPhone nao deve sugerir o seu
          autoComplete="off"
          textContentType="none"
        />
      </Bloco>

      <Bloco ordem={2}>
        <View style={st.rotuloSenha}>
          <Rotulo>Senha inicial</Rotulo>
          <Pressable
            onPress={() => setMostrarSenha((v) => !v)}
            hitSlop={space.md}
            accessibilityRole="button">
            <Text style={st.mostrar}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        </View>
        <Entrada
          value={senha}
          onChangeText={setSenha}
          placeholder={`Pelo menos ${MINIMO_SENHA} caracteres`}
          secureTextEntry={!mostrarSenha}
          autoCapitalize="none"
          autoCorrect={false}
          // senha de OUTRA pessoa: nada de oferecer para salvar no seu iPhone
          autoComplete="off"
          textContentType="oneTimeCode"
        />
        <Text style={[st.dica, senhaCurta && st.dicaAviso]}>
          {senhaCurta
            ? `Faltam ${MINIMO_SENHA - senha.length} caracteres.`
            : 'Passe a senha para a pessoa por um canal seguro. Ela troca no primeiro acesso.'}
        </Text>
      </Bloco>

      <Bloco ordem={3}>
        <Rotulo>Função</Rotulo>
        <View style={st.chips}>
          {FUNCOES.map((f) => (
            <Chip
              key={f.valor}
              rotulo={f.rotulo}
              ativo={funcao === f.valor}
              onPress={() => setFuncao(f.valor)}
            />
          ))}
          <Chip
            rotulo="Só administra"
            ativo={funcao === null}
            onPress={() => {
              setFuncao(null)
              setPermissao('acesso_total')
            }}
          />
        </View>
      </Bloco>

      <Bloco ordem={4}>
        <Rotulo>Permissão</Rotulo>
        <Grupo>
          {PERMISSOES.map((p) => (
            <Opcao
              key={p.valor}
              titulo={p.rotulo}
              legenda={p.detalhe}
              ativa={permissao === p.valor}
              onPress={() => {
                setPermissao(p.valor)
                if (p.valor !== 'acesso_total' && funcao === null) setFuncao('treinador')
              }}
            />
          ))}
        </Grupo>
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  rotuloSenha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mostrar: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  dica: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },
  dicaAviso: { color: color.warn },
})
