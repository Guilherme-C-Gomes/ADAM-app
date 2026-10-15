import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import {
  Aviso,
  Bloco,
  Botao,
  Busca,
  Entrada,
  Grupo,
  Linha,
  Marca,
  TelaForm,
} from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { Segmentado } from '@/components/ui/setor'
import { CATEGORIAS_EXERCICIO, type CategoriaExercicio } from '@/data/jogo'
import {
  rascunhoExercicio,
  rascunhoTreino,
  salvarExercicio,
  useJogo,
  type Exercicio,
} from '@/data/jogo-dados'
import { voltar } from '@/lib/navegacao'
import { color, space, type } from '@/theme/tokens'

/**
 * Telas 11h e 11j. A biblioteca e da ADAM, nao do treinador que cadastrou
 * (R18): o que entra aqui fica disponivel para todos.
 *
 * A bolinha poe e tira do treino; o nome abre o "como fazer" (11k). Com
 * `?editar=<id>` a mesma tela edita um exercicio da biblioteca.
 */
const MODOS = ['Do banco', 'Novo exercício'] as const
const FILTROS = ['Todos', ...CATEGORIAS_EXERCICIO] as const

export default function Biblioteca() {
  const { editar } = useLocalSearchParams<{ editar?: string }>()
  const { exercicios } = useJogo()
  const emEdicao = exercicios.find((e) => e.id === editar)
  // a edicao nasce quando o exercicio chega do banco
  return <Tela key={emEdicao?.id ?? 'lista'} emEdicao={emEdicao} />
}

