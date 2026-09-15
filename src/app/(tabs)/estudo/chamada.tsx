import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Barra, Card, Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { chamadaDeHoje } from '@/data/estudo'
import { participantes } from '@/data/mock'
import { useModoOffline } from '@/hooks/use-modo-offline'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Fazer chamada.
 *
 * ATENCAO: esta tela NAO existe no Figma — o documento de estrutura a
 * lista como a lacuna mais importante do design (secao 13), porque e a
 * escrita mais frequente do app inteiro. O layout aqui segue a
 * linguagem das outras telas e o modelo de dados do documento; quando
 * o design desenhar a tela oficial, e para trocar por ela.
 *
 * Offline primeiro: marcar presenca funciona sem rede e a fila sobe
 * sozinha depois, entao a tela avisa quando esta gravando so local.
 */
export default function Chamada() {
  const offline = useModoOffline()
  const [presentes, setPresentes] = useState<Record<string, boolean>>({})

  // A turma da chamada de hoje; no backend isso vem da sessao.
  const turmaDoDia = useMemo(
    () =>
      participantes.filter((p) =>
        chamadaDeHoje.turma === 'Pequenos' ? p.idade <= 11 : p.idade >= 12,
      ),
    [],
  )

  const marcados = turmaDoDia.filter((p) => presentes[p.id] !== undefined).length
  const confirmados = turmaDoDia.filter((p) => presentes[p.id]).length

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={`Chamada dos ${chamadaDeHoje.turma}`}
        subtitulo={`${chamadaDeHoje.hora} · hoje`}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card>
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Presença</Text>
              <Text style={st.contagem}>
                {confirmados} de {turmaDoDia.length}
              </Text>
            </View>
            <Barra
              pct={turmaDoDia.length ? (marcados / turmaDoDia.length) * 100 : 0}
              cor={color.success}
            />
            <Text style={st.legenda}>
              {marcados === turmaDoDia.length
                ? 'Todo mundo respondido'
                : `Faltam ${turmaDoDia.length - marcados} para responder`}
            </Text>
            {offline ? (
              <Text style={st.legendaAviso}>
                Sem conexão: fica salvo no aparelho e sobe quando a internet voltar.
              </Text>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Quem veio</Overline>
          <Card style={st.cardLista}>
            {turmaDoDia.map((p, i) => {
              const marcado = presentes[p.id]
              return (
                <View key={p.id} style={[st.linha, i < turmaDoDia.length - 1 && st.divisoria]}>
                  <Avatar iniciais={p.iniciais} size={36} />
                  <View style={st.linhaTexto}>
                    <Text style={st.linhaNome}>{p.nome}</Text>
                    <Text style={st.legenda}>
                      {p.idade} anos · {p.unidade}
                    </Text>
                  </View>

                  <View style={st.botoes}>
                    <Pressable
                      onPress={() => setPresentes((a) => ({ ...a, [p.id]: true }))}
                      style={({ pressed }) => [
                        st.marcar,
                        marcado === true && st.marcarVeio,
                        pressed && st.pressed,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: marcado === true }}
                      accessibilityLabel={`${p.nome} veio`}>
                      <Text style={[st.marcarRotulo, marcado === true && st.marcarRotuloAtivo]}>
                        veio
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPresentes((a) => ({ ...a, [p.id]: false }))}
                      style={({ pressed }) => [
                        st.marcar,
                        marcado === false && st.marcarFaltou,
                        pressed && st.pressed,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: marcado === false }}
                      accessibilityLabel={`${p.nome} faltou`}>
                      <Text style={[st.marcarRotulo, marcado === false && st.marcarRotuloAtivo]}>
                        faltou
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )
            })}
          </Card>
        </Animated.View>

        <Pressable
          onPress={() => router.back()}
          disabled={!marcados}
          style={({ pressed }) => [st.botao, pressed && st.pressed, !marcados && st.desabilitado]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !marcados }}>
          <Text style={st.botaoRotulo}>
            {marcados ? `Encerrar chamada · ${confirmados} presentes` : 'Marque quem veio'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  contagem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.success },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },
  pressed: { opacity: 0.7 },

  cardLista: { paddingVertical: space.xs, gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },

  botoes: { flexDirection: 'row', gap: space.sm },
  marcar: {
    minHeight: target.minimo - space.md,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  marcarVeio: { backgroundColor: color.success, borderColor: color.success },
  marcarFaltou: { backgroundColor: color.warn, borderColor: color.warn },
  marcarRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.muted },
  marcarRotuloAtivo: { color: color.bg },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  desabilitado: { opacity: 0.4 },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
