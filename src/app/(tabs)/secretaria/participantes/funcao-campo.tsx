import { useState } from 'react'

import { Aviso, Bloco, Botao, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { POSICOES } from '@/data/jogo'
import { rascunhoFicha } from '@/data/rascunhos'
import { voltar } from '@/lib/navegacao'

/**
 * Tela 17h. R4: funcao em campo e opcional. "Sem posicao" e escolha
 * legitima — quem esta assim aparece em "Todos" na convocacao e some
 * nos filtros por posicao, o que e o empurrao para completar a ficha.
 */
export default function FuncaoEmCampo() {
  const ficha = rascunhoFicha.useValor()
  const [funcao, setFuncao] = useState(ficha.funcao)

  return (
    <TelaForm
      titulo="Função em campo"
      subtitulo={`Opcional · ${ficha.nome || 'nova ficha'}`}
      rodape={
        <Botao
          rotulo="Confirmar função"
          onPress={() => {
            rascunhoFicha.definir({ funcao })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Grupo>
          {[
            <Opcao
              key="sem"
              titulo="Sem posição"
              ativa={funcao === null}
              onPress={() => setFuncao(null)}
            />,
            ...POSICOES.map((p) => (
              <Opcao key={p} titulo={p} ativa={funcao === p} onPress={() => setFuncao(p)} />
            )),
          ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="Sem posição é uma escolha"
          texto="Quem está sem posição aparece em “Todos” na convocação e some quando o treinador filtra por função."
        />
      </Bloco>
    </TelaForm>
  )
}
