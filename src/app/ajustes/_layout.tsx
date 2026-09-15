import { Stack } from 'expo-router'

import { color } from '@/theme/tokens'

/**
 * Stack dentro da aba: unidades e turmas empilha sobre o ajustes
 * principal mantendo a barra de abas visivel, como o stack de
 * participantes.
 */
export default function AjustesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  )
}
