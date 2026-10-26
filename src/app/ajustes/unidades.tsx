import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable } from 'react-native'

import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Bloco, Botao, Entrada, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { esquecerNoCelular, HORARIO, NOME_TURMA, TURMAS, type Unidade } from '@/data/chamada'
import { rascunhoFiltroSecretaria } from '@/data/rascunhos'
import { supabase } from '@/lib/supabase'
import { color, space } from '@/theme/tokens'

/**
 * Unidades e turmas, a base de tudo: treino, aula e chamada se organizam
 * por elas.
 *
 * Unidade e cadastro de verdade (tabela `unidades`; so o ADM grava). Turma
 * nao: sao duas, e a crianca cai numa delas pela idade (R1) — a regra mora
 * no banco (`turma_da_idade`), por isso aqui ela aparece explicada, sem
 * editar.
 */
const REGRA: Record<(typeof TURMAS)[number], string> = {
  pequenos: 'Até 11 anos',
  maiores: '12 anos ou mais',
}

async function lerUnidades() {
  const [unidades, criancas] = await Promise.all([
    supabase.from('unidades').select('id, nome').order('nome'),
    supabase.rpc('criancas_basico'),
  ])
  if (unidades.error) throw unidades.error
  const porUnidade = new Map<string, number>()
  for (const c of (criancas.data ?? []) as { unidade_id: string }[]) {
    porUnidade.set(c.unidade_id, (porUnidade.get(c.unidade_id) ?? 0) + 1)
  }
  return (unidades.data as Unidade[]).map((u) => ({ ...u, criancas: porUnidade.get(u.id) ?? 0 }))
}

/**
 * Exclui a unidade. O banco so deixa o ADM, e so se nada depende dela:
 * crianca (ativa ou nao), chamada ou treino ainda ligados a ela fazem o
 * banco recusar (23503) — e o historico dessas coisas nao some.
 */
async function excluirUnidade(id: string) {
  const { count, error } = await supabase.from('unidades').delete({ count: 'exact' }).eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'Essa unidade ainda tem crianças, chamadas ou treinos. Ela não pode ser excluída.'
        : 'Não foi possível excluir a unidade.',
    )
  }
  if (!count) throw new Error('Só a coordenação (acesso total) pode excluir unidades.')
  // some tambem da lista guardada para a chamada sem internet e do filtro
  // da Secretaria, que senao ficava preso numa unidade que nao existe
  await esquecerNoCelular('unidades', id)
  if (rascunhoFiltroSecretaria.ler().unidadeId === id) {
    rascunhoFiltroSecretaria.definir({ unidadeId: null })
  }
}

export default function UnidadesETurmas() {
  const [lista, setLista] = useState<(Unidade & { criancas: number })[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [nova, setNova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const recarregar = useCallback(
    () =>
      lerUnidades().then(
        (l) => {
          setLista(l)
          setErro(null)
        },
        () => setErro('Não foi possível carregar as unidades.'),
      ),
    [],
  )
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  const nome = nova.trim()
  const repetida = !!lista?.some((u) => u.nome.toLowerCase() === nome.toLowerCase())

  const adicionar = async () => {
    setErro(null)
    setSalvando(true)
    const { error } = await supabase.from('unidades').insert({ nome })
    setSalvando(false)
    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe uma unidade com esse nome.'
          : 'Não foi possível adicionar a unidade.',
      )
      return
    }
    setNova('')
    mostrarRecado(`Unidade “${nome}” adicionada`)
    recarregar()
  }

  // a ultima unidade nao sai: sem unidade nao ha cadastro nem chamada
  const podeExcluir = (lista?.length ?? 0) > 1

  const excluir = async (u: Unidade) => {
    if (!podeExcluir) return
    const certeza = await pedirConfirmacao({
      titulo: `Excluir a unidade “${u.nome}”?`,
      texto:
        'Só dá para excluir uma unidade sem crianças, chamadas nem treinos ligados a ela. Não dá para desfazer.',
      confirmar: 'Excluir unidade',
      perigo: true,
    })
    if (!certeza) return
    setErro(null)
    setExcluindo(u.id)
    try {
      await excluirUnidade(u.id)
      mostrarRecado(`Unidade “${u.nome}” excluída`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a unidade.')
    } finally {
      setExcluindo(null)
      recarregar()
    }
  }

  return (
    <TelaForm
      titulo="Unidades e turmas"
      subtitulo="Valem para treino, aula e chamada"
      voltarPara="/ajustes">
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Rotulo extra={lista ? `${lista.length}` : undefined}>Unidades</Rotulo>
        {lista?.length ? (
          <Grupo>
            {lista.map((u) => (
              <Linha
                key={u.id}
                titulo={u.nome}
                legenda={`${u.criancas} ${u.criancas === 1 ? 'criança ativa' : 'crianças ativas'}`}
                semSeta
                direita={
                  !podeExcluir ? null : excluindo === u.id ? (
                    <ActivityIndicator color={color.faint} />
                  ) : (
                    <Pressable
                      onPress={() => excluir(u)}
                      disabled={!!excluindo}
                      hitSlop={space.md}
                      accessibilityRole="button"
                      accessibilityLabel={`Excluir a unidade ${u.nome}`}>
                      <Icone nome="lixeira" cor={color.muted} />
                    </Pressable>
                  )
                }
              />
            ))}
          </Grupo>
        ) : lista ? (
          <Aviso
            tom="ambar"
            titulo="Nenhuma unidade ainda"
            texto="Sem unidade não dá para cadastrar criança nem abrir chamada. Adicione a primeira abaixo."
          />
        ) : null}
        {lista?.length === 1 ? (
          <Aviso
            titulo="A última unidade não pode ser excluída"
            texto="Sem unidade não dá para cadastrar criança nem abrir chamada."
          />
        ) : null}
      </Bloco>

      <Bloco ordem={1}>
        <Entrada
          rotulo="Nova unidade"
          value={nova}
          onChangeText={setNova}
          placeholder="Nome da unidade (ex.: Atibaia)"
        />
        {repetida ? <Aviso tom="ambar" titulo="Essa unidade já existe" /> : null}
        <Botao
          rotulo={salvando ? 'Adicionando…' : 'Adicionar unidade'}
          variante="secundario"
          desabilitado={nome.length < 2 || repetida || salvando}
          onPress={adicionar}
        />
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Turmas</Rotulo>
        <Grupo>
          {TURMAS.map((t) => (
            <Linha
              key={t}
              titulo={NOME_TURMA[t]}
              legenda={`${REGRA[t]} · treino às ${HORARIO[t]}`}
              semSeta
            />
          ))}
        </Grupo>
        <Aviso
          titulo="A turma sai da idade"
          texto="Ninguém escolhe: ao cadastrar a criança, a data de nascimento decide se ela é dos Pequenos ou dos Maiores."
        />
      </Bloco>
    </TelaForm>
  )
}
