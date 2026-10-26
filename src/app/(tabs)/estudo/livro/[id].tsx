import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { LivroForm } from '@/components/livro-form'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Bloco, Botao, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { carregarBiblioteca, excluirLivro, useBiblioteca, type Livro } from '@/data/estudo'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, space } from '@/theme/tokens'

/** Tela 13k. */
export default function LivroDoAcervo() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { livros, emprestimos, carregando } = useBiblioteca()
  const { administraEstudo } = usePerfil()
  const livro = livros.find((l) => l.id === id)

  if (!livro) {
    return (
      <TelaForm
        titulo={carregando ? 'Abrindo o livro…' : 'Livro não encontrado'}
        subtitulo="Acervo da biblioteca"
        voltarPara="/estudo/acervo">
        {carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </TelaForm>
    )
  }

  const emprestados = emprestimos.filter((e) => e.livroId === livro.id).length

  // a chave refaz o formulario se o livro mudar no banco
  return (
    <LivroForm
      key={livro.id}
      livro={livro}
      fim={administraEstudo ? <ExcluirLivro livro={livro} emprestados={emprestados} /> : null}
    />
  )
}

/** So a coordenacao do Estudo ve (e o banco so deixa ela). */
function ExcluirLivro({ livro, emprestados }: { livro: Livro; emprestados: number }) {
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir este livro?',
      texto: `“${livro.titulo}” sai do acervo${emprestados ? ` com ${emprestados} ${emprestados === 1 ? 'exemplar emprestado' : 'exemplares emprestados'}` : ''}. Os empréstimos dele saem junto e deixam de contar nos números. Não dá para desfazer.`,
      confirmar: 'Excluir livro',
      perigo: true,
    })
    if (!certeza) return
    setErro(null)
    setExcluindo(true)
    try {
      await excluirLivro(livro)
      mostrarRecado('Livro excluído')
      voltar('/estudo/acervo')
      carregarBiblioteca()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir o livro.')
      setExcluindo(false)
    }
  }

  return (
    <Bloco ordem={5} style={{ gap: space.sm, marginTop: space.lg }}>
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}
      <Botao
        rotulo={excluindo ? 'Excluindo…' : 'Excluir livro'}
        variante="perigo"
        desabilitado={excluindo}
        onPress={excluir}
      />
    </Bloco>
  )
}
