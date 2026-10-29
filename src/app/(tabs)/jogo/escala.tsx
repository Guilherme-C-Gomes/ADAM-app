import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { fraseDaSemana, horaFalada, lista, NOME_DIA, primeiroNome } from '@/components/escala/frase'
import {
  ChipPessoa,
  DiasDaSemana,
  FraseViva,
  horaValida,
  SeletorHora,
} from '@/components/escala/pecas'
import { linhasDaTurma, semanaSalva } from '@/components/escala/semana'
import { Chip } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import {
  Aviso,
  Bloco,
  Botao,
  Calendario,
  Grupo,
  Linha,
  Rotulo,
  Selo,
  TelaForm,
  type MarcaDia,
} from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { Segmentado } from '@/components/ui/setor'
import { NOME_TURMA, useUnidades, type Turma } from '@/data/chamada'
import { planoDaSemana, salvarSemana, useJogo, type Semana } from '@/data/jogo-dados'
import { hojeISO, paraISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, radius, space } from '@/theme/tokens'

/**
 * Treinos da semana: para cada turma, os dias (D S T Q Q S S), o horario
 * e o tecnico. A frase no topo se reescreve a cada toque ("Pequenos
 * treinam toda terça e quinta, às 8h, com Vini.") e o calendario embaixo
 * acende as proximas datas em onda.
 *
 * Salvar vira linhas da escala (uma por dia: escala.unidade_id, dia_semana,
 * hora, turma, tecnico_id). Os treinos ja marcados em datas continuam.
 * R7: "ainda sem técnico" e estado valido — fica em ambar.
 */
type Rascunho = Omit<Semana, 'unidadeId' | 'turma'>

const TURMAS_TELA = ['Pequenos', 'Maiores'] as const

