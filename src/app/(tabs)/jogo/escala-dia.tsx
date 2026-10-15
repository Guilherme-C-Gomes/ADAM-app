import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, Opcao, Rotulo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { rotuloCurto, rotuloLongo } from '@/data/calendario'
import { NOME_TURMA, useUnidades } from '@/data/chamada'
import {
  abrirPlano,
  definirTecnicoDoDia,
  horaCurta,
  horariosDoDia,
  nomeNaEquipe,
  rascunhoTreino,
  useJogo,
  useTreinosDoMes,
  type HorarioDoDia,
} from '@/data/jogo-dados'
import { deISO, hojeISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { color } from '@/theme/tokens'

/**
 * A escala de um dia do calendario: os treinos marcados naquela data e os
 * horarios fixos da semana que caem nela. A coordenacao tecnica escolhe o
 * tecnico de cada um ali mesmo; o horario fixo vira o treino do dia, ja com
 * o responsavel (os exercicios entram depois, no "Planejar treino").
 *
 * Dia que ja passou so se ve — escala e planejamento.
 */
export default function EscalaDoDia() {
  const { data = hojeISO() } = useLocalSearchParams<{ data?: string }>()
  const d = deISO(data)
  const { escala, equipe, treinos } = useJogo()
  const doMes = useTreinosDoMes(d.getFullYear(), d.getMonth())
  const unidades = useUnidades()
  const { editaEscala } = usePerfil()
  const [aberto, setAberto] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const passou = data < hojeISO()
  const pode = editaEscala && !passou
  const horarios = horariosDoDia(data, escala, doMes.lista)
  const treinadores = equipe.filter((p) => p.funcao === 'treinador')
  const varias = unidades.dados.length > 1
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''

  const escolher = async (h: HorarioDoDia, tecnicoId: string | null) => {
    setErro(null)
    setSalvando(true)
    try {
      await definirTecnicoDoDia(h, tecnicoId)
      await doMes.recarregar()
      setAberto(null)
      mostrarRecado(
        `${horaCurta(h.hora)} de ${rotuloCurto(d)}: ${nomeNaEquipe(equipe, tecnicoId) ?? 'a definir'}`,
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo={rotuloLongo(d)}
      subtitulo={
        passou
          ? 'Dia que já passou'
          : pode
            ? 'Escolha o técnico de cada horário'
            : 'Quem está escalado'
      }
      voltarPara="/jogo"
      rodape={
        !passou ? (
          <Botao
            rotulo="Planejar um treino neste dia"
            variante="secundario"
            onPress={() => {
              abrirPlano()
              rascunhoTreino.definir({ data })
              router.push('/jogo/planejar')
            }}
          />
        ) : undefined
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Rotulo extra={`${horarios.length}`}>Horários do dia</Rotulo>
        {doMes.carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : horarios.length ? (
          <Grupo>
            {horarios.flatMap((h) => {
              const tecnico = nomeNaEquipe(equipe, h.responsavelId)
              const linha = (
                <Linha
                  key={h.chave}
                  titulo={`${horaCurta(h.hora)} · ${NOME_TURMA[h.turma]}${varias ? ` · ${nomeUnidade(h.unidadeId)}` : ''}`}
                  legenda={`${tecnico ?? 'técnico a definir'} · ${h.treinoId ? 'treino marcado' : 'horário fixo da semana'}`}
                  legendaTom={tecnico ? undefined : 'ambar'}
                  selo={tecnico ? undefined : { rotulo: 'a definir', tom: 'ambar' }}
                  semSeta={!pode}
                  onPress={pode ? () => setAberto(aberto === h.chave ? null : h.chave) : undefined}
                />
              )
              if (aberto !== h.chave) return [linha]
              return [
                linha,
                ...treinadores.map((p) => (
                  <Opcao
                    key={`${h.chave}-${p.id}`}
                    titulo={p.nome}
                    iniciais={p.iniciais}
                    ativa={h.responsavelId === p.id}
                    onPress={() => !salvando && escolher(h, p.id)}
                  />
                )),
                <Opcao
                  key={`${h.chave}-definir`}
                  titulo="Deixar a definir"
                  legenda="Fica em âmbar até alguém assumir"
                  ativa={h.responsavelId === null}
                  onPress={() => !salvando && escolher(h, null)}
                />,
              ]
            })}
          </Grupo>
        ) : (
          <Aviso
            titulo="Nenhum treino neste dia"
            texto="Nem treino marcado, nem horário fixo da semana. Planeje um treino no botão abaixo."
          />
        )}
      </Bloco>

      {horarios.some((h) => h.treinoId) && !passou ? (
        <Bloco ordem={1}>
          <Grupo>
            {horarios
              .filter((h) => h.treinoId)
              .map((h) => (
                <Linha
                  key={`plano-${h.chave}`}
                  titulo={`Plano do treino das ${horaCurta(h.hora)}`}
                  legenda="Exercícios, local e comissão"
                  onPress={() => {
                    const treino = treinos.find((t) => t.id === h.treinoId)
                    if (treino) abrirPlano(treino)
                    else {
                      abrirPlano()
                      rascunhoTreino.definir({
                        id: h.treinoId,
                        data: h.data,
                        hora: h.hora,
                        turma: h.turma,
                        unidadeId: h.unidadeId,
                        responsavelId: h.responsavelId,
                      })
                    }
                    router.push('/jogo/planejar')
                  }}
                />
              ))}
          </Grupo>
        </Bloco>
      ) : null}

      {pode && !treinadores.length ? (
        <Bloco ordem={2}>
          <Aviso
            tom="ambar"
            titulo="Ninguém com função de treinador"
            texto="Cadastre a equipe em Configuração da ADAM › Usuários."
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}
