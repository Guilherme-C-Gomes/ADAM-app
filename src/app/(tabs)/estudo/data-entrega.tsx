import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Bloco, Botao, Calendario, TelaForm } from '@/components/ui/form'
import { rotuloLongo } from '@/data/calendario'
import { daquiA, diasEntre, rascunhoEmprestar } from '@/data/estudo'
import { deISO, hojeISO, paraISO } from '@/data/metricas'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/** Tela 13i. Duas semanas e o padrao; o calendario ajusta quando precisa. */
const PRAZOS = [
  { rotulo: '1 semana', dias: 7 },
  { rotulo: '2 semanas', dias: 14 },
  { rotulo: '1 mês', dias: 30 },
]

export default function DataEntrega() {
  const escolha = rascunhoEmprestar.useValor()
  const [entrega, setEntrega] = useState(escolha.entrega || daquiA(14))
  const data = deISO(entrega)
  const [ano, setAno] = useState(data.getFullYear())
  const [mes, setMes] = useState(data.getMonth())
  const prazo = diasEntre(hojeISO(), entrega)

  const escolher = (iso: string) => {
    setEntrega(iso)
    const d = deISO(iso)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  return (
    <TelaForm
      titulo="Data de entrega"
      subtitulo="Duas semanas é o padrão"
      voltarPara="/estudo/emprestar"
      rodape={
        <Botao
          rotulo="Confirmar data"
          desabilitado={prazo < 1}
          onPress={() => {
            rascunhoEmprestar.definir({ entrega })
            voltar()
          }}
        />
      }>
      <Bloco>
        <View style={st.chips}>
          {PRAZOS.map((p) => (
            <Chip
              key={p.rotulo}
              rotulo={p.rotulo}
              ativo={prazo === p.dias}
              onPress={() => escolher(daquiA(p.dias))}
            />
          ))}
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Calendario
          ano={ano}
          mes={mes}
          selecionado={
            data.getFullYear() === ano && data.getMonth() === mes ? data.getDate() : undefined
          }
          onEscolher={(dia) => setEntrega(paraISO(new Date(ano, mes, dia)))}
          onMudarMes={(d) => {
            const novo = new Date(ano, mes + d, 1)
            setAno(novo.getFullYear())
            setMes(novo.getMonth())
          }}
        />
      </Bloco>

      <Bloco ordem={2}>
        <View style={st.resumo}>
          <Text style={st.titulo}>Entrega em {rotuloLongo(data)}</Text>
          <Text style={st.legenda}>
            {prazo < 1
              ? 'Escolha um dia depois de hoje'
              : `Daqui a ${prazo} ${prazo === 1 ? 'dia' : 'dias'} · no treino, com a coordenação`}
          </Text>
        </View>
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm },
  resumo: {
    padding: space.base,
    gap: space.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
