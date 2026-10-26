import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
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
  correcaoIncompleta,
  desmarcar,
  encerradaSozinha,
  encerrar,
  excluirChamada,
  hojeLocal,
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
import {
  avulsosNaFila,
  chamadaLocal,
  comAFila,
  descartarDaFila,
  ehLocal,
  enfileirar,
  semConexao,
  sincronizar,
  temNaFila,
  useFilaChamada,
} from '@/data/chamada-offline'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { mostrarRecado } from '@/components/ui/recado'
import { sessao, usePerfil } from '@/data/perfis'
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

/** Quanto o Encerrar espera a fila subir antes de voltar (sinal ruim nao trava a tela). */
const ESPERA_ENVIO = 4000

/** O que dizer quando a correcao nao foi inteira — sem deixar meia correcao calada. */
function erroDaCorrecao(e: unknown) {
  const caiu = semConexao(e)
  if (correcaoIncompleta(e)) {
    if (e.etapa === 'registro') {
      return `As mudanças foram gravadas, mas o registro de quem corrigiu não${caiu ? ' (a internet caiu)' : ''}. Toque em Salvar correção de novo.`
    }
    if (e.aplicadas > 0) {
      return `Só ${e.aplicadas} de ${e.total} mudanças foram gravadas${caiu ? ' (a internet caiu)' : ''}. Toque em Salvar correção de novo para terminar.`
    }
  }
  return caiu
    ? 'Correção precisa de internet. Tente de novo quando a conexão voltar.'
    : 'Não foi possível salvar a correção. Ela só vale até o fim do dia da chamada.'
}

