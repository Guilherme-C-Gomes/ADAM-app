import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui'
import { Icone } from '@/components/ui/icone'
import { LIMITE_BAIXA_FREQUENCIA } from '@/data/fichas'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Quem esta abaixo de 60% nas ultimas 8 semanas — a mesma conta da lista
 * "Baixa freq.", que este card abre ja filtrada (e na mesma unidade). O
 * numero vem de `emQueda` (data/fichas.ts) nas telas que o usam.
 */
export function CardQueda({ quedas, unidade }: { quedas: number; unidade: string | null }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/secretaria/participantes',
          params: unidade ? { filtro: 'baixa', unidade } : { filtro: 'baixa' },
        })
      }
      style={({ pressed }) => pressed && st.pressed}
      accessibilityRole="button">
      <Card style={st.cardAlerta}>
        <View style={[st.acento, { backgroundColor: quedas ? color.warn : color.success }]} />
        <View style={st.alertaTexto}>
          <View style={st.alertaTitulo}>
            <Icone nome="desce" cor={quedas ? color.warn : color.muted} tamanho={16} />
            <Text style={st.vazioTitulo}>
              {quedas} {quedas === 1 ? 'criança em queda' : 'crianças em queda'}
            </Text>
          </View>
          <Text style={st.vazioTexto}>
            Abaixo de {LIMITE_BAIXA_FREQUENCIA}% nas últimas 8 semanas
            {unidade ? ` · ${unidade}` : ''}
          </Text>
        </View>
        <Icone nome="seta" cor={color.faint} />
      </Card>
    </Pressable>
  )
}

/**
 * Quanto mudou em relacao ao periodo anterior. Sobe em verde, desce em
 * ambar, igual em cinza — o sinal nunca e fixo.
 */
export function Variacao({ atual, antes }: { atual: number; antes: number }) {
  const diferenca = atual - antes
  const tom = diferenca > 0 ? 'sobe' : diferenca < 0 ? 'desce' : 'igual'
  const cor = tom === 'sobe' ? color.success : tom === 'desce' ? color.warn : color.muted
  return (
    <View
      style={[
        st.selo,
        tom === 'sobe' ? st.fundoVerde : tom === 'desce' ? st.fundoAmbar : st.fundoNeutro,
      ]}
      accessibilityLabel={
        tom === 'igual'
          ? 'Igual ao período anterior'
          : `${Math.abs(diferenca)} a ${tom === 'sobe' ? 'mais' : 'menos'} que o período anterior`
      }>
      {tom === 'igual' ? null : <Icone nome={tom} cor={cor} tamanho={12} />}
      <Text style={[st.rotulo, { color: cor }]}>
        {tom === 'igual' ? 'igual' : `${tom === 'sobe' ? '+' : '−'}${Math.abs(diferenca)}`}
      </Text>
    </View>
  )
}

/**
 * Para o que o app ainda nao grava no banco. Mostrar zero ali seria
 * mentir que nao houve; o texto diz que ainda nao e contado.
 */
export function NaoRegistrado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={st.vazio}>
      <Text style={st.vazioTitulo}>{titulo}</Text>
      <Text style={st.vazioTexto}>{texto}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  pressed: { opacity: 0.85 },
  cardAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  acento: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  alertaTexto: { flex: 1, gap: space.xs },
  alertaTitulo: { flexDirection: 'row', alignItems: 'center', gap: space.xs },

  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  fundoVerde: { backgroundColor: 'rgba(61, 214, 140, 0.14)' },
  fundoAmbar: { backgroundColor: 'rgba(245, 165, 36, 0.14)' },
  fundoNeutro: { backgroundColor: color.surface2 },
  rotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold' },

  vazio: {
    gap: space.xs,
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border,
  },
  vazioTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  vazioTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