function Tela({ emEdicao }: { emEdicao?: Exercicio }) {
  const plano = rascunhoTreino.useValor()
  const { exercicios } = useJogo()
  const { categoria: categoriaNova } = rascunhoExercicio.useValor()
  const [modo, setModo] = useState<(typeof MODOS)[number]>(emEdicao ? 'Novo exercício' : 'Do banco')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<CategoriaExercicio | 'Todos'>('Todos')
  const [noTreino, setNoTreino] = useState(plano.exercicios)

  const [nome, setNome] = useState(emEdicao?.nome ?? '')
  const [tempo, setTempo] = useState(emEdicao ? String(emEdicao.duracaoMin) : '')
  const [material, setMaterial] = useState(emEdicao?.material ?? '')
  const [descricao, setDescricao] = useState(emEdicao?.descricao ?? '')
  const [video, setVideo] = useState(emEdicao?.video ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // a categoria vem da tela 11z (na edicao, ja chega com a do exercicio)
  const categoria = categoriaNova

  const termo = busca.trim().toLowerCase()
  const lista = exercicios
    .filter((e) => (filtro === 'Todos' ? true : e.categoria === filtro))
    .filter((e) => (termo ? e.nome.toLowerCase().includes(termo) : true))
  const marcado = (id: string) => noTreino.some((x) => x.exercicioId === id)

  const alternar = (e: Exercicio) =>
    setNoTreino((atual) =>
      marcado(e.id)
        ? atual.filter((x) => x.exercicioId !== e.id)
        : [...atual, { exercicioId: e.id, duracaoMin: e.duracaoMin }],
    )

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      const minutos = Number(tempo.replace(/\D/g, '')) || 10
      const id = await salvarExercicio({
        id: emEdicao?.id,
        nome,
        categoria,
        duracaoMin: minutos,
        material,
        descricao,
        video,
      })
      if (emEdicao) {
        mostrarRecado('Exercício salvo')
        voltar('/jogo/biblioteca')
        return
      }
      setNoTreino((atual) => [...atual, { exercicioId: id, duracaoMin: minutos }])
      mostrarRecado('Exercício cadastrado e posto no treino')
      setNome('')
      setTempo('')
      setMaterial('')
      setDescricao('')
      setVideo('')
      setFiltro('Todos')
      setModo('Do banco')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo={emEdicao ? 'Editar exercício' : 'Exercícios'}
      subtitulo={
        emEdicao
          ? 'Muda na biblioteca para todos'
          : modo === 'Do banco'
            ? 'Toque para pôr ou tirar do treino'
            : 'Cadastrar na biblioteca da ADAM'
      }
      voltarPara="/jogo/planejar"
      rodape={
        modo === 'Do banco' ? (
          <Botao
            rotulo={`Concluir · ${noTreino.length} no treino`}
            onPress={() => {
              rascunhoTreino.definir({ exercicios: noTreino })
              voltar('/jogo/planejar')
            }}
          />
        ) : (
          <Botao
            rotulo={salvando ? 'Salvando…' : emEdicao ? 'Salvar exercício' : 'Salvar na biblioteca'}
            desabilitado={nome.trim().length < 2 || salvando}
            onPress={salvar}
          />
        )
      }>
      {emEdicao ? null : <Segmentado opcoes={MODOS} valor={modo} onChange={setModo} />}

      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      {modo === 'Do banco' ? (
        <>
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar exercício" />
          <View style={st.filtros}>
            {FILTROS.map((c) => (
              <Chip key={c} rotulo={c} ativo={filtro === c} onPress={() => setFiltro(c)} />
            ))}
          </View>

          <Bloco>
            {lista.length ? (
              <Grupo>
                {lista.map((e) => {
                  const ativo = marcado(e.id)
                  return (
                    <View key={e.id} style={st.linha}>
                      <Pressable
                        onPress={() => alternar(e)}
                        hitSlop={space.md}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: ativo }}
                        accessibilityLabel={`${ativo ? 'Tirar' : 'Pôr'} ${e.nome} no treino`}>
                        <Marca ativa={ativo} />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          router.push({ pathname: '/jogo/exercicio/[id]', params: { id: e.id } })
                        }
                        style={({ pressed }) => [st.texto, pressed && st.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`${e.nome}, ver como fazer`}>
                        <Text style={st.nome}>{e.nome}</Text>
                        <Text style={st.legenda}>{e.categoria}</Text>
                      </Pressable>
                      <Text style={st.legenda}>{e.duracaoMin} min</Text>
                    </View>
                  )
                })}
              </Grupo>
            ) : (
              <Text style={st.vazio}>
                {exercicios.length
                  ? 'Nenhum exercício com esse nome. Cadastre em “Novo exercício”.'
                  : 'A biblioteca ainda está vazia. Cadastre o primeiro em “Novo exercício”.'}
              </Text>
            )}
          </Bloco>
        </>
      ) : (
        <>
          <Bloco>
            <Entrada
              rotulo="Nome do exercício"
              value={nome}
              onChangeText={setNome}
              placeholder="Ex.: Arrancadas de 10 metros"
            />
          </Bloco>

          <Bloco ordem={1} style={st.dupla}>
            <View style={st.metade}>
              <Entrada
                rotulo="Tempo (min)"
                value={tempo}
                onChangeText={setTempo}
                placeholder="10"
                keyboardType="number-pad"
              />
            </View>
            <View style={st.metade}>
              <Entrada
                rotulo="Material"
                value={material}
                onChangeText={setMaterial}
                placeholder="6 cones"
              />
            </View>
          </Bloco>

          <Bloco ordem={2}>
            <Grupo>
              <Linha
                titulo="Categoria"
                legenda="Onde ele fica na biblioteca"
                selo={{ rotulo: categoria }}
                onPress={() => router.push('/jogo/exercicio-categoria')}
              />
            </Grupo>
          </Bloco>

          <Bloco ordem={3}>
            <Entrada
              rotulo="Descrição"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Como montar e o que cobrar deles"
              multiline
            />
          </Bloco>

          <Bloco ordem={4}>
            <Entrada
              rotulo="Link do vídeo"
              icone="video"
              value={video}
              onChangeText={setVideo}
              placeholder="youtu.be/..."
              autoCapitalize="none"
              keyboardType="url"
            />
          </Bloco>
        </>
      )}
    </TelaForm>
  )
}

const st = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  texto: { flex: 1, gap: 2, paddingVertical: space.sm },
  nome: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  vazio: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  dupla: { flexDirection: 'row', gap: space.md },
  metade: { flex: 1 },
})
