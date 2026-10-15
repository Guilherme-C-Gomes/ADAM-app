import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Barra } from '@/components/ui'
import { Aviso, Bloco, Botao, Grupo, LinhaValor, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { rotuloCurto } from '@/data/calendario'
import { disponiveis, emprestar, rascunhoEmprestar, useBiblioteca } from '@/data/estudo'
import { deISO } from '@/data/metricas'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Tela 13g. So crianca com ficha leva livro: a ficha e o que garante a
 * devolucao, porque tem responsavel e contato.
 */
export default function Emprestar() {
  const escolha = rascunhoEmprestar.useValor()
  const { livros, emprestimos, criancas } = useBiblioteca()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const livro = livros.find((l) => l.id === escolha.livroId)
  const crianca = escolha.criancaId ? criancas[escolha.criancaId] : undefined
  const sobram = livro ? disponiveis(livro, emprestimos) : 0
  const entrega = escolha.entrega ? deISO(escolha.entrega) : null

  const confirmar = async () => {
    if (!livro || !crianca || !escolha.entrega) return
    setErro(null)
    setSalvando(true)
    try {
      await emprestar(livro.id, crianca.id, escolha.entrega)
      mostrarRecado(`“${livro.titulo}” emprestado para ${crianca.nome.split(' ')[0]}`)
      voltar('/estudo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar o empréstimo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo="Emprestar livro"
      subtitulo="Biblioteca da ADAM"
      voltarPara="/estudo"
      rodape={
        <Botao
          rotulo={salvando ? 'Registrando…' : 'Confirmar empréstimo'}
          desabilitado={!livro || !crianca || !entrega || sobram <= 0 || salvando}
          onPress={confirmar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Grupo>
          <LinhaValor
            rotulo="Livro"
            valor={livro?.titulo ?? 'escolher'}
            onPress={() => router.push('/estudo/qual-livro')}
          />
          <LinhaValor
            rotulo="Quem leva"
            valor={crianca?.nome ?? 'escolher'}
            onPress={() => router.push('/estudo/quem-leva')}
          />
          <LinhaValor
            rotulo="Data de entrega"
            valor={entrega ? rotuloCurto(entrega) : 'escolher'}
            onPress={() => router.push('/estudo/data-entrega')}
          />
        </Grupo>
      </Bloco>

      {livro ? (
        <Bloco ordem={1}>
          <View style={st.estoque}>
            <View style={st.linhaTopo}>
              <Text style={st.titulo}>{livro.titulo}</Text>
              <Text style={st.contagem}>
                {sobram} de {livro.exemplares}
              </Text>
            </View>
            <Barra pct={(sobram / livro.exemplares) * 100} />
            <Text style={st.legenda}>
              {sobram > 0
                ? `Depois deste empréstimo sobram ${sobram - 1} na estante`
                : 'Nenhum exemplar na estante agora'}
            </Text>
          </View>
        </Bloco>
      ) : null}

      <Bloco ordem={2}>
        <Aviso
          titulo="Só criança cadastrada leva livro"
          texto="A ficha é o que garante a devolução: é ela que tem o responsável."
        />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  estoque: {
    padding: space.base,
    gap: space.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text, flex: 1 },
  contagem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
