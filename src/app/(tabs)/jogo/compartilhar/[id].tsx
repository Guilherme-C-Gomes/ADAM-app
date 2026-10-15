import * as Clipboard from 'expo-clipboard'
import * as Print from 'expo-print'
import { useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Overline } from '@/components/ui'
import { Grupo, Linha } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { DIAS_SEMANA } from '@/data/calendario'
import { diaMes, horaCurta, useAtletas, useDetalheJogo } from '@/data/jogo-dados'
import { deISO } from '@/data/metricas'
import { color, motion, space, type } from '@/theme/tokens'

/**
 * Tela 11r. Gera a convocacao para mandar no grupo das familias. Nao
 * escreve nada: so formata o que ja existe.
 *
 * Nome curto ("Davi N.") de proposito: a mensagem sai do app para um grupo
 * de WhatsApp, e nome completo de crianca nao precisa ir junto.
 */
function nomeCurto(nome: string) {
  const [primeiro, segundo] = nome.trim().split(/\s+/)
  if (!segundo) return primeiro
  return `${primeiro} ${segundo.charAt(0)}.`
}

export default function Compartilhar() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const detalhe = useDetalheJogo(id)
  const atletas = useAtletas()
  const jogo = detalhe.dados?.jogo

  if (!jogo || atletas.carregando) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar
          titulo={detalhe.carregando || atletas.carregando ? 'Montando…' : 'Jogo não encontrado'}
          subtitulo="Convocação para o grupo das famílias"
        />
        {detalhe.carregando || atletas.carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : null}
      </SafeAreaView>
    )
  }

  const nomes = (situacao: 'campo' | 'banco') =>
    (detalhe.dados?.convocados ?? [])
      .filter((c) => c.situacao === situacao)
      .map((c) => atletas.lista.find((a) => a.id === c.criancaId)?.nome)
      .filter((n): n is string => Boolean(n))
      .map(nomeCurto)
  const emCampo = nomes('campo')
  const banco = nomes('banco')

  const titulo = `ADAM × ${jogo.adversario}`
  const quando = `${DIAS_SEMANA[deISO(jogo.data).getDay()].toLowerCase()}, ${diaMes(jogo.data)} · ${horaCurta(jogo.hora)}`
  const onde = `${jogo.local} · ${jogo.categoria} · ${jogo.modalidade}`
  // O texto enviado segue a mesma ordem da previa, linha por linha.
  const mensagem = [
    `*${titulo}*`,
    quando,
    onde,
    '',
    `*EM CAMPO (${emCampo.length})*`,
    emCampo.join(', '),
    '',
    `*BANCO (${banco.length})*`,
    banco.join(', '),
  ].join('\n')

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar titulo="Compartilhar" subtitulo="Convocação para o grupo das famílias" />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
          <Overline>Como vai chegar no grupo</Overline>
          <Card style={st.previa}>
            <View style={st.bloco}>
              <Text style={st.titulo}>{titulo}</Text>
              <Text style={st.meta}>{quando}</Text>
              <Text style={st.meta}>{onde}</Text>
            </View>
            <View style={st.bloco}>
              <Text style={st.rotulo}>{`Em campo (${emCampo.length})`}</Text>
              <Text style={st.nomes}>{emCampo.join(', ') || 'ninguém ainda'}</Text>
            </View>
            {banco.length ? (
              <View style={st.bloco}>
                <Text style={st.rotulo}>{`Banco (${banco.length})`}</Text>
                <Text style={st.nomes}>{banco.join(', ')}</Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Enviar por</Overline>
          <Grupo>
            <Linha
              titulo="WhatsApp"
              legenda="Abre o WhatsApp para escolher o grupo"
              esquerda={<Icone nome="telefone" cor={color.primaryCh} />}
              onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(mensagem)}`)}
            />
            <Linha
              titulo="Copiar texto"
              legenda="Cole onde você quiser"
              esquerda={<Icone nome="menu" cor={color.primaryCh} />}
              onPress={async () => {
                await Clipboard.setStringAsync(mensagem)
                mostrarRecado('Texto copiado')
              }}
            />
            <Linha
              titulo="Exportar PDF"
              legenda="Uma folha para imprimir"
              esquerda={<Icone nome="documento" cor={color.primaryCh} />}
              onPress={async () => {
                const html = `<html><body style="font-family:sans-serif;padding:32px">
                  <h2>${titulo}</h2><p>${quando}<br/>${onde}</p>
                  <h4>EM CAMPO (${emCampo.length})</h4><p>${emCampo.join(', ')}</p>
                  <h4>BANCO (${banco.length})</h4><p>${banco.join(', ')}</p></body></html>`
                const { uri } = await Print.printToFileAsync({ html })
                if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri)
                mostrarRecado('PDF gerado')
              }}
            />
          </Grupo>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  previa: { gap: space.lg },
  bloco: { gap: space.xs },
  titulo: { ...type.h2, fontFamily: 'Inter_400Regular', color: color.text },
  meta: { ...type.body, fontFamily: 'Inter_400Regular', color: color.muted },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nomes: { ...type.body, fontFamily: 'Inter_400Regular', color: color.text, lineHeight: 26 },
  icone: { width: 24, textAlign: 'center', fontSize: 18, color: color.primaryCh },

  confirmacao: {
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: color.success,
    textAlign: 'center',
  },
})
