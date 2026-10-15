import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Grupo, Linha, Opcao, Rotulo, TelaForm } from '@/components/ui/form'
import { sessao, type Funcao, type Permissao } from '@/data/perfis'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { mostrarRecado } from '@/components/ui/recado'
import {
  atualizarUsuario,
  excluirUsuario,
  FUNCOES,
  PERMISSOES,
  useUsuarios,
  type Usuario,
} from '@/data/usuarios'
import { color, space } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Tela 14c. Mudar a funcao aqui muda quem aparece na escala e na comissao
 * (R6), e a permissao muda o que a pessoa enxerga. Grava no banco; a
 * politica do banco so aceita a mudanca vinda da coordenacao.
 */
export default function UsuarioDoAcesso() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { lista, carregando } = useUsuarios()
  const usuario = lista.find((u) => u.id === id)

  if (carregando) {
    return (
      <TelaForm titulo="Usuário" subtitulo="Carregando…">
        <ActivityIndicator color={color.primaryCh} />
      </TelaForm>
    )
  }
  if (!usuario) {
    return (
      <TelaForm titulo="Usuário não encontrado" subtitulo="Volte para a lista">
        {null}
      </TelaForm>
    )
  }
  // A ficha nasce depois que a lista chegou, para os estados partirem do banco.
  return <FichaDoUsuario usuario={usuario} />
}

function FichaDoUsuario({ usuario }: { usuario: Usuario }) {
  const { usuarioId } = sessao.useValor()
  const souEu = usuario.id === usuarioId
  const [funcao, setFuncao] = useState<Funcao | null>(usuario.funcao)
  const [permissao, setPermissao] = useState<Permissao>(usuario.permissao)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const gravar = async (dados: Parameters<typeof atualizarUsuario>[1]) => {
    setErro(null)
    setSalvando(true)
    try {
      await atualizarUsuario(usuario.id, dados)
      mostrarRecado('Alterações salvas')
      voltar('/ajustes/usuarios')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: `Excluir ${usuario.nome.split(' ')[0]}?`,
      texto:
        'A conta é apagada e a pessoa não entra mais no app. O que estava com ela (aulas, treinos, chamadas) fica sem atribuição. Não dá para desfazer.',
      confirmar: 'Excluir usuário',
      perigo: true,
    })
    if (!certeza) return
    setErro(null)
    setSalvando(true)
    try {
      await excluirUsuario(usuario.id)
      mostrarRecado('Usuário excluído')
      voltar('/ajustes/usuarios')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo={usuario.nome}
      subtitulo={usuario.email}
      voltarPara="/ajustes/usuarios"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Salvar alterações'}
          desabilitado={salvando || souEu || (funcao === null && permissao !== 'acesso_total')}
          onPress={() => gravar({ funcao, permissao })}
        />
      }>
      {souEu ? (
        <Bloco>
          <Aviso
            tom="ambar"
            titulo="Esta é a sua conta"
            texto="Você não muda a própria permissão nem tira o próprio acesso: o app ficaria sem ninguém para administrar. Peça a outra pessoa com acesso total."
          />
        </Bloco>
      ) : null}
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Rotulo>Função</Rotulo>
        <View style={st.chips}>
          {FUNCOES.map((f) => (
            <Chip
              key={f.valor}
              rotulo={f.rotulo}
              ativo={funcao === f.valor}
              onPress={() => !souEu && setFuncao(f.valor)}
            />
          ))}
          <Chip
            rotulo="Só administra"
            ativo={funcao === null}
            onPress={() => {
              if (souEu) return
              setFuncao(null)
              setPermissao('acesso_total')
            }}
          />
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Permissão</Rotulo>
        <Grupo>
          {PERMISSOES.map((p) => (
            <Opcao
              key={p.valor}
              titulo={p.rotulo}
              legenda={p.detalhe}
              ativa={permissao === p.valor}
              onPress={() => {
                if (souEu) return
                setPermissao(p.valor)
                if (p.valor !== 'acesso_total' && funcao === null) setFuncao('treinador')
              }}
            />
          ))}
        </Grupo>
      </Bloco>

      {souEu ? null : (
        <Bloco ordem={2}>
          <Grupo>
            <Linha
              titulo={usuario.ativo ? 'Tirar o acesso' : 'Devolver o acesso'}
              legenda={
                usuario.ativo
                  ? 'A pessoa não entra mais no app. O histórico continua.'
                  : 'A pessoa volta a entrar no app'
              }
              perigo={usuario.ativo}
              onPress={() => gravar({ ativo: !usuario.ativo })}
            />
            <Linha
              titulo="Excluir usuário"
              legenda="Apaga a conta de vez. O que era dela fica sem atribuição."
              perigo
              onPress={excluir}
            />
          </Grupo>
        </Bloco>
      )}
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
