import { Stack } from 'expo-router'

import { color } from '@/theme/tokens'

/**
 * Stack dentro da aba: o perfil empilha sobre a lista mantendo a barra
 * de abas visivel, como nas telas 05 e 06 do Figma. O gesto de voltar e
 * a animacao vem do native stack.
 */
export default function ParticipantesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  )
}
