import { BotaoFoto, EscolherFoto } from '@/components/escolher-foto'
import { rascunhoLivro } from '@/data/estudo'
import { voltar } from '@/lib/navegacao'

/** Tela 13q. */
export default function CapaDoLivro() {
  const livro = rascunhoLivro.useValor()

  return (
    <EscolherFoto
      titulo="Capa do livro"
      subtitulo="Fotografe o exemplar da ONG"
      uri={livro.capaUri}
      vazio="A"
      nota="A foto é do exemplar que está na ONG, não da imagem da internet."
      onEscolher={(uri) => rascunhoLivro.definir({ capaUri: uri })}
      onRemover={() => rascunhoLivro.definir({ capaUri: undefined })}
      rodape={<BotaoFoto rotulo="Salvar capa" onPress={() => voltar()} />}
    />
  )
}
