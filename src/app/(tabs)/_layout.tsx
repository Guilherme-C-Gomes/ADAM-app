import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { color, onDark } from '@/theme/tokens'

/**
 * Tabs nativas: a barra e renderizada pelo UITabBar do iOS e pelo
 * componente equivalente do Android, entao ganhamos o blur, o haptic e
 * o comportamento de rolagem do sistema de graca.
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={onDark.text}
      backgroundColor={color.surface}
      iconColor={color.muted}>
      <NativeTabs.Trigger name="inicio">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="participantes">
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>Participantes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="metricas">
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
        <NativeTabs.Trigger.Label>Métricas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
