import { Tabs } from 'expo-router'

import { TabBar } from '@/components/ui/tab-bar'
import { color } from '@/theme/tokens'

/**
 * Os tres setores do app: Jogo, Secretaria e Estudo.
 *
 * A barra e desenhada por nos (`TabBar`), nao pelo sistema: o design
 * pede uma pilula flutuante de raio 24 sobre o conteudo, e a UITabBar
 * nativa nao faz isso. Ajustes fica fora da barra — chega pelo perfil
 * no topo. `inicio` e rota daqui mas nao aparece na barra.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
      }}>
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="jogo" />
      <Tabs.Screen name="secretaria" />
      <Tabs.Screen name="estudo" />
    </Tabs>
  )
}
