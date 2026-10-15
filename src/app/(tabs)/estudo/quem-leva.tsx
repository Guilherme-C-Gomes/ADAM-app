import { router } from 'expo-router'
import { useState } from 'react'

import { Aviso, Bloco, Botao, Busca, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { rascunhoEmprestar, useBiblioteca } from '@/data/estudo'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'

/** Tela 13h. Quem nao tem ficha nao aparece — e o empurrao para cadastrar. */
export default function QuemLeva() {
  const escolha = rascunhoEmprestar.useValor()
  const { criancas, emprestimos } = useBiblioteca()
  const { veDadosSensiveis } = usePerfil()
  const [busca, setBusca] = useState('')
  const [criancaId, setCriancaId] = useState(escolha.criancaId)

  const todas = Object.values(criancas).sort((a, b) => a.nome.localeCompare(b.nome))
  const termo = busca.trim().toLowerCase()
  const visiveis = todas.filter((c) => (termo ? c.nome.toLowerCase().includes(termo) : true))
  const comLivro = (id: string) => emprestimos.filter((e) => e.criancaId === id).length

  return (
    <TelaForm
      titulo="Quem vai levar"
      subtitulo={`${todas.length} ${todas.length === 1 ? 'criança cadastrada' : 'crianças cadastradas'}`}
      voltarPara="/estudo/emprestar"
      rodape={
        <Botao
          rotulo="Confirmar"
          desabilitado={!criancaId}
          onPress={() => {
            rascunhoEmprestar.definir({ criancaId })
            voltar()
          }}
        />
      }>
      <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome" />

      <Bloco>
        <Grupo>
          {visiveis.map((c) => {
            const livrosCom = comLivro(c.id)
            return (
              <Opcao
                key={c.id}
                titulo={c.nome}
                iniciais={c.iniciais}
                valor={c.turma}
                selo={
                  livrosCom
                    ? {
                        rotulo: `${livrosCom} ${livrosCom === 1 ? 'livro' : 'livros'} em casa`,
                        tom: 'ambar',
                      }
                    : undefined
                }
                ativa={criancaId === c.id}
                onPress={() => setCriancaId(c.id)}
              />
            )
          })}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="Quem não tem ficha não aparece"
          texto={
            veDadosSensiveis
              ? 'Cadastre a criança na Secretaria antes de emprestar o livro.'
              : 'Peça à Secretaria para cadastrar a criança antes de emprestar o livro.'
          }
          onPress={
            veDadosSensiveis ? () => router.push('/secretaria/participantes/cadastrar') : undefined
          }
        />
      </Bloco>
    </TelaForm>
  )
}
