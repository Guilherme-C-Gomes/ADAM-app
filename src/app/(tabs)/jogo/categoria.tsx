import { useState } from 'react'

import { Aviso, Bloco, Botao, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { CATEGORIAS, idadesDaCategoria } from '@/data/jogo'
import { rascunhoJogo } from '@/data/jogo-dados'
import { voltar } from '@/lib/navegacao'

/**
 * Tela 11v. A categoria define quem pode ser convocado (R2) — e a idade
 * vem da ficha, nao de lista mantida a mao.
 */
export default function Categoria() {
  const jogo = rascunhoJogo.useValor()
  const [escolhida, setEscolhida] = useState(jogo.categoria)
  const faixa = idadesDaCategoria(escolhida)

  return (
    <TelaForm
      titulo="Categoria"
      subtitulo="Define quem pode ser convocado"
      rodape={
        <Botao
          rotulo="Confirmar categoria"
          onPress={() => {
            rascunhoJogo.definir({ categoria: escolhida })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Grupo>
          {CATEGORIAS.map((c) => {
            const f = idadesDaCategoria(c)
            return (
              <Opcao
                key={c}
                titulo={c}
                valor={`${f.min} e ${f.max} anos`}
                ativa={escolhida === c}
                onPress={() => setEscolhida(c)}
              />
            )
          })}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          tom="roxo"
          titulo="A idade vem da ficha"
          texto={`${escolhida} convoca quem tem ${faixa.min} ou ${faixa.max} anos. Quem está fora da faixa não aparece.`}
        />
      </Bloco>
    </TelaForm>
  )
}
