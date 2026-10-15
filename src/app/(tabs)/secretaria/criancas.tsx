import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Avatar, Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Busca, Grupo, Linha, TelaForm } from '@/components/ui/form'
import { useUnidades } from '@/data/chamada'
import { DOCUMENTOS, useParticipantes } from '@/data/fichas'
import { color, space } from '@/theme/tokens'

/**
 * Tela 12f. A lista de fichas pelo lado do cadastro: o que falta de
 * documento ou de responsavel aparece em ambar, nunca escondido — e o
 * toque abre a ficha.
 */
export default function CriancasCadastradas() {
  const { lista: fichas, carregando, erro, recarregar } = useParticipantes()
  const unidades = useUnidades()
  const [busca, setBusca] = useState('')
  const [unidade, setUnidade] = useState<string>('Todos')

  // voltar de uma ficha salva traz a lista atualizada
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  const termo = busca.trim().toLowerCase()
  const lista = fichas
    .filter((p) => (unidade === 'Todos' ? true : p.unidade === unidade))
    .filter((p) => (termo ? p.nome.toLowerCase().includes(termo) : true))

  return (
    <TelaForm
      titulo="Crianças cadastradas"
      subtitulo={
        carregando
          ? 'Carregando as fichas…'
          : `${fichas.length} ${fichas.length === 1 ? 'ficha' : 'fichas'} · toque para abrir`
      }
      rodape={
        <Botao
          rotulo="Cadastrar criança"
          onPress={() => router.push('/secretaria/participantes/cadastrar')}
        />
      }>
      <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome" />

      <Bloco>
        <View style={st.chips}>
          {['Todos', ...unidades.dados.map((u) => u.nome)].map((u) => (
            <Chip key={u} rotulo={u} ativo={unidade === u} onPress={() => setUnidade(u)} />
          ))}
        </View>
      </Bloco>

      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco ordem={1}>
        {carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : lista.length ? (
          <Grupo>
            {lista.map((p) => {
              const pendencias =
                DOCUMENTOS.length - p.documentosEntregues + (p.temResponsavel ? 0 : 1)
              return (
                <Linha
                  key={p.id}
                  titulo={p.nome}
                  legenda={`${p.idade} anos · ${p.unidade}`}
                  esquerda={<Avatar iniciais={p.iniciais} size={34} foto={p.fotoUrl} />}
                  selo={
                    pendencias
                      ? {
                          rotulo: `${pendencias} ${pendencias === 1 ? 'pendente' : 'pendentes'}`,
                          tom: 'ambar',
                        }
                      : { rotulo: 'completa', tom: 'verde' }
                  }
                  onPress={() =>
                    router.push({
                      pathname: '/secretaria/participantes/[id]',
                      params: { id: p.id },
                    })
                  }
                />
              )
            })}
          </Grupo>
        ) : (
          <Aviso
            titulo={fichas.length ? 'Nenhuma ficha com esse nome' : 'Nenhuma criança cadastrada'}
          />
        )}
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
