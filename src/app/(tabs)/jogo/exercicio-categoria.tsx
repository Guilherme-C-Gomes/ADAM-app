import { useState } from 'react'

import { Aviso, Bloco, Botao, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { CATEGORIAS_EXERCICIO, DESCRICAO_CATEGORIA } from '@/data/jogo'
import { rascunhoExercicio } from '@/data/jogo-dados'
import { voltar } from '@/lib/navegacao'

/** Tela 11z. A categoria e o filtro da biblioteca — e por ela que se acha depois. */
export default function CategoriaExercicio() {
  const atual = rascunhoExercicio.useValor()
  const [escolhida, setEscolhida] = useState(atual.categoria)

  return (
    <TelaForm
      titulo="Categoria"
      subtitulo="Onde o exercício entra na biblioteca"
      rodape={
        <Botao
          rotulo="Confirmar categoria"
          onPress={() => {
            rascunhoExercicio.definir({ categoria: escolhida })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Grupo>
          {CATEGORIAS_EXERCICIO.map((c) => (
            <Opcao
              key={c}
              titulo={c}
              legenda={DESCRICAO_CATEGORIA[c]}
              ativa={escolhida === c}
              onPress={() => setEscolhida(c)}
            />
          ))}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="A categoria filtra a biblioteca"
          texto="É por ela que o treinador acha o exercício meses depois, quando monta outro treino."
        />
      </Bloco>
    </TelaForm>
  )
}
