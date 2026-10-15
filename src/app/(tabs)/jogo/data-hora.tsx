import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Calendario, TelaForm } from '@/components/ui/form'
import { rotuloLongo } from '@/data/calendario'
import { rascunhoJogo } from '@/data/jogo-dados'
import { deISO, paraISO } from '@/data/metricas'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Tela 11w. O dia no calendario; hora e minuto na roda, que mostra duas
 * opcoes de cada lado da escolhida — tocar numa delas centraliza.
 */
const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const dois = (n: number) => String(n).padStart(2, '0')

export default function DataHora() {
  const jogo = rascunhoJogo.useValor()
  const inicial = jogo.data ? deISO(jogo.data) : new Date()
  const [mes, setMes] = useState({ ano: inicial.getFullYear(), mes: inicial.getMonth() })
  const [data, setData] = useState(jogo.data)
  const [hora, setHora] = useState(Number(jogo.hora.slice(0, 2)) || 15)
  const [minuto, setMinuto] = useState(Number(jogo.hora.slice(3, 5)) || 0)
  const d = data ? deISO(data) : null

  return (
    <TelaForm
      titulo="Data e hora"
      subtitulo={jogo.adversario.trim() ? `ADAM × ${jogo.adversario}` : 'Do jogo'}
      voltarPara="/jogo/novo-jogo"
      rodape={
        <Botao
          rotulo="Confirmar data e hora"
          desabilitado={!data}
          onPress={() => {
            rascunhoJogo.definir({ data, hora: `${dois(hora)}:${dois(minuto)}` })
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

      <Bloco ordem={1}>
        <View style={st.roda}>
          <View style={st.faixa} pointerEvents="none" />
          <Coluna
            valores={Array.from({ length: 17 }, (_, i) => i + 6)}
            valor={hora}
            onChange={setHora}
            rotulo={(h) => String(h)}
          />
          <Text style={st.h}>h</Text>
          <Coluna valores={MINUTOS} valor={minuto} onChange={setMinuto} rotulo={(m) => dois(m)} />
        </View>
      </Bloco>

      <Bloco ordem={2}>
        <View style={st.resumo}>
          <Text style={st.resumoTitulo}>{d ? rotuloLongo(d) : 'Escolha o dia'}</Text>
          <Text style={st.legenda}>
            às {hora}h{dois(minuto)}
            {jogo.local.trim() ? ` · ${jogo.local}` : ''}
          </Text>
        </View>
      </Bloco>

      <Bloco ordem={3}>
        <Aviso
          titulo="O jogo entra na lista por este horário"
          texto="E a convocação sai com ele."
        />
      </Bloco>
    </TelaForm>
  )
}

function Coluna({
  valores,
  valor,
  onChange,
  rotulo,
  larga,
}: {
  valores: number[]
  valor: number
  onChange: (v: number) => void
  rotulo: (v: number) => string
  larga?: boolean
}) {
  const i = Math.max(0, valores.indexOf(valor))
  const visiveis = [-2, -1, 0, 1, 2].map((d) => valores[i + d])

  return (
    <View style={[st.coluna, larga && st.colunaLarga]}>
      {visiveis.map((v, k) => (
        <Pressable
          key={k}
          disabled={v === undefined || k === 2}
          onPress={() => v !== undefined && onChange(v)}
          style={st.item}
          accessibilityRole="button"
          accessibilityState={{ selected: k === 2 }}>
          <Text
            style={[st.itemTexto, k === 2 && st.itemAtivo, (k === 0 || k === 4) && st.itemLonge]}>
            {v === undefined ? '' : rotulo(v)}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const st = StyleSheet.create({
  roda: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  faixa: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    top: space.sm + 44 * 2,
    height: 44,
    borderRadius: radius.campo,
    backgroundColor: color.surface2,
  },
  coluna: { flex: 1 },
  colunaLarga: { flex: 2 },
  item: { height: 44, alignItems: 'center', justifyContent: 'center' },
  itemTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  itemAtivo: { ...type.body, fontFamily: 'Inter_700Bold', color: color.text },
  itemLonge: { opacity: 0.5 },
  h: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted },
  resumo: {
    padding: space.base,
    gap: space.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  resumoTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
