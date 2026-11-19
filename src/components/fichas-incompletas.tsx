import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { FiltroSub } from '@/components/filtro-sub'
import { Avatar } from '@/components/ui'
import { Aviso, Grupo, Linha } from '@/components/ui/form'
import { entrada } from '@/components/ui/movimento'
import { DOCUMENTOS_EXIGIDOS, type Participante } from '@/data/fichas'
import { color, space, type } from '@/theme/tokens'

/** O que falta, escrito: "falta responsável · faltam 2 documentos". */
export function oQueFalta(p: Participante) {
  const docs = DOCUMENTOS_EXIGIDOS - p.documentosEntregues
  return [
    p.temResponsavel ? '' : 'falta responsável',
    docs > 0 ? (docs === 1 ? 'falta 1 documento' : `faltam ${docs} documentos`) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * A lista das fichas incompletas (aba Cadastro da Secretaria): quem esta sem
 * responsavel ou com documento faltando, com o que falta escrito. O toque
 * abre a ficha para completar.
 */
export function FichasIncompletas({ lista }: { lista: Participante[] }) {
  const [sub, setSub] = useState<string | null>(null)
  const visiveis = lista.filter((p) => (sub ? p.sub === sub : true))

  if (!lista.length) {
    return <Aviso titulo="Nenhuma ficha incompleta" texto="Todas têm responsável e documentos." />
  }

  return (
    <View style={st.caixa}>
      <Text style={st.conta}>
        {visiveis.length} {visiveis.length === 1 ? 'ficha incompleta' : 'fichas incompletas'}
        {sub ? ` no ${sub}` : ''} · toque para completar
      </Text>
      <FiltroSub subs={lista.map((p) => p.sub)} valor={sub} onChange={setSub} />
      <Grupo>
        {visiveis.map((p, i) => (
          <Animated.View key={p.id} entering={entrada(i, { base: 40 })}>
            <Linha
              titulo={p.nome}
              legenda={`${p.sub} · ${p.unidade}\n${oQueFalta(p)}`}
              legendaTom="ambar"
              esquerda={<Avatar iniciais={p.iniciais} size={34} foto={p.fotoUrl} />}
              onPress={() =>
                router.push({ pathname: '/secretaria/participantes/[id]', params: { id: p.id } })
              }
            />
          </Animated.View>
        ))}
      </Grupo>
    </View>
  )
}

const st = StyleSheet.create({
  caixa: { gap: space.sm },
  conta: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
