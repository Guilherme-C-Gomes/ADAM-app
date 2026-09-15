import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Overline } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { escalaSemana } from '@/data/jogo'
import { usuarios } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Editar escala + tela 11l (escolher treinador), juntas.
 *
 * R6: so quem tem funcao de treinador entra na lista. Quando a pessoa
 * nao esta aqui, o caminho e cadastrar em Ajustes › Usuários, nao
 * digitar nome livre.
 *
 * R7: "a definir" continua sendo opcao — sessao sem responsavel e
 * estado valido, e some da lista de pendencias quando alguem assume.
 */
function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/)
  return (partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')
}

export default function EditarEscala() {
  const treinadores = usuarios.filter((u) => u.papel === 'Treinador')
  const [escala, setEscala] = useState(escalaSemana)
  const [editando, setEditando] = useState<string | null>(null)

  const definir = (linhaId: string, tecnico: string | null) => {
    setEscala((atual) =>
      atual.map((l) => (l.id === linhaId ? { ...l, tecnico } : l)),
    )
    setEditando(null)
  }

  const pendentes = escala.filter((l) => l.tecnico === null).length

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo="Editar escala"
        subtitulo={
          pendentes ? `${pendentes} treinos ainda sem técnico` : 'Todos os treinos com técnico'
        }
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(motion.medium)} style={st.secao}>
          <Overline>Semana de 1 a 7 de setembro</Overline>

          {escala.map((linha) => (
            <Card key={linha.id} style={st.cardLinha}>
              <Pressable
                onPress={() => setEditando(editando === linha.id ? null : linha.id)}
                style={({ pressed }) => [st.cabecalho, pressed && st.pressed]}
                accessibilityRole="button"
                accessibilityState={{ expanded: editando === linha.id }}>
                <Text style={st.dia}>{linha.dia}</Text>
                <Text style={st.hora}>{linha.hora}</Text>
                <View style={st.texto}>
                  <Text style={[st.nome, !linha.tecnico && st.aviso]}>
                    {linha.tecnico ?? 'a definir'}
                  </Text>
                  <Text style={st.legenda}>{linha.turma}</Text>
                </View>
                <Text style={st.chevron}>{editando === linha.id ? '⌃' : '⌄'}</Text>
              </Pressable>

              {editando === linha.id ? (
                <View style={st.opcoes}>
                  {treinadores.map((t) => {
                    const ativo = linha.tecnico === t.nome
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => definir(linha.id, t.nome)}
                        style={({ pressed }) => [st.opcao, pressed && st.pressed]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: ativo }}>
                        <View style={[st.radio, ativo && st.radioAtivo]}>
                          {ativo ? <View style={st.radioPonto} /> : null}
                        </View>
                        <Avatar iniciais={iniciaisDe(t.nome)} size={28} />
                        <Text style={st.opcaoNome}>{t.nome}</Text>
                      </Pressable>
                    )
                  })}

                  <Pressable
                    onPress={() => definir(linha.id, null)}
                    style={({ pressed }) => [st.opcao, pressed && st.pressed]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: linha.tecnico === null }}>
                    <View style={[st.radio, linha.tecnico === null && st.radioAtivo]}>
                      {linha.tecnico === null ? <View style={st.radioPonto} /> : null}
                    </View>
                    <Text style={[st.opcaoNome, st.aviso]}>Deixar a definir</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          ))}
        </Animated.View>

        <Card style={st.nota}>
          <Text style={st.legenda}>
            Só quem tem função de treinador aparece aqui. Para incluir alguém, cadastre em
            Ajustes › Usuários.
          </Text>
        </Card>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.botao, pressed && st.pressed]}
          accessibilityRole="button">
          <Text style={st.botaoRotulo}>Salvar escala</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },

  cardLinha: { gap: space.md },
  cabecalho: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  dia: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted, width: 32 },
  hora: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text, width: 36 },
  texto: { flex: 1, gap: 2 },
  nome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  aviso: { color: color.warn },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  chevron: { ...type.body, color: color.faint },
  pressed: { opacity: 0.7 },

  opcoes: { gap: space.xs, borderTopWidth: 1, borderTopColor: color.divider, paddingTop: space.md },
  opcao: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  opcaoNome: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioAtivo: { borderColor: onDark.fill },
  radioPonto: { width: 10, height: 10, borderRadius: 5, backgroundColor: onDark.fill },

  nota: {},
  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
