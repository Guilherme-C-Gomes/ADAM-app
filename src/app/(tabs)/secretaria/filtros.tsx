import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Bloco, Botao, Calendario, Rotulo, TelaForm } from '@/components/ui/form'
import { useUnidades } from '@/data/chamada'
import { deISO, intervaloDo, paraISO, PERIODOS, type Periodo } from '@/data/metricas'
import { rascunhoFiltroSecretaria } from '@/data/rascunhos'
import { color, radius, space, type } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Tela 12b. R12: o que se escolhe aqui vale para o painel e para o
 * relatorio, e R10: o filtro filtra de verdade os dois.
 *
 * O "De / Até" mostra as datas exatas que os numeros vao contar. No
 * Personalizado, o intervalo e escolhido dentro de um mes.
 */
const brasileira = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export default function FiltrosSecretaria() {
  const atual = rascunhoFiltroSecretaria.useValor()
  const unidades = useUnidades()
  const [unidadeId, setUnidadeId] = useState(atual.unidadeId)
  const [periodo, setPeriodo] = useState<Periodo>(atual.periodo)

  // o mes do calendario e a faixa escolhida nele (dias)
  const base = atual.de ? deISO(atual.de) : new Date()
  const [ano, setAno] = useState(base.getFullYear())
  const [mes, setMes] = useState(base.getMonth())
  const [de, setDe] = useState(atual.de ? deISO(atual.de).getDate() : 1)
  const [ate, setAte] = useState(atual.ate ? deISO(atual.ate).getDate() : new Date().getDate())

  const personalizado = periodo === 'Personalizado'
  const deISOEscolhido = paraISO(new Date(ano, mes, de))
  const ateISOEscolhido = paraISO(new Date(ano, mes, ate))
  // o mesmo calculo que os numeros vao usar: o que aparece e o que conta
  const intervalo = intervaloDo({
    periodo,
    passo: 0,
    de: deISOEscolhido,
    ate: ateISOEscolhido,
  })

  const mudarMes = (delta: number) => {
    const novo = new Date(ano, mes + delta, 1)
    setAno(novo.getFullYear())
    setMes(novo.getMonth())
    setDe(1)
    setAte(1)
  }

  return (
    <TelaForm
      titulo="Filtros"
      subtitulo="Valem para todos os números da Secretaria"
      rodape={
        <Botao
          rotulo="Aplicar filtros"
          onPress={() => {
            rascunhoFiltroSecretaria.definir({
              unidadeId,
              periodo,
              passo: 0,
              de: personalizado ? deISOEscolhido : '',
              ate: personalizado ? ateISOEscolhido : '',
            })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Rotulo>Unidade</Rotulo>
        <View style={st.chips}>
          <Chip rotulo="Todas" ativo={unidadeId === null} onPress={() => setUnidadeId(null)} />
          {unidades.dados.map((u) => (
            <Chip
              key={u.id}
              rotulo={u.nome}
              ativo={unidadeId === u.id}
              onPress={() => setUnidadeId(u.id)}
            />
          ))}
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Período</Rotulo>
        <View style={st.chips}>
          {PERIODOS.map((p) => (
            <Chip key={p} rotulo={p} ativo={periodo === p} onPress={() => setPeriodo(p)} />
          ))}
        </View>
      </Bloco>

      <Bloco ordem={2}>
        <View style={st.intervalo}>
          <View style={st.metade}>
            <Rotulo>De</Rotulo>
            <Text style={st.data}>{brasileira(intervalo.inicio)}</Text>
          </View>
          <View style={st.separador} />
          <View style={st.metade}>
            <Rotulo>Até</Rotulo>
            <Text style={st.data}>{brasileira(intervalo.fim)}</Text>
          </View>
        </View>
      </Bloco>

      {personalizado ? (
        <Bloco ordem={3}>
          <Calendario
            ano={ano}
            mes={mes}
            faixa={{ de, ate }}
            onEscolher={(dia) => {
              // primeiro toque marca o inicio; o segundo, o fim
              if (dia < de || ate !== de) {
                setDe(dia)
                setAte(dia)
              } else {
                setAte(dia)
              }
            }}
            onMudarMes={mudarMes}
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  intervalo: {
    flexDirection: 'row',
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  metade: { flex: 1, gap: space.xs },
  separador: { width: 1, backgroundColor: color.divider, marginHorizontal: space.base },
  data: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
