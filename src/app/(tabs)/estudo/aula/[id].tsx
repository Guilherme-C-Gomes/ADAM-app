import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar, Card, Overline } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao, Grupo, Linha, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroVoltar } from '@/components/ui/setor'
import { rotuloCurto } from '@/data/calendario'
import { NOME_TURMA, useUnidades } from '@/data/chamada'
import { abrirMaterial, carregarAulas, excluirAula, horaCurta, useAulas } from '@/data/estudo'
import { deISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, motion, space, type } from '@/theme/tokens'

/**
 * Tela 13b. O que o professor precisa ter na mao no dia: quem da a aula,
 * qual historia, o material e o que levar. A chamada sai daqui.
 */
export default function AulaDoDia() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { aulas, professores, carregando } = useAulas()
  const unidades = useUnidades()
  const { administraEstudo } = usePerfil()
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)
  const aula = aulas.find((a) => a.id === id)

  if (!aula) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroVoltar
          titulo={carregando ? 'Abrindo a aula…' : 'Aula não encontrada'}
          subtitulo="Volte para o Estudo"
          voltarPara="/estudo"
        />
        {carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </SafeAreaView>
    )
  }

  const professor = professores.find((p) => p.id === aula.professorId)
  const unidade = unidades.dados.find((u) => u.id === aula.unidadeId)?.nome

  const abrir = async (path: string) => {
    setErro(null)
    try {
      await abrirMaterial(path)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.')
    }
  }

  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir esta aula?',
      texto: `A aula dos ${NOME_TURMA[aula.turma]} de ${rotuloCurto(deISO(aula.data))} sai da escala${aula.material.length ? ' e o material anexado é apagado' : ''}. Não dá para desfazer.`,
      confirmar: 'Excluir aula',
      perigo: true,
    })
    if (!certeza) return
    setErroExcluir(null)
    setExcluindo(true)
    try {
      await excluirAula(aula)
      mostrarRecado('Aula excluída')
      voltar('/estudo')
      carregarAulas()
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir a aula.')
      setExcluindo(false)
    }
  }

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroVoltar
        titulo={`Aula dos ${NOME_TURMA[aula.turma]}`}
        subtitulo={`Devocional · ${rotuloCurto(deISO(aula.data))} · ${horaCurta(aula.hora)}${unidade ? ` · ${unidade}` : ''}`}
        voltarPara="/estudo"
        acao={{
          icone: 'lapis',
          rotulo: 'Editar aula',
          onPress: () => router.push({ pathname: '/estudo/definir-aula', params: { id: aula.id } }),
        }}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

        <Animated.View entering={FadeInDown.duration(motion.medium)}>
          <Card style={st.professor}>
            <Avatar iniciais={professor?.iniciais ?? '?'} size={36} />
            <View style={st.texto}>
              <Text style={st.nome}>{professor?.nome ?? 'a definir'}</Text>
              <Text style={st.legenda}>Professor da turma</Text>
            </View>
            <Selo
              rotulo={professor ? 'Professor' : 'a definir'}
              tom={professor ? 'verde' : 'ambar'}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(40)} style={st.secao}>
          <Overline>Conteúdo da aula</Overline>
          <Card style={st.conteudoCard}>
            <Text style={st.historia}>{aula.historia ?? 'História a definir'}</Text>
            {aula.material.map((m) => (
              <Pressable
                key={m.path}
                onPress={() => abrir(m.path)}
                style={({ pressed }) => [st.arquivo, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${m.nome}`}>
                <Icone nome="documento" cor={color.primaryCh} />
                <View style={st.texto}>
                  <Text style={st.arquivoNome} numberOfLines={1}>
                    {m.nome}
                  </Text>
                  <Text style={st.legenda}>
                    {m.tamanho ? `${m.tamanho} · ` : ''}toque para abrir
                  </Text>
                </View>
                <Icone nome="seta" cor={color.faint} />
              </Pressable>
            ))}
            {aula.material.length ? null : <Text style={st.legenda}>Nenhum material anexado</Text>}
          </Card>
        </Animated.View>

        {aula.levar.length ? (
          <Animated.View entering={FadeInDown.duration(motion.medium).delay(80)} style={st.secao}>
            <Overline>Material para levar</Overline>
            <Grupo>
              {aula.levar.map((item) => (
                <Linha key={item} titulo={item} esquerda={<Text style={st.ponto}>•</Text>} />
              ))}
            </Grupo>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(motion.medium).delay(120)}>
          <Botao rotulo="Fazer chamada" onPress={() => router.navigate('/chamada')} />
        </Animated.View>

        {/* so a coordenacao do Estudo ve (e o banco so deixa ela) */}
        {administraEstudo ? (
          <Animated.View
            entering={FadeInDown.duration(motion.medium).delay(160)}
            style={st.excluir}>
            {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
            <Botao
              rotulo={excluindo ? 'Excluindo…' : 'Excluir aula'}
              variante="perigo"
              desabilitado={excluindo}
              onPress={excluir}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: 120 },
  secao: { gap: space.md },
  professor: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  texto: { flex: 1, gap: 2 },
  nome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  conteudoCard: { gap: space.md },
  historia: { ...type.h2, fontFamily: 'Inter_600SemiBold', color: color.text },
  arquivo: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  arquivoNome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  ponto: { ...type.body, color: color.primaryCh },
  excluir: { gap: space.sm, marginTop: space.lg },
})
