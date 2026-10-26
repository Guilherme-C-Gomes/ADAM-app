import { useState } from 'react'
import Animated from 'react-native-reanimated'

import { Aviso, Bloco, Botao, Busca, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { entrada } from '@/components/ui/movimento'
import { disponiveis, rascunhoEmprestar, useBiblioteca } from '@/data/estudo'
import { voltar } from '@/lib/navegacao'

/** Tela 13l. Sem exemplar livre nao da para emprestar — e o titulo aparece apagado. */
export default function QualLivro() {
  const escolha = rascunhoEmprestar.useValor()
  const { livros, emprestimos } = useBiblioteca()
  const [busca, setBusca] = useState('')
  const [livroId, setLivroId] = useState(escolha.livroId)

  const termo = busca.trim().toLowerCase()
  const visiveis = livros.filter((l) => (termo ? l.titulo.toLowerCase().includes(termo) : true))
  const escolhido = livros.find((l) => l.id === livroId)
  const semExemplar = escolhido ? disponiveis(escolhido, emprestimos) <= 0 : false

  return (
    <TelaForm
      titulo="Qual livro"
      subtitulo={`${livros.length} ${livros.length === 1 ? 'título' : 'títulos'} no acervo`}
      voltarPara="/estudo/emprestar"
      rodape={
        <Botao
          rotulo="Confirmar"
          desabilitado={!escolhido || semExemplar}
          onPress={() => {
            rascunhoEmprestar.definir({ livroId })
            voltar()
          }}
        />
      }>
      <Busca valor={busca} onChange={setBusca} placeholder="Buscar livro" />

      <Bloco>
        {livros.length ? (
          <Grupo>
            {visiveis.map((l, i) => {
              const livres = disponiveis(l, emprestimos)
              // a cascata e da chegada da lista, nao de cada letra da busca
              return (
                <Animated.View key={l.id} entering={termo ? undefined : entrada(i, { base: 40 })}>
                  <Opcao
                    titulo={l.titulo}
                    valor={`${livres} ${livres === 1 ? 'livre' : 'livres'}`}
                    ativa={livroId === l.id}
                    onPress={() => setLivroId(l.id)}
                  />
                </Animated.View>
              )
            })}
          </Grupo>
        ) : (
          <Aviso
            titulo="O acervo ainda está vazio"
            texto="Cadastre os livros em Estudo > Acervo antes de emprestar."
          />
        )}
      </Bloco>

      {semExemplar ? (
        <Bloco ordem={1}>
          <Aviso
            tom="ambar"
            titulo="Sem exemplar não dá para emprestar"
            texto="O título continua na lista, mas precisa voltar alguém antes."
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}
