import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { Avatar, Chip } from '@/components/ui'
import {
  Aviso,
  Bloco,
  Botao,
  Busca,
  Grupo,
  Linha,
  Marca,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import {
  desmarcar,
  encerrar,
  horaDe,
  HORARIO,
  juntos,
  marcar,
  NOME_TURMA,
  salvarCorrecao,
  useAvulsos,
  useChamada,
  useCriancas,
  useEquipe,
  type Pessoa,
} from '@/data/chamada'
import { sessao } from '@/data/perfis'
import { iniciaisDe } from '@/data/jogo'
import { color, space, target, type } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Telas 18b e 18d. A lista de uma turma, ligada ao banco.
 *
 * Em andamento, e a lista a varias maos: cada marca grava na hora com quem
 * marcou e aparece para os outros pelo Realtime; o filtro "Falta marcar"
 * mostra so quem ninguem conferiu, e e ele que divide o trabalho. O unico
 * botao e Encerrar — e so ai a chamada sobe.
 *
 * Encerrada, a mesma lista vira correcao ate o fim do dia: as mudancas
 * ficam locais ate "Salvar correcao", que grava a diferenca e registra quem
 * corrigiu.
 *
 * Linha com nome e idade e nada mais: e o que a chamada precisa, e e tudo
 * o que treinador e professor podem ver.
 */
type Filtro = 'Todos' | 'Falta marcar'

export default function ListaDaChamada() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { usuarioId: eu } = sessao.useValor()
  const chamada = useChamada(id)
  const criancas = useCriancas()
  const equipe = useEquipe()
  const avulsos = useAvulsos(id)

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  // marcas tocadas agora e ainda nao confirmadas pelo banco: o toque responde
  // na hora, sem esperar a rede
  const [pendentes, setPendentes] = useState<Record<string, string | null>>({})
  // na correcao, as marcas ficam aqui ate salvar
  const [rascunho, setRascunho] = useState<Record<string, string> | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const c = chamada.dados
  if (chamada.carregando || criancas.carregando) {
    return (
      <TelaForm titulo="Chamada" subtitulo="Carregando…">
        <ActivityIndicator color={color.primaryCh} />
      </TelaForm>
    )
  }
  if (!c) {
    return (
      <TelaForm titulo="Chamada" subtitulo="Não foi possível abrir">
        <Aviso tom="ambar" titulo={chamada.erro ?? 'Chamada não encontrada.'} />
      </TelaForm>
    )
  }

  const corrigindo = c.estado === 'encerrada'
  const turma = NOME_TURMA[c.turma]
  const daTurma = criancas.dados.filter((k) => k.turma === c.turma && k.unidade_id === c.unidade_id)

  const marcasBanco = { ...c.marcas }
  for (const [crianca, marcador] of Object.entries(pendentes)) {
    if (marcador) marcasBanco[crianca] = marcador
    else delete marcasBanco[crianca]
  }
  const marcas = corrigindo ? (rascunho ?? c.marcas) : marcasBanco

  const marcadas = daTurma.filter((k) => marcas[k.id]).length
  const faltam = daTurma.length - marcadas
  const termo = busca.trim().toLowerCase()
  const visiveis = daTurma
    .filter((k) => (termo ? k.nome.toLowerCase().includes(termo) : true))
    .filter((k) => (filtro === 'Falta marcar' ? !marcas[k.id] : true))

  const tocar = async (criancaId: string) => {
    if (!eu) return
    setErro(null)
    if (corrigindo) {
      setRascunho((atual) => {
        const novo = { ...(atual ?? c.marcas) }
        if (novo[criancaId]) delete novo[criancaId]
        else novo[criancaId] = eu
        return novo
      })
      return
    }
    const estavaMarcada = !!marcas[criancaId]
    setPendentes((p) => ({ ...p, [criancaId]: estavaMarcada ? null : eu }))
    try {
      if (estavaMarcada) await desmarcar(c.id, criancaId)
      else await marcar(c.id, criancaId)
      await chamada.recarregar()
    } catch {
      setErro('Não deu para gravar essa marca. Confira a conexão e toque de novo.')
    } finally {
      setPendentes((p) => {
        const resto = { ...p }
        delete resto[criancaId]
        return resto
      })
    }
  }

  const concluir = async () => {
    setErro(null)
    setSalvando(true)
    try {
      if (corrigindo) {
        if (rascunho) await salvarCorrecao(c.id, c.marcas, rascunho)
      } else {
        await encerrar(c.id)
      }
      voltar()
    } catch {
      setErro(
        corrigindo
          ? 'Não foi possível salvar a correção. Ela só vale até o fim do dia da chamada.'
          : 'Não foi possível encerrar. Só quem está marcando pode encerrar.',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo={`Chamada dos ${turma}`}
      subtitulo={
        corrigindo
          ? `Encerrada às ${horaDe(c.encerrada_em)} · dá para corrigir até 23h59`
          : `${HORARIO[c.turma]} · ${juntos(c.participantes, eu, equipe)} marcando agora`
      }
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : corrigindo ? 'Salvar correção' : 'Encerrar chamada'}
          onPress={concluir}
          desabilitado={salvando || (corrigindo && !rascunho)}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome" />
        {corrigindo ? null : (
          <View style={st.chips}>
            <Chip
              rotulo={`Todos  ${daTurma.length}`}
              ativo={filtro === 'Todos'}
              onPress={() => setFiltro('Todos')}
            />
            <Chip
              rotulo={`Falta marcar  ${faltam}`}
              ativo={filtro === 'Falta marcar'}
              onPress={() => setFiltro('Falta marcar')}
            />
          </View>
        )}
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo extra={`${marcadas} de ${daTurma.length} ${corrigindo ? 'presentes' : 'marcadas'}`}>
          {turma}
        </Rotulo>
        <Grupo>
          {visiveis.length ? (
            visiveis.map((k) => (
              <LinhaCrianca
                key={k.id}
                id={k.id}
                nome={k.nome}
                idade={k.idade}
                marcadoPor={marcas[k.id] ? (equipe[marcas[k.id]] ?? { nome: '', iniciais: '·' }) : null}
                onTocar={tocar}
              />
            ))
          ) : (
            <Text style={st.vazio}>
              {daTurma.length === 0
                ? 'Nenhuma criança desta turma cadastrada nesta unidade.'
                : filtro === 'Falta marcar'
                  ? 'Todo mundo já foi conferido.'
                  : 'Ninguém com esse nome.'}
            </Text>
          )}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Grupo>
          <Linha
            titulo="Sem ficha ainda"
            legenda="Nomes digitados hoje"
            selo={
              avulsos.lista.length
                ? {
                    rotulo: `${avulsos.lista.length} ${avulsos.lista.length === 1 ? 'nome' : 'nomes'}`,
                    tom: 'ambar',
                  }
                : undefined
            }
            onPress={() => router.push({ pathname: '/chamada/sem-ficha', params: { chamada: c.id } })}
          />
        </Grupo>
      </Bloco>
    </TelaForm>
  )
}

/**
 * Uma crianca na lista. O alvo e a linha inteira, nao o circulinho: marca
 * -se de pe, na praca, com uma mao so. Recebe o id e o `onTocar` estavel
 * em vez de uma funcao nova por linha.
 */
function LinhaCrianca({
  id,
  nome,
  idade,
  marcadoPor,
  onTocar,
}: {
  id: string
  nome: string
  idade: number
  marcadoPor: Pessoa | null
  onTocar: (id: string) => void
}) {
  return (
    <Pressable
      onPress={() => onTocar(id)}
      style={({ pressed }) => [st.linha, pressed && st.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!marcadoPor }}
      accessibilityLabel={marcadoPor ? `${nome}, marcado por ${marcadoPor.nome}` : nome}>
      <Marca ativa={!!marcadoPor} />
      <Avatar iniciais={iniciaisDe(nome)} size={32} />
      <Text style={st.nome} numberOfLines={1}>
        {nome}
      </Text>
      {marcadoPor ? (
        <View style={st.por}>
          <Text style={st.porTexto}>{marcadoPor.iniciais}</Text>
        </View>
      ) : null}
      <Text style={st.idade}>{idade} anos</Text>
    </Pressable>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm },
  linha: {
    minHeight: target.minimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  pressed: { opacity: 0.7 },
  nome: { flex: 1, ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  idade: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  por: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.primaryDk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  porTexto: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: color.text },
  vazio: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    paddingVertical: space.base,
  },
})
