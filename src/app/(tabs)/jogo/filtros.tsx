import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Bloco, Botao, Rotulo, TelaForm } from '@/components/ui/form'
import { CATEGORIAS } from '@/data/jogo'
import { rascunhoFiltroJogos } from '@/data/jogo-dados'
import { intervaloDo } from '@/data/metricas'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/** Tela 11x. R10: filtro que nao filtra e mentira — a lista de jogos obedece. */
const PERIODOS = ['Semana', 'Mês', 'Ano'] as const
const brasileira = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export default function FiltrosJogos() {
  const atual = rascunhoFiltroJogos.useValor()
  const [categoria, setCategoria] = useState(atual.categoria)
  const [periodo, setPeriodo] = useState(atual.periodo)
  // o mesmo calculo da lista: o que aparece aqui e o que ela mostra
  const intervalo = intervaloDo({ periodo, passo: 0, de: '', ate: '' })

  return (
    <TelaForm
      titulo="Filtros"
      subtitulo="Valem para a lista de jogos"
      voltarPara="/jogo"
      rodape={
        <Botao
          rotulo="Aplicar filtros"
          onPress={() => {
            rascunhoFiltroJogos.definir({ categoria, periodo, passo: 0 })
            voltar()
          }}
        />
      }>
      <Bloco>
        <Rotulo>Categoria</Rotulo>
        <View style={st.chips}>
          {(['Todas', ...CATEGORIAS] as const).map((c) => (
            <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
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
