import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui'
import { Aviso, Bloco, Botao, Entrada, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { usePerfil } from '@/data/perfis'
import { atualizarMeuPerfil } from '@/data/usuarios'
import { sair } from '@/lib/auth'
import { VERSAO } from '@/lib/versao'
import { color, space, type } from '@/theme/tokens'

/**
 * Minha conta, aberta pela foto no topo de qualquer tela. A pessoa troca a
 * propria foto, o nome, o e-mail de entrar e a senha, e sai. O ADM chega
 * daqui a Configuracao da ADAM — so ele ve essa linha.
 */
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function MinhaConta() {
  const { pessoa, administra } = usePerfil()
  const [nome, setNome] = useState(pessoa.nome)
  const [email, setEmail] = useState(pessoa.email)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mudou =
    nome.trim() !== pessoa.nome || email.trim().toLowerCase() !== pessoa.email.toLowerCase()
  const valido = nome.trim().length >= 2 && EMAIL_VALIDO.test(email.trim())

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      await atualizarMeuPerfil({ nome, email })
      mostrarRecado('Dados atualizados')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm titulo="Minha conta" subtitulo={pessoa.email} voltarPara="/">
      <Bloco>
        <Pressable
          onPress={() => router.push('/ajustes/foto')}
          style={({ pressed }) => [st.perfil, pressed && st.pressed]}
          accessibilityRole="button"
          accessibilityLabel={pessoa.foto ? 'Trocar minha foto' : 'Colocar minha foto'}>
          <Avatar iniciais={pessoa.iniciais} size={88} foto={pessoa.foto} />
          <Text style={st.linkFoto}>{pessoa.foto ? 'Trocar foto' : 'Colocar foto'}</Text>
        </Pressable>
      </Bloco>

      <Bloco ordem={1}>
        <Entrada
          rotulo="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          autoComplete="name"
          textContentType="name"
        />
        <Entrada
          rotulo="E-mail de entrar"
          value={email}
          onChangeText={setEmail}
          placeholder="seu.email@adam.ong.br"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          textContentType="username"
        />
        {mudou ? (
          <>
            {email.trim().toLowerCase() !== pessoa.email.toLowerCase() ? (
              <Text style={st.legenda}>
                Depois de salvar, você entra com o e-mail novo. A senha continua a mesma.
              </Text>
            ) : null}
            <Botao
              rotulo={salvando ? 'Salvando…' : 'Salvar nome e e-mail'}
              desabilitado={!valido || salvando}
              onPress={salvar}
            />
          </>
        ) : null}
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Segurança</Rotulo>
        <Grupo>
          <Linha
            titulo="Redefinir senha"
            legenda="Troque a senha por uma só sua"
            onPress={() => router.push('/ajustes/trocar-senha')}
          />
        </Grupo>
      </Bloco>

      {administra ? (
        <Bloco ordem={3}>
          <Rotulo>Coordenação</Rotulo>
          <Grupo>
            <Linha
              titulo="Configuração da ADAM"
              legenda="Unidades, turmas, usuários e permissões"
              onPress={() => router.push('/ajustes')}
            />
          </Grupo>
        </Bloco>
      ) : null}

      <Bloco ordem={4}>
        <Grupo>
          <Linha
            titulo="Sair da conta"
            legenda="Neste aparelho. Para entrar de novo, precisa da senha."
            perigo
            onPress={async () => {
              // Sai de verdade: apaga a sessao do Keychain, e o proximo a abrir
              // o app neste celular precisa da senha.
              await sair()
              router.replace('/login')
            }}
          />
        </Grupo>
        <View style={st.rodape}>
          <Text style={st.rodapeTexto}>ADAM · versão {VERSAO}</Text>
        </View>
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  pressed: { opacity: 0.85 },
  perfil: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  linkFoto: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  rodape: { alignItems: 'center', marginTop: space.base },
  rodapeTexto: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },
})
