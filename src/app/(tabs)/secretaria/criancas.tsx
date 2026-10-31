import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Avatar, Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Busca, Grupo, Linha, TelaForm } from '@/components/ui/form'
import { entrada } from '@/components/ui/movimento'
import { useUnidades } from '@/data/chamada'
import { DOCUMENTOS_EXIGIDOS, paraBR, useParticipantes } from '@/data/fichas'
import { color, space } from '@/theme/tokens'

/**
 * Tela 12f. A lista de fichas pelo lado do cadastro: o que falta de
 * documento ou de responsavel aparece em ambar, nunca escondido — e o
 * toque abre a ficha. "Saíram" mostra quem deixou a ADAM (a ficha fica, e da
 * para reativar se a criança voltar).
 */
export default function CriancasCadastradas() {
  const [saidas, setSaidas] = useState(false)
  const { lista: fichas, carregando, erro, recarregar } = useParticipantes(undefined, saidas)
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
          : saidas
            ? `${fichas.length} ${fichas.length === 1 ? 'criança saiu' : 'crianças saíram'} · a ficha continua`
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
          <Chip rotulo="Saíram" ativo={saidas} onPress={() => setSaidas((v) => !v)} />
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
            {lista.map((p, i) => {
              const pendencias =
                DOCUMENTOS_EXIGIDOS - p.documentosEntregues + (p.temResponsavel ? 0 : 1)
              return (
                // cascata so sem busca: digitar nao refaz a entrada
                <Animated.View key={p.id} entering={termo ? undefined : entrada(i, { base: 50 })}>
                  <Linha
                    titulo={p.nome}
                    legenda={
                      p.ativa
                        ? `${p.idade} anos · ${p.unidade}`
                        : `saiu em ${p.saiuEm ? paraBR(p.saiuEm) : '—'} · ${p.unidade}`
                    }
                    esquerda={<Avatar iniciais={p.iniciais} size={34} foto={p.fotoUrl} />}
                    selo={
                      !p.ativa
                        ? { rotulo: 'saiu', tom: 'neutro' }
                        : pendencias
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
                </Animated.View>
              )
            })}
          </Grupo>
        ) : (
          <Aviso
            titulo={
              fichas.length
                ? 'Nenhuma ficha com esse nome'
                : saidas
                  ? 'Ninguém saiu da ADAM'
                  : 'Nenhuma criança cadastrada'
            }
          />
        )}
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
