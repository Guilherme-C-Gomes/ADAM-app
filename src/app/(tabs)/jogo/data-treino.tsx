import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Calendario, Entrada, Rotulo, TelaForm } from '@/components/ui/form'
import { DIAS_CURTOS, rotuloLongo } from '@/data/calendario'
import { HORARIO, NOME_TURMA, TURMAS, type Turma } from '@/data/chamada'
import { horaCurta, rascunhoTreino, useJogo } from '@/data/jogo-dados'
import { deISO, paraISO } from '@/data/metricas'
import { voltar } from '@/lib/navegacao'
import { space } from '@/theme/tokens'

/**
 * Tela 11i. Dia, turma e horario do treino. Os horarios da escala da semana
 * naquele dia aparecem prontos para tocar; o horario padrao da turma vem
 * junto. Mudar a escala depois nao move treino ja marcado (R16).
 */
const horaDaTurma = (t: Turma) => `${HORARIO[t].slice(0, 2)}:00`

function mascaraHora(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}
const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)

export default function DataTreino() {
  const plano = rascunhoTreino.useValor()
  const { escala } = useJogo()
  const inicial = plano.data ? deISO(plano.data) : new Date()
  const [mes, setMes] = useState({ ano: inicial.getFullYear(), mes: inicial.getMonth() })
  const [data, setData] = useState(plano.data)
  const [turma, setTurma] = useState<Turma>(plano.turma)
  const [hora, setHora] = useState(plano.hora)

  const d = data ? deISO(data) : null
  // os horarios da escala naquele dia da semana (na unidade do plano)
  const doDia = d
    ? escala.filter(
        (l) => l.diaSemana === d.getDay() && (!plano.unidadeId || l.unidadeId === plano.unidadeId),
      )
    : []

  return (
    <TelaForm
      titulo="Data do treino"
      subtitulo={d ? rotuloLongo(d) : 'Escolha um dia'}
      voltarPara="/jogo/planejar"
      rodape={
        <Botao
          rotulo="Confirmar"
          desabilitado={!data || !horaValida(hora)}
          onPress={() => {
            rascunhoTreino.definir({ data, hora, turma })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Calendario
          ano={mes.ano}
          mes={mes.mes}
          selecionado={
            d && d.getFullYear() === mes.ano && d.getMonth() === mes.mes ? d.getDate() : undefined
          }
          onEscolher={(dia) => setData(paraISO(new Date(mes.ano, mes.mes, dia)))}
          onMudarMes={(delta) => {
            const novo = new Date(mes.ano, mes.mes + delta, 1)
            setMes({ ano: novo.getFullYear(), mes: novo.getMonth() })
          }}
        />
      </Bloco>

      {doDia.length ? (
        <Bloco ordem={1}>
          <Rotulo>{`Na escala de ${d ? DIAS_CURTOS[d.getDay()] : ''}`}</Rotulo>
          <View style={st.chips}>
            {doDia.map((l) => (
              <Chip
                key={l.id}
                rotulo={`${horaCurta(l.hora)} · ${NOME_TURMA[l.turma]}`}
                ativo={hora === l.hora && turma === l.turma}
                onPress={() => {
                  setHora(l.hora)
                  setTurma(l.turma)
                }}
              />
            ))}
          </View>
        </Bloco>
      ) : null}

      <Bloco ordem={2}>
        <Rotulo>Turma</Rotulo>
        <View style={st.chips}>
          {TURMAS.map((t) => (
            <Chip
              key={t}
              rotulo={NOME_TURMA[t]}
              ativo={turma === t}
              onPress={() => {
                if (hora === horaDaTurma(turma)) setHora(horaDaTurma(t))
                setTurma(t)
              }}
            />
          ))}
        </View>
        <Entrada
          rotulo="Horário"
          value={hora}
          onChangeText={(t) => setHora(mascaraHora(t))}
          placeholder="08:00"
          keyboardType="number-pad"
          maxLength={5}
        />
      </Bloco>

      <Bloco ordem={3}>
        <Aviso
          tom="roxo"
          titulo={`${NOME_TURMA[turma]} às ${horaValida(hora) ? horaCurta(hora) : '…'}`}
          texto="A turma sai da idade: a chamada deste treino lista só quem é dela."
        />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
