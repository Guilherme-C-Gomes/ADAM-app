import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator } from 'react-native'
import Animated from 'react-native-reanimated'

import { Avatar } from '@/components/ui'
import { Aviso, Bloco, Botao, Busca, Grupo, Linha, TelaForm } from '@/components/ui/form'
import { entrada } from '@/components/ui/movimento'
import { iniciaisDe } from '@/data/jogo'
import { rotuloDe, useUsuarios } from '@/data/usuarios'
import { color } from '@/theme/tokens'

/**
 * Tela 14. A funcao daqui e o que o resto do app obedece: so quem e
 * treinador aparece na escala (R6), so professor e voluntario entram na
 * comissao. Por isso a lista mostra a funcao, nao so o nome.
 *
 * Vem do banco (tabela `usuarios`).
 */
export default function Usuarios() {
  const { lista, carregando, erro, recarregar } = useUsuarios()
  const [busca, setBusca] = useState('')

  // voltar do "Novo usuario" ou da edicao traz a lista atualizada
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  const termo = busca.trim().toLowerCase()
  const visiveis = lista.filter((u) =>
    termo ? u.nome.toLowerCase().includes(termo) || u.email.includes(termo) : true,
  )

  return (
    <TelaForm
      titulo="Usuários"
      subtitulo={`${lista.length} ${lista.length === 1 ? 'pessoa' : 'pessoas'} com acesso · só a coordenação edita`}
      rodape={
        <Botao rotulo="Adicionar usuário" onPress={() => router.push('/ajustes/novo-usuario')} />
      }>
      <Busca valor={busca} onChange={setBusca} placeholder="Buscar pessoa" />

      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        {carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : (
          <Grupo>
            {visiveis.map((u, i) => (
              // cascata so sem busca: digitar nao refaz a entrada
              <Animated.View key={u.id} entering={termo ? undefined : entrada(i, { base: 50 })}>
                <Linha
                  titulo={u.nome}
                  legenda={u.email}
                  esquerda={<Avatar iniciais={iniciaisDe(u.nome)} size={34} foto={u.foto} />}
                  selo={
                    u.ativo
                      ? {
                          rotulo: rotuloDe(u),
                          tom: u.permissao === 'acesso_total' ? 'ambar' : 'roxo',
                        }
                      : { rotulo: 'sem acesso', tom: 'vermelho' }
                  }
                  onPress={() =>
                    router.push({ pathname: '/ajustes/usuario/[id]', params: { id: u.id } })
                  }
                />
              </Animated.View>
            ))}
          </Grupo>
        )}
      </Bloco>
    </TelaForm>
  )
}
