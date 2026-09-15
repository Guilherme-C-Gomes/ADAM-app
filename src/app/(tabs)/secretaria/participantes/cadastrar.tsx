import { router } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Chip } from '@/components/ui'
import { POSICOES, turmas, unidadesInfo, type Unidade } from '@/data/mock'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 17 do Figma. Sem backend, "Salvar ficha" não persiste entre
 * telas — mesmo espírito do login e do toggle de sincronização em
 * Ajustes: a interação é real, o armazenamento ainda não existe.
 */
export default function CadastrarCrianca() {
  const [nome, setNome] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [unidade, setUnidade] = useState<Unidade>('Atibaia')
  const [turmaId, setTurmaId] = useState(turmas[0]?.id)
  const [posicao, setPosicao] = useState<(typeof POSICOES)[number] | null>(null)
  const [responsavel, setResponsavel] = useState('')
  const [salvando, setSalvando] = useState(false)

  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const podeSalvar = nome.trim().length > 0 && responsavel.trim().length > 0

  const salvar = useCallback(async () => {
    setSalvando(true)
    await new Promise((r) => setTimeout(r, motion.slow))
    if (!montado.current) return
    router.back()
  }, [])

  const turmaAtual = turmas.find((t) => t.id === turmaId)

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={st.topo}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space.sm}
          style={({ pressed }) => [st.botaoIcone, pressed && st.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Text style={st.icone}>‹</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <View style={st.cabecalho}>
          <Text style={st.titulo}>Cadastrar criança</Text>
          <Text style={st.subtitulo}>A ficha leva 2 minutos</Text>
        </View>

        <View style={st.campo}>
          <Text style={st.rotulo}>Nome completo</Text>
          <TextInput
            style={st.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Nome da criança"
            placeholderTextColor={color.faint}
          />
        </View>

        <View style={st.linhaDupla}>
          <View style={[st.campo, st.metade]}>
            <Text style={st.rotulo}>Nascimento</Text>
            <TextInput
              style={st.input}
              value={nascimento}
              onChangeText={setNascimento}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={color.faint}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={[st.campo, st.metade]}>
            <Text style={st.rotulo}>Unidade</Text>
            <View style={st.chipsLinha}>
              {unidadesInfo.map((u) => (
                <Chip
                  key={u.nome}
                  rotulo={u.nome}
                  ativo={unidade === u.nome}
                  onPress={() => setUnidade(u.nome)}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={st.campo}>
          <Text style={st.rotulo}>Turma</Text>
          <Card style={st.turmaCard}>
            <View style={st.turmaTexto}>
              <Text style={st.turmaNome}>{turmaAtual?.faixaEtaria ?? 'Selecione a turma'}</Text>
              <Text style={st.legenda}>Vale para treino, aula e chamada</Text>
            </View>
            <View style={st.chipsLinha}>
              {turmas.map((t) => (
                <Chip
                  key={t.id}
                  rotulo={t.nome}
                  ativo={turmaId === t.id}
                  onPress={() => setTurmaId(t.id)}
                />
              ))}
            </View>
          </Card>
        </View>

        <View style={st.campo}>
          <Text style={st.rotulo}>Função em campo (opcional)</Text>
          <View style={st.chipsLinha}>
            {POSICOES.map((p) => (
              <Chip
                key={p}
                rotulo={p}
                ativo={posicao === p}
                onPress={() => setPosicao((atual) => (atual === p ? null : p))}
              />
            ))}
          </View>
          <Text style={st.legenda}>Deixe em branco se ela ainda não tem posição</Text>
        </View>

        <View style={st.campo}>
          <Text style={st.rotulo}>Responsável</Text>
          <TextInput
            style={st.input}
            value={responsavel}
            onChangeText={setResponsavel}
            placeholder="Nome do responsável"
            placeholderTextColor={color.faint}
          />
        </View>

        <Pressable
          onPress={salvar}
          disabled={!podeSalvar || salvando}
          style={({ pressed }) => [
            st.botao,
            pressed && st.pressed,
            (!podeSalvar || salvando) && st.botaoDesabilitado,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !podeSalvar, busy: salvando }}>
          {salvando ? (
            <ActivityIndicator color={color.text} />
          ) : (
            <Text style={st.botaoRotulo}>Salvar ficha</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  topo: {
    height: target.minimo + space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  botaoIcone: {
    width: target.minimo,
    height: target.minimo,
    borderRadius: target.minimo / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  icone: { fontSize: 26, lineHeight: 30, color: color.text },
  pressed: { opacity: 0.85 },

  conteudo: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  cabecalho: { gap: space.xs },
  titulo: { ...type.h1, fontFamily: 'Inter_600SemiBold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  linhaDupla: { flexDirection: 'row', gap: space.base },
  metade: { flex: 1 },
  campo: { gap: space.sm },
  rotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  input: {
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  chipsLinha: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },

  turmaCard: { gap: space.sm },
  turmaTexto: { gap: 2 },
  turmaNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  botao: {
    height: target.minimo + 8,
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.4 },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})