/** "2026-10-17" -> "17/10", direto do texto. */
const diaMes = (data: string) => {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

export default function ListaDaChamada() {
  const { id: idDaRota } = useLocalSearchParams<{ id: string }>()
  const { usuarioId: eu } = sessao.useValor()
  // excluir a chamada e so de quem administra a Chamada (o banco confere de novo)
  const { administraChamada } = usePerfil()
  const fila = useFilaChamada()
  // a chamada feita sem sinal que ja subiu: passa a ser a do banco
  const id = fila.resolvidas[idDaRota] ?? idDaRota
  useEffect(() => {
    if (id !== idDaRota) router.replace({ pathname: '/chamada/turma/[id]', params: { id } })
  }, [id, idDaRota])
  const chamada = useChamada(id)
  const criancas = useCriancas()
  const equipe = useEquipe()
  const avulsos = useAvulsos(id)
  const local = ehLocal(id)

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  // marcas tocadas agora e ainda nao confirmadas pelo banco: o toque responde
  // na hora, sem esperar a rede
  const [pendentes, setPendentes] = useState<Record<string, string | null>>({})
  // na correcao, as marcas ficam aqui ate salvar
  const [rascunho, setRascunho] = useState<Record<string, string> | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // a do banco com a fila por cima, ou a que so existe no celular
  const c =
    local && eu
      ? chamadaLocal(id, fila.acoes, eu)
      : chamada.dados
        ? comAFila(chamada.dados, fila.acoes, fila.resolvidas)
        : null
  if ((!local && chamada.carregando) || criancas.carregando) {
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
  // os nomes do banco mais os que ainda estao na fila do celular
  const nomesSemFicha =
    avulsos.lista.length + avulsosNaFila(fila.acoes, c.id, fila.resolvidas).length
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
    const guardarNoCelular = () =>
      enfileirar({
        tipo: estavaMarcada ? 'desmarcar' : 'marcar',
        chamada: c.id,
        criancaId,
        por: eu,
      })
    // chamada feita sem sinal, ou com algo desta chamada ainda na fila: o
    // toque vai pela fila, para manter a ordem (e para o marcar e o
    // desmarcar da mesma crianca se anularem la). Direto no banco, um
    // desmarcar agora nao apagaria a marca que ainda nem subiu.
    if (local || (await temNaFila(c.id))) {
      await guardarNoCelular()
      sincronizar().then(() => {
        if (!local) chamada.recarregar()
      })
      return
    }
    setPendentes((p) => ({ ...p, [criancaId]: estavaMarcada ? null : eu }))
    try {
      if (estavaMarcada) await desmarcar(c.id, criancaId)
      else await marcar(c.id, criancaId)
      await chamada.recarregar()
    } catch (e) {
      // sem sinal: a marca fica no celular e sobe depois
      if (semConexao(e)) await guardarNoCelular()
      else setErro('Não deu para gravar essa marca. Toque de novo.')
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
    // com algo desta chamada ainda no celular, o banco ainda nao tem a
    // chamada (ou nao tem as marcas): encerrar vai pela fila, depois delas
    const naFila = local || (await temNaFila(c.id))
    const encerrarNoCelular = async () => {
      await enfileirar({ tipo: 'encerrar', chamada: c.id })
      // da a fila uns segundos para subir; sinal ruim nao prende a tela
      await Promise.race([sincronizar(), new Promise((pronto) => setTimeout(pronto, ESPERA_ENVIO))])
      if (await temNaFila(c.id)) {
        mostrarRecado('Chamada encerrada no celular. Ela sobe quando a internet voltar.')
      }
      voltar()
    }
    try {
      if (corrigindo) {
        if (naFila) {
          // a correcao grava direto no banco, e a chamada ainda nao subiu
          setErro(
            'Para corrigir, é preciso internet: esta chamada ainda está guardada no celular e precisa subir antes.',
          )
          return
        }
        if (rascunho) await salvarCorrecao(c.id, c.marcas, rascunho)
      } else if (naFila) {
        await encerrarNoCelular()
        return
      } else {
        await encerrar(c.id)
      }
      voltar()
    } catch (e) {
      if (!corrigindo && semConexao(e)) {
        await encerrarNoCelular()
        return
      }
      if (corrigindo) {
        setErro(erroDaCorrecao(e))
        // parte pode ter subido: busca de novo, para a proxima tentativa
        // aplicar so o que falta
        if (!local) chamada.recarregar()
      } else {
        setErro('Não foi possível encerrar. Só quem está marcando pode encerrar.')
      }
    } finally {
      setSalvando(false)
    }
  }

  // A chamada que so existe no celular nunca chegou ao banco: "excluir" e
  // descartar a fila dela. A do banco e excluida la, com as marcas junto.
  const excluir = async () => {
    const certeza = await pedirConfirmacao(
      local
        ? {
            titulo: `Descartar a chamada dos ${turma}?`,
            texto:
              'Ela só existe neste celular: as marcas guardadas nela são descartadas e nada sobe para o banco. Não dá para desfazer.',
            confirmar: 'Descartar chamada',
            perigo: true,
          }
        : {
            titulo: `Excluir a chamada dos ${turma} de ${diaMes(c.data)}?`,
            texto:
              'As presenças marcadas nela saem junto e deixam de contar na frequência. Não dá para desfazer.',
            confirmar: 'Excluir chamada',
            perigo: true,
          },
    )
    if (!certeza) return
    setErro(null)
    setExcluindo(true)
    try {
      if (!local) await excluirChamada(c.id)
      // o que ainda estava na fila desta chamada seria recusado: sai junto
      await descartarDaFila(c.id)
      mostrarRecado(local ? 'Chamada descartada' : 'Chamada excluída')
      voltar('/chamada')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a chamada.')
      setExcluindo(false)
    }
  }

  return (
    <TelaForm
      titulo={`Chamada dos ${turma}`}
      subtitulo={
        encerradaSozinha(c)
          ? `Chamada de ${diaMes(c.data)} · Encerrada automaticamente`
          : corrigindo
            ? `Encerrada às ${horaDe(c.encerrada_em)} · dá para corrigir até 23h59`
            : c.data !== hojeLocal()
              ? `Chamada de ${diaMes(c.data)}, ainda aberta · ${juntos(c.participantes, eu, equipe)}`
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

      {!local && chamada.erro && chamada.dados ? (
        <Bloco>
          <Aviso
            tom="ambar"
            titulo="Sem conexão agora"
            texto="A lista pode estar desatualizada. Dá para seguir marcando: as marcas ficam no celular e sobem quando a internet voltar."
          />
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
                marcadoPor={
                  marcas[k.id] ? (equipe[marcas[k.id]] ?? { nome: '', iniciais: '·' }) : null
                }
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
              nomesSemFicha
                ? {
                    rotulo: `${nomesSemFicha} ${nomesSemFicha === 1 ? 'nome' : 'nomes'}`,
                    tom: 'ambar',
                  }
                : undefined
            }
            onPress={() =>
              router.push({ pathname: '/chamada/sem-ficha', params: { chamada: c.id } })
            }
          />
        </Grupo>
      </Bloco>

      {administraChamada ? (
        <Bloco ordem={3}>
          <Botao
            rotulo={
              excluindo
                ? local
                  ? 'Descartando…'
                  : 'Excluindo…'
                : local
                  ? 'Descartar chamada'
                  : 'Excluir chamada'
            }
            variante="perigo"
            desabilitado={excluindo || salvando}
            onPress={excluir}
          />
        </Bloco>
      ) : null}
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
