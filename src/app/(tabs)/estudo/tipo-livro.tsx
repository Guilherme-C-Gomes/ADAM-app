import { router } from 'expo-router'
import { useState } from 'react'
import Animated from 'react-native-reanimated'

import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Bloco, Botao, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { entrada } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import {
  carregarBiblioteca,
  excluirTipo,
  rascunhoLivro,
  useBiblioteca,
  useEscolhaDoRascunho,
} from '@/data/estudo'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { space } from '@/theme/tokens'

const TEM_LIVROS = 'Esse tipo ainda tem livros. Mude o tipo deles antes.'

/** Tela 13o. O tipo vale para todos os livros — e por ele que se procura. */
export default function TipoDoLivro() {
  const { livros, tipos } = useBiblioteca()
  // o novo tipo (13s) grava no rascunho e volta: a escolha acompanha
  const [tipo, setTipo] = useEscolhaDoRascunho(rascunhoLivro, 'tipo')

  const { administraEstudo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const quantos = (nome: string) => livros.filter((l) => l.tipo === nome).length

  // so a coordenacao do Estudo ve (e o banco so deixa ela). Fica nesta tela:
  // ela continua existindo, so o tipo sai da lista.
  const excluir = async (nome: string) => {
    setErro(null)
    // o banco recusa tambem; aqui so poupa a pergunta
    if (quantos(nome)) {
      setErro(TEM_LIVROS)
      return
    }
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir este tipo?',
      texto: `“${nome}” sai da lista de tipos e dos filtros do acervo. Não dá para desfazer.`,
      confirmar: 'Excluir tipo',
      perigo: true,
    })
    if (!certeza) return
    setExcluindo(true)
    try {
      await excluirTipo(nome)
      if (rascunhoLivro.ler().tipo === nome) rascunhoLivro.definir({ tipo: '' })
      setTipo('')
      mostrarRecado('Tipo excluído')
      await carregarBiblioteca()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir o tipo.')
    } finally {
      setExcluindo(false)
    }
  }

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
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Grupo>
          {[
            ...tipos.map((t, i) => {
              const n = quantos(t)
              return (
                <Animated.View key={t} entering={entrada(i, { base: 40 })}>
                  <Opcao
                    titulo={t}
                    valor={`${n} ${n === 1 ? 'livro' : 'livros'}`}
                    ativa={tipo === t}
                    onPress={() => setTipo(t)}
                  />
                </Animated.View>
              )
            }),
            <Animated.View key="novo" entering={entrada(tipos.length, { base: 40 })}>
              <Opcao
                titulo="Novo tipo de livro"
                ativa={false}
                onPress={() => router.push('/estudo/novo-tipo')}
                tipo="check"
              />
            </Animated.View>,
          ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="O tipo vale para todos os livros"
          texto="Ele entra na lista de filtros do acervo, não só neste título."
        />
      </Bloco>

      {administraEstudo && tipo && tipos.includes(tipo) ? (
        <Bloco ordem={2} style={{ marginTop: space.lg }}>
          <Botao
            rotulo={excluindo ? 'Excluindo…' : `Excluir o tipo “${tipo}”`}
            variante="perigo"
            desabilitado={excluindo}
            onPress={() => excluir(tipo)}
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}
