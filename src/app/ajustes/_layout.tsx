import { Stack } from 'expo-router'

import { GuardaSessao } from '@/components/guarda-sessao'
import { usePerfil } from '@/data/perfis'
import { color } from '@/theme/tokens'

/**
 * Ajustes: duas areas.
 *
 * - Minha conta (conta, foto, trocar senha): de todo mundo, aberta pela foto
 *   no topo de qualquer tela.
 * - Configuracao da ADAM (index, unidades, usuarios): SO do ADM. Com o guard
 *   falso as rotas deixam de existir — quem digitar /ajustes no navegador
 *   cai em Minha conta. O banco recusa as mudancas de qualquer forma; aqui
 *   e para ninguem ver uma tela que nao e dele.
 */
export default function AjustesLayout() {
  return (
    <GuardaSessao>
      <Rotas />
    </GuardaSessao>
  )
}

function Rotas() {
  const { administra } = usePerfil()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}>
      <Stack.Screen name="conta" />
      <Stack.Screen name="foto" />
      <Stack.Screen name="trocar-senha" />
      <Stack.Protected guard={administra}>
        <Stack.Screen name="index" />
        <Stack.Screen name="unidades" />
        <Stack.Screen name="usuarios" />
        <Stack.Screen name="novo-usuario" />
        <Stack.Screen name="usuario/[id]" />
      </Stack.Protected>
    </Stack>
  )
}
