import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'

import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Bloco, Botao, Link, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import {
  contarTreinosComExercicio,
  excluirExercicio,
  rascunhoExercicio,
  rascunhoTreino,
  useJogo,
} from '@/data/jogo-dados'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, onDark, radius, space, type } from '@/theme/tokens'

/**
 * Tela 11k. O "como fazer" que o treinador abre no campo: video, passo a
 * passo e material. "Pôr no treino" entra na mesma lista do plano (R19).
 */
export default function DetalheExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const plano = rascunhoTreino.useValor()
  const { exercicios, carregando } = useJogo()
  const ex = exercicios.find((e) => e.id === id)
  // excluir e so de quem administra o Jogo (o banco tambem recusa os outros)
  const { administraJogo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  // excluindo, o exercicio some da memoria antes de a tela sair: nada de "nao encontrado"
  if (!ex && excluindo)
    return (
      <TelaForm titulo="Excluindo…" subtitulo="" voltarPara="/jogo/biblioteca">
        {null}
      </TelaForm>
    )
  if (!ex) {
    return (
      <TelaForm
        titulo={carregando ? 'Abrindo…' : 'Exercício não encontrado'}
        subtitulo="Volte para a biblioteca"
        voltarPara="/jogo/biblioteca">
        {carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </TelaForm>
    )
  }

  const noTreino = plano.exercicios.some((x) => x.exercicioId === ex.id)

  const excluir = async () => {
    setErroExcluir(null)
    // quantos treinos perdem o exercicio: a confirmacao diz o numero do banco
    const usos = await contarTreinosComExercicio(ex.id)
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir este exercício?',
      texto: `${
        usos === null
          ? 'Ele sai também da lista de exercícios de todos os treinos em que aparece, inclusive os que já aconteceram.'
          : usos === 0
            ? 'Ele não está em nenhum treino; sai só da biblioteca.'
            : `Ele está em ${usos} ${usos === 1 ? 'treino' : 'treinos'} e sai da lista de exercícios ${usos === 1 ? 'dele' : 'deles'} também, inclusive dos que já aconteceram.`
      } Não dá para desfazer.`,
      confirmar: 'Excluir exercício',
      perigo: true,
    })
    if (!certeza) return
    setExcluindo(true)
    try {
      await excluirExercicio(ex.id)
      mostrarRecado('Exercício excluído')
      voltar('/jogo/biblioteca')
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir.')
      setExcluindo(false)
    }
  }

  return (
    <TelaForm
      titulo={ex.nome}
      subtitulo={[ex.categoria, `${ex.duracaoMin} min`, ex.material?.split('·')[0].trim()]
        .filter(Boolean)
        .join(' · ')}
      voltarPara="/jogo/biblioteca"
      rodape={
        <>
          <Botao
            rotulo={noTreino ? 'Tirar do treino' : 'Pôr no treino'}
            variante={noTreino ? 'secundario' : 'primario'}
            onPress={() => {
              rascunhoTreino.definir({
                exercicios: noTreino
                  ? plano.exercicios.filter((x) => x.exercicioId !== ex.id)
                  : [...plano.exercicios, { exercicioId: ex.id, duracaoMin: ex.duracaoMin }],
              })
              voltar()
            }}
          />
          <Link
            centro
            rotulo="Editar exercício"
            onPress={() => {
              rascunhoExercicio.definir({ categoria: ex.categoria })
              router.push({ pathname: '/jogo/biblioteca', params: { editar: ex.id } })
            }}
          />
        </>
      }>
      <Bloco>
        <Pressable
          onPress={() => ex.video && Linking.openURL(`https://${ex.video}`)}
          disabled={!ex.video}
          style={({ pressed }) => [st.video, pressed && st.pressed]}
          accessibilityRole="link"
          accessibilityLabel={ex.video ? 'Abrir o vídeo do exercício' : 'Sem vídeo cadastrado'}>
          <View style={[st.play, !ex.video && st.playVazio]}>
            <Icone nome="play" cor={color.text} tamanho={22} />
          </View>
          <Text style={st.videoLink}>{ex.video ?? 'Sem vídeo cadastrado'}</Text>
        </Pressable>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Como fazer</Rotulo>
        <View style={st.caixa}>
          <Text style={st.texto}>
            {ex.descricao ?? 'Ainda sem descrição. Toque em “Editar exercício”.'}
          </Text>
        </View>
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Material</Rotulo>
        <View style={st.caixa}>
          <Text style={st.texto}>{ex.material ?? 'Nenhum material'}</Text>
        </View>
      </Bloco>

      {administraJogo ? (
        <Bloco ordem={3} style={st.excluir}>
          {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
          <Botao
            rotulo={excluindo ? 'Excluindo…' : 'Excluir exercício'}
            variante="perigo"
            desabilitado={excluindo}
            onPress={excluir}
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

const st = StyleSheet.create({
  video: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onDark.fill,
  },
  playVazio: { backgroundColor: color.border },
  videoLink: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  caixa: {
    padding: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  texto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text, lineHeight: 21 },
  pressed: { opacity: 0.85 },
  excluir: { marginTop: space.lg },
})