export default function EditarEscala() {
  const params = useLocalSearchParams<{ unidade?: string; turma?: string }>()
  const { escala, equipe, carregando } = useJogo()
  const unidades = useUnidades()
  // tirar dia da escala: so quem administra o Jogo (o banco tambem recusa os outros)
  const { editaEscala, administraJogo } = usePerfil()

  const [unidadeId, setUnidadeId] = useState<string | null>(params.unidade ?? null)
  const [turma, setTurma] = useState<Turma>(params.turma === 'maiores' ? 'maiores' : 'pequenos')
  // o que mudou e ainda nao foi salvo, por unidade e turma
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({})
  const agora = new Date()
  const [mes, setMes] = useState({ ano: agora.getFullYear(), mes: agora.getMonth() })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // O treinador so ve a escala; um link perdido nao pode abrir a edicao.
  if (!editaEscala) return <Redirect href="/jogo" />

  const unidade = unidadeId ?? unidades.dados[0]?.id ?? null
  const varias = unidades.dados.length > 1
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''

  if ((carregando && !escala.length) || !unidade) {
    return (
      <TelaForm titulo="Treinos da semana" subtitulo="Carregando…" voltarPara="/jogo">
        {unidades.carregando || carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : (
          <Aviso
            tom="ambar"
            titulo="Nenhuma unidade cadastrada"
            texto="Cadastre a unidade em Configuração da ADAM antes de montar a escala."
          />
        )}
      </TelaForm>
    )
  }

  const chave = `${unidade}|${turma}`
  const salva = semanaSalva(escala, unidade, turma)
  const atual = rascunhos[chave] ?? salva
  const linhas = linhasDaTurma(escala, unidade, turma)
  const treinadores = equipe.filter((p) => p.funcao === 'treinador')
  const pessoa = (id: string | null) => (id ? equipe.find((p) => p.id === id) : undefined)

  const mudar = (m: Partial<Rascunho>) =>
    setRascunhos((antes) => ({ ...antes, [chave]: { ...atual, ...m } }))
  const alternarDia = (d: number) =>
    mudar({
      dias: atual.dias.includes(d) ? atual.dias.filter((x) => x !== d) : [...atual.dias, d],
    })

  // o tecnico de um dia no rascunho: o escolhido, ou o que o dia ja tinha
  const tecnicoDoDia = (d: number) =>
    atual.tecnicoId !== undefined
      ? atual.tecnicoId
      : (linhas.find((l) => l.diaSemana === d)?.tecnicoId ?? null)

  const horaOk = horaValida(atual.hora)
  const frase = !atual.dias.length
    ? `Escolha os dias de treino de ${NOME_TURMA[turma]}`
    : !horaOk
      ? 'Escreva o horário, por exemplo 08:00'
      : (fraseDaSemana(
          turma,
          atual.dias.map((d) => ({
            dia: d,
            hora: atual.hora,
            tecnico: pessoa(tecnicoDoDia(d))?.nome ?? null,
          })),
        ) ?? '')

  // o que muda no banco, de todas as turmas mexidas
  const mudancas = Object.entries(rascunhos)
    .map(([k, r]) => {
      const [u, t] = k.split('|')
      const semana: Semana = { ...r, unidadeId: u, turma: t as Turma }
      return { semana, plano: planoDaSemana(escala, semana) }
    })
    .filter((m) => m.plano.entram.length || m.plano.trocam.length || m.plano.saem.length)
  const invalida = mudancas.some((m) => !horaValida(m.semana.hora))
  const mudouEsta = mudancas.some((m) => m.semana.unidadeId === unidade && m.semana.turma === turma)

  // as proximas datas do rascunho no mes do calendario, com quem vai
  const hoje = hojeISO()
  const marcas: Record<number, MarcaDia> = {}
  if (horaOk) {
    const total = new Date(mes.ano, mes.mes + 1, 0).getDate()
    for (let dia = 1; dia <= total; dia++) {
      const data = new Date(mes.ano, mes.mes, dia)
      if (paraISO(data) < hoje || !atual.dias.includes(data.getDay())) continue
      const p = pessoa(tecnicoDoDia(data.getDay()))
      marcas[dia] = {
        tom: p ? 'ok' : 'pendente',
        iniciais: p ? [p.iniciais] : [],
        rotulo: `${NOME_TURMA[turma]} às ${horaFalada(atual.hora)}, ${p ? `com ${p.nome}` : 'sem técnico'}`,
      }
    }
  }
  const onda = `${chave}|${[...atual.dias].sort().join()}|${atual.hora}|${atual.tecnicoId}`

  const salvar = async () => {
    setErro(null)
    if (mudancas.some((m) => m.plano.saem.length) && !administraJogo) {
      setErro('Só a coordenação do Jogo pode tirar dias ou mudar o horário da escala.')
      return
    }
    const tirados = mudancas.flatMap((m) =>
      m.plano.saem
        .filter((l) => !m.semana.dias.includes(l.diaSemana))
        .map((l) => `${NOME_DIA[l.diaSemana]} de ${NOME_TURMA[m.semana.turma]}`),
    )
    if (tirados.length) {
      const certeza = await pedirConfirmacao({
        titulo: tirados.length === 1 ? `Tirar ${tirados[0]}?` : 'Tirar dias da escala?',
        texto: `${tirados.length === 1 ? 'Esse dia sai' : `${lista(tirados)} saem`} da escala da semana. Os treinos já marcados em datas continuam.`,
        confirmar: 'Salvar e tirar',
        perigo: true,
      })
      if (!certeza) return
    }
    setSalvando(true)
    try {
      for (const m of mudancas) await salvarSemana(m.semana)
      setRascunhos({})
      mostrarRecado('Escala salva')
      voltar('/jogo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a escala.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo="Treinos da semana"
      subtitulo={varias ? nomeUnidade(unidade) : 'Dias, horário e técnico de cada turma'}
      voltarPara="/jogo"
      rodape={
        <Botao
          rotulo={
            salvando
              ? 'Salvando…'
              : mudancas.length > 1
                ? `Salvar escala (${mudancas.length} turmas)`
                : 'Salvar escala'
          }
          desabilitado={!mudancas.length || invalida || salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        {varias ? (
          <View style={st.chips}>
            {unidades.dados.map((u) => (
              <Chip
                key={u.id}
                rotulo={u.nome}
                ativo={unidade === u.id}
                onPress={() => setUnidadeId(u.id)}
              />
            ))}
          </View>
        ) : null}
        <Segmentado
          opcoes={TURMAS_TELA}
          valor={turma === 'pequenos' ? 'Pequenos' : 'Maiores'}
          onChange={(v) => setTurma(v === 'Pequenos' ? 'pequenos' : 'maiores')}
        />
      </Bloco>

      <Bloco ordem={1}>
        <View style={[st.cartao, mudouEsta && st.cartaoMudou]}>
          <View style={st.cartaoTopo}>
            <Rotulo>{`${NOME_TURMA[turma]} · toda semana`}</Rotulo>
            {mudouEsta ? <Selo rotulo="não salvo" tom="ambar" /> : null}
          </View>
          <FraseViva texto={frase} apagada={!atual.dias.length || !horaOk} />
        </View>
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo extra={atual.dias.length ? `${atual.dias.length} por semana` : undefined}>
          Dias de treino
        </Rotulo>
        <DiasDaSemana dias={atual.dias} onAlternar={alternarDia} />
      </Bloco>

      <Bloco ordem={3}>
        <Rotulo>Horário</Rotulo>
        <SeletorHora
          key={chave}
          hora={atual.hora}
          onChange={(hora) => mudar({ hora })}
          extras={escala.map((l) => l.hora)}
        />
      </Bloco>

      <Bloco ordem={4}>
        <Rotulo>Técnico</Rotulo>
        <View style={st.chips}>
          {treinadores.map((p) => (
            <ChipPessoa
              key={p.id}
              rotulo={primeiroNome(p.nome)}
              iniciais={p.iniciais}
              ativo={atual.tecnicoId === p.id}
              onPress={() => mudar({ tecnicoId: p.id })}
            />
          ))}
          <ChipPessoa
            rotulo="Ninguém ainda"
            tom="ambar"
            ativo={atual.tecnicoId === null}
            onPress={() => mudar({ tecnicoId: null })}
          />
          {salva.tecnicoId === undefined ? (
            <ChipPessoa
              rotulo="Um por dia (como está)"
              ativo={atual.tecnicoId === undefined}
              onPress={() => mudar({ tecnicoId: undefined })}
            />
          ) : null}
        </View>
        {!treinadores.length ? (
          <Aviso
            tom="ambar"
            titulo="Ninguém com função de treinador"
            texto="Cadastre a equipe em Configuração da ADAM › Usuários."
            onPress={() => router.push('/ajustes/usuarios')}
          />
        ) : null}
      </Bloco>

      <Bloco ordem={5}>
        <Rotulo>{`Próximas datas de ${NOME_TURMA[turma]}`}</Rotulo>
        <Calendario
          ano={mes.ano}
          mes={mes.mes}
          marcas={marcas}
          onda={onda}
          comIniciais
          onMudarMes={(d) => {
            const novo = new Date(mes.ano, mes.mes + d, 1)
            setMes({ ano: novo.getFullYear(), mes: novo.getMonth() })
          }}
        />
      </Bloco>

      {linhas.length && !rascunhos[chave] ? (
        <Bloco ordem={6}>
          <Rotulo>Um técnico diferente num dia?</Rotulo>
          <Grupo>
            {linhas.map((l) => {
              const p = pessoa(l.tecnicoId)
              return (
                <Linha
                  key={l.id}
                  titulo={`${NOME_DIA[l.diaSemana].charAt(0).toUpperCase()}${NOME_DIA[l.diaSemana].slice(1)} · ${horaFalada(l.hora)}`}
                  legenda={p ? p.nome : 'sem técnico'}
                  legendaTom={p ? undefined : 'ambar'}
                  onPress={() =>
                    router.push({ pathname: '/jogo/treinador', params: { linha: l.id } })
                  }
                />
              )
            })}
          </Grupo>
        </Bloco>
      ) : null}

      <Bloco ordem={7}>
        <Aviso
          titulo="Mudou só uma data?"
          texto="No calendário da aba Escala, toque no dia para trocar o técnico ou as pessoas só naquela data."
        />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  cartao: {
    padding: space.base,
    gap: space.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cartaoMudou: { borderColor: color.primary },
  cartaoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
