import { useState } from 'react'

import { Aviso, Bloco, Botao, Entrada, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { criarTipo, rascunhoLivro, useBiblioteca } from '@/data/estudo'
import { voltar } from '@/lib/navegacao'

/** Tela 13s. Antes de criar, mostra o que ja existe: tipo repetido divide a lista. */
export default function NovoTipo() {
  const { livros, tipos } = useBiblioteca()
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const limpo = nome.trim()
  const repetido = tipos.some((t) => t.toLowerCase() === limpo.toLowerCase())

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      await criarTipo(limpo)
      rascunhoLivro.definir({ tipo: limpo })
      mostrarRecado(`Tipo “${limpo}” criado`)
      voltar('/estudo/acervo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o tipo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo="Novo tipo"
      subtitulo="Entra na lista de todos os livros"
      voltarPara="/estudo/acervo"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Salvar tipo'}
          desabilitado={!limpo || repetido || salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Entrada
          rotulo="Nome do tipo"
          value={nome}
          onChangeText={setNome}
          placeholder="Como aparece na lista"
          autoFocus
        />
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo extra={`${tipos.length} ${tipos.length === 1 ? 'tipo' : 'tipos'}`}>
          Já existem
        </Rotulo>
        <Grupo>
          {tipos.map((t) => (
            <Linha key={t} titulo={t} valor={String(livros.filter((l) => l.tipo === t).length)} />
          ))}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Aviso
          tom={repetido ? 'ambar' : 'neutro'}
          titulo={repetido ? 'Esse tipo já existe' : 'Confira se já não existe'}
          texto="Dois nomes para a mesma coisa quebram o filtro do acervo em duas listas."
        />
      </Bloco>
    </TelaForm>
  )
}
