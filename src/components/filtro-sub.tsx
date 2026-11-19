import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import { space } from '@/theme/tokens'

/** "Sub-9" antes de "Sub-11" (pelo numero, nao pela letra). */
export const ordenarSubs = (subs: string[]) =>
  [...new Set(subs)].sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))

/**
 * Filtro por sub (categoria pelo ano de nascimento). Fechado e um chip so
 * ("Todos os subs" ou o escolhido); tocando abre os subs que existem na
 * lista. null = todos.
 */
export function FiltroSub({
  subs,
  valor,
  onChange,
}: {
  subs: string[]
  valor: string | null
  onChange: (sub: string | null) => void
}) {
  const [aberto, setAberto] = useState(false)
  const lista = ordenarSubs(subs)
  if (!lista.length) return null
  return (
    <View style={st.chips}>
      <Chip
        rotulo={valor ? `${valor} ✕` : aberto ? 'Sub ▴' : 'Sub ▾'}
        ativo={!!valor}
        onPress={() => {
          if (valor) {
            onChange(null)
            setAberto(false)
          } else setAberto((v) => !v)
        }}
      />
      {aberto && !valor
        ? lista.map((s) => (
            <Chip
              key={s}
              rotulo={s}
              ativo={false}
              onPress={() => {
                onChange(s)
                setAberto(false)
              }}
            />
          ))
        : null}
    </View>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
