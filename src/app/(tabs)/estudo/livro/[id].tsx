import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator } from 'react-native'

import { LivroForm } from '@/components/livro-form'
import { TelaForm } from '@/components/ui/form'
import { useBiblioteca } from '@/data/estudo'
import { color } from '@/theme/tokens'

/** Tela 13k. */
export default function LivroDoAcervo() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { livros, carregando } = useBiblioteca()
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

  // a chave refaz o formulario se o livro mudar no banco
  return <LivroForm key={livro.id} livro={livro} />
}
