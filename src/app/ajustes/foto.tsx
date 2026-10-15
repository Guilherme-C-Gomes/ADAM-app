import { useState } from 'react'

import { BotaoFoto, EscolherFoto } from '@/components/escolher-foto'
import { Aviso, Bloco } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { removerMinhaFoto, trocarMinhaFoto } from '@/data/minha-foto'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'

/** A foto de quem esta logado: aparece no topo do app e para a equipe. */
export default function MinhaFoto() {
  const { pessoa } = usePerfil()
  // foto nova escolhida agora (ainda no aparelho)
  const [nova, setNova] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async () => {
    if (!nova) return voltar('/ajustes/conta')
    setErro(null)
    setSalvando(true)
    try {
      await trocarMinhaFoto(nova)
      mostrarRecado('Foto atualizada')
      voltar('/ajustes/conta')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a foto.')
    } finally {
      setSalvando(false)
    }
  }

  const remover = async () => {
    if (nova) return setNova(null)
    setErro(null)
    try {
      await removerMinhaFoto()
      mostrarRecado('Foto removida')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível tirar a foto.')
    }
  }

  return (
    <EscolherFoto
      titulo="Minha foto"
      subtitulo={pessoa.nome}
      uri={nova ?? pessoa.foto ?? undefined}
      vazio={pessoa.iniciais}
      legendas={['É assim que a equipe vê você', 'Como a equipe vai ver você']}
      nota="A foto aparece no topo do app e para a equipe, nas escalas e nas aulas."
      voltarPara="/ajustes/conta"
      onEscolher={setNova}
      onRemover={remover}
      extra={
        erro ? (
          <Bloco>
            <Aviso tom="ambar" titulo={erro} />
          </Bloco>
        ) : null
      }
      rodape={
        <BotaoFoto
          rotulo={salvando ? 'Salvando…' : nova ? 'Salvar foto' : 'Pronto'}
          onPress={salvar}
        />
      }
    />
  )
}
