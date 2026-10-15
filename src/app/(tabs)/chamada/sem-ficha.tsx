import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Entrada, Grupo, Marca, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import {
  adicionarAvulso,
  NOME_TURMA,
  removerAvulso,
  useAvulsos,
  useChamada,
} from '@/data/chamada'
import { color, space, target, type } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Telas 13m e 13m2. Crianca sem ficha tambem veio, entao tambem conta.
 * O nome digitado aqui nao vira ficha sozinho — a Secretaria cadastra
 * depois, e ate la o nome fica visivel como pendencia.
 *
 * Cada nome grava na hora na chamada (tabela chamada_avulsos): quem esta
 * marcando junto ve o mesmo nome, e ninguem digita a mesma crianca duas
 * vezes.
 */
export default function SemFicha() {
  const { chamada: chamadaId } = useLocalSearchParams<{ chamada: string }>()
  const chamada = useChamada(chamadaId)
  const avulsos = useAvulsos(chamadaId)
  const [novo, setNovo] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const turma = chamada.dados ? NOME_TURMA[chamada.dados.turma] : ''

  const adicionar = async () => {
    const nome = novo.trim()
    setNovo('')
    setAdicionando(false)
    if (!nome) return
    try {
      setErro(null)
      await adicionarAvulso(chamadaId, nome)
      await avulsos.recarregar()
    } catch {
      setErro('Não deu para gravar o nome. A chamada precisa estar aberta e você marcando nela.')
    }
  }

  const remover = async (id: string) => {
    try {
      setErro(null)
      await removerAvulso(id)
      await avulsos.recarregar()
    } catch {
      setErro('Não deu para apagar o nome. Confira a conexão.')
    }
  }

  return (
    <TelaForm
      titulo="Sem ficha ainda"
      subtitulo={turma ? `Chamada dos ${turma} · hoje` : 'Chamada de hoje'}
      rodape={<Botao rotulo="Concluir" onPress={() => voltar()} />}>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}
      <Bloco>
        <Rotulo extra={`${avulsos.lista.length} ${avulsos.lista.length === 1 ? 'nome' : 'nomes'}`}>
          Nomes digitados hoje
        </Rotulo>
        <Grupo>
          {[
            ...avulsos.lista.map((a) => (
              <View key={a.id} style={st.linha}>
                <Marca ativa />
                <Text style={st.nome}>{a.nome}</Text>
                <Pressable
                  onPress={() => remover(a.id)}
                  hitSlop={space.md}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${a.nome}`}>
                  <Icone nome="lixeira" cor={color.faint} />
                </Pressable>
              </View>
            )),
            adicionando ? (
              <View key="novo" style={st.novo}>
                <Entrada
                  value={novo}
                  onChangeText={setNovo}
                  placeholder="Nome da criança"
                  autoFocus
                  onSubmitEditing={adicionar}
                />
              </View>
            ) : (
              <Pressable
                key="adicionar"
                onPress={() => setAdicionando(true)}
                style={({ pressed }) => [st.linha, pressed && st.pressed]}
                accessibilityRole="button">
                <Text style={st.link}>Adicionar nome</Text>
              </Pressable>
            ),
          ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="O nome não vira ficha sozinho"
          texto="A presença já conta no mês da Secretaria, que cadastra depois."
        />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  linha: {
    minHeight: target.minimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  nome: { flex: 1, ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  novo: { paddingVertical: space.md },
  pressed: { opacity: 0.7 },
})
