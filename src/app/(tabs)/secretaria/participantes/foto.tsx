
import { BotaoFoto, EscolherFoto } from '@/components/escolher-foto'
import { useFotoFicha } from '@/data/fichas'
import { rascunhoFicha } from '@/data/rascunhos'
import { voltar } from '@/lib/navegacao'

/** Tela 17c. */
export default function FotoDaCrianca() {
  const ficha = rascunhoFicha.useValor()
  // a foto ja guardada vem do bucket privado por um endereco temporario
  const guardada = useFotoFicha(ficha.fotoPath)
  const iniciais =
    ficha.nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'AD'

  return (
    <EscolherFoto
      titulo="Foto da criança"
      subtitulo={ficha.nome || 'Nova ficha'}
      uri={ficha.fotoUri ?? guardada ?? undefined}
      vazio={iniciais}
      nota="A foto fica na ficha e só a coordenação vê. Sai do app com autorização de imagem assinada."
      onEscolher={(uri) => rascunhoFicha.definir({ fotoUri: uri })}
      onRemover={() => rascunhoFicha.definir({ fotoUri: undefined, fotoPath: undefined })}
      rodape={<BotaoFoto rotulo="Salvar foto" onPress={() => voltar()} />}
    />
  )
}
