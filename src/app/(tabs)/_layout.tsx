import { Tabs } from 'expo-router'

import { GuardaSessao } from '@/components/guarda-sessao'
import { TabBar, useEspacoDaBarra } from '@/components/ui/tab-bar'
import { usePerfil } from '@/data/perfis'
import { color } from '@/theme/tokens'

/**
 * A Chamada e os setores do perfil: Jogo, Secretaria e Estudo.
 *
 * A barra e desenhada por nos (`TabBar`), nao pelo sistema: o design
 * pede uma pilula de raio 24, e a UITabBar nativa nao faz isso. A cena
 * termina acima da faixa da barra (paddingBottom = altura da faixa, 0
 * quando ela some nos formularios): o conteudo nunca passa por baixo.
 * Ajustes fica fora da barra — chega pelo perfil no topo. `inicio` e
 * rota daqui mas nao aparece na barra.
 *
 * Cada setor e a Home (que tem estatistica) ficam atras de
 * `Tabs.Protected`: com o guard falso a aba some da barra e a rota deixa
 * de existir para aquele perfil — nem um link perdido chega nela.
 */
export default function TabsLayout() {
  const { setores, veDadosSensiveis } = usePerfil()
  const espacoDaBarra = useEspacoDaBarra()

  return (
    <GuardaSessao>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: color.bg, paddingBottom: espacoDaBarra },
          // trocar de menu e voltar: o setor abre do comeco, nao na tela
          // em que a pessoa tinha parado
          popToTopOnBlur: true,
        }}>
        <Tabs.Screen name="chamada" />
        <Tabs.Protected guard={veDadosSensiveis}>
          <Tabs.Screen name="inicio" />
        </Tabs.Protected>
        <Tabs.Protected guard={setores.includes('jogo')}>
          <Tabs.Screen name="jogo" />
        </Tabs.Protected>
        <Tabs.Protected guard={setores.includes('secretaria')}>
          <Tabs.Screen name="secretaria" />
        </Tabs.Protected>
        <Tabs.Protected guard={setores.includes('estudo')}>
          <Tabs.Screen name="estudo" />
        </Tabs.Protected>
      </Tabs>
    </GuardaSessao>
  )
}
