import { router } from 'expo-router'
import { Aviso, Bloco, Botao, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { rascunhoLivro, useBiblioteca, useEscolhaDoRascunho } from '@/data/estudo'
import { voltar } from '@/lib/navegacao'

/** Tela 13o. O tipo vale para todos os livros — e por ele que se procura. */
export default function TipoDoLivro() {
  const { livros, tipos } = useBiblioteca()
  // o novo tipo (13s) grava no rascunho e volta: a escolha acompanha
  const [tipo, setTipo] = useEscolhaDoRascunho(rascunhoLivro, 'tipo')

  const quantos = (nome: string) => livros.filter((l) => l.tipo === nome).length

  return (
    <TelaForm
      titulo="Tipo do livro"
      subtitulo={`${tipos.length} ${tipos.length === 1 ? 'tipo cadastrado' : 'tipos cadastrados'}`}
      voltarPara="/estudo/acervo"
      rodape={
        <Botao
          rotulo="Confirmar tipo"
          desabilitado={!tipo}
          onPress={() => {
            rascunhoLivro.definir({ tipo })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Grupo>
          {[
            ...tipos.map((t) => {
              const n = quantos(t)
              return (
                <Opcao
                  key={t}
                  titulo={t}
                  valor={`${n} ${n === 1 ? 'livro' : 'livros'}`}
                  ativa={tipo === t}
                  onPress={() => setTipo(t)}
                />
              )
            }),
            <Opcao
              key="novo"
              titulo="Novo tipo de livro"
              ativa={false}
              onPress={() => router.push('/estudo/novo-tipo')}
              tipo="check"
            />,
          ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="O tipo vale para todos os livros"
          texto="Ele entra na lista de filtros do acervo, não só neste título."
        />
      </Bloco>
    </TelaForm>
  )
}
