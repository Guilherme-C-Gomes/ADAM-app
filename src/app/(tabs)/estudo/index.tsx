import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Overline } from '@/components/ui'
import { Aviso, Botao, Busca, Grupo, Linha, Marca, Selo } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import { HeroSetor, Segmentado } from '@/components/ui/setor'
import { Esqueleto, SkeletonCard, SkeletonFaixa, SkeletonLista } from '@/components/ui/skeleton'
import { rotuloCurto } from '@/data/calendario'
import { NOME_TURMA, useUnidades } from '@/data/chamada'
import {
  ABAS_ESTUDO,
  devolver,
  diaMes,
  horaCurta,
  novoEmprestimo,
  useAulas,
  useBiblioteca,
  type AbaEstudo,
} from '@/data/estudo'
import { deISO, hojeISO } from '@/data/metricas'
import { color, onDark, radius, space, target, type, ESPACO_FIM_DA_TELA } from '@/theme/tokens'

/**
 * Tela 13. As duas frentes do Estudo em abas: Biblioteca (o livro que a
 * crianca leva para casa) e Devocional (a aula). Tudo do banco
 * (data/estudo.ts).
 *
 * A chamada saiu daqui: virou a primeira aba da barra, uma so para o app
 * inteiro, e morar no Estudo dizia que ela era do professor.
 */
export default function Estudo() {
  const { aba: abaInicial } = useLocalSearchParams<{ aba?: AbaEstudo }>()
  // A Biblioteca abre o setor: e o trabalho de toda semana, com o livro na
  // mao. O devocional e o planejamento da semana, e fica a um toque.
  const [aba, setAba] = useState<AbaEstudo>(abaInicial ?? 'Biblioteca')
  const biblioteca = useBiblioteca()
  const devocional = useAulas()

  const subtitulo =
    aba === 'Biblioteca'
      ? `Biblioteca · ${biblioteca.livros.length} ${biblioteca.livros.length === 1 ? 'título' : 'títulos'}`
      : `Devocional · ${devocional.aulas.length} ${devocional.aulas.length === 1 ? 'aula marcada' : 'aulas marcadas'}`
  const carregando = aba === 'Biblioteca' ? biblioteca.carregando : devocional.carregando

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroSetor titulo="Estudo" subtitulo={subtitulo} />

      <ScrollView
        contentContainerStyle={st.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Segmentado opcoes={ABAS_ESTUDO} valor={aba} onChange={setAba} />

        {carregando ? (
          <Esqueleto>
            <SkeletonFaixa />
            <SkeletonLista linhas={4} />
            <SkeletonCard altura={96} />
          </Esqueleto>
        ) : aba === 'Biblioteca' ? (
          <Biblioteca />
        ) : (
          <Devocional />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/** Aba 13f: o que esta fora da estante e a porta para o acervo. */
function Biblioteca() {
  const { livros, emprestimos, criancas, erro } = useBiblioteca()
  const [busca, setBusca] = useState('')
  const [devolvendo, setDevolvendo] = useState<string | null>(null)

  const termo = busca.trim().toLowerCase()
  const fora = emprestimos
    .map((e) => ({
      emprestimo: e,
      livro: livros.find((l) => l.id === e.livroId),
      crianca: criancas[e.criancaId],
    }))
    .filter((x) =>
      termo
        ? (x.livro?.titulo ?? '').toLowerCase().includes(termo) ||
          (x.crianca?.nome ?? '').toLowerCase().includes(termo)
        : true,
    )
  const atrasados = fora.filter((x) => x.emprestimo.atrasado).length

  const marcarDevolvido = async (id: string, titulo: string) => {
    setDevolvendo(id)
    try {
      await devolver(id)
      mostrarRecado(`“${titulo}” voltou para a estante`)
    } catch (e) {
      mostrarRecado(e instanceof Error ? e.message : 'Não foi possível registrar a devolução.')
    } finally {
      setDevolvendo(null)
    }
  }

  return (
    <>
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

      <Busca valor={busca} onChange={setBusca} placeholder="Buscar livro ou quem levou" />

      <Animated.View entering={entrada(0)} style={st.secao}>
        <View style={st.linhaTopo}>
          <Overline>{`Fora da estante · ${fora.length}`}</Overline>
          {atrasados ? (
            <View style={st.contagem}>
              <NumeroAnimado valor={atrasados} style={st.legendaAviso} />
              <Text style={st.legendaAviso}>{atrasados === 1 ? ' atrasado' : ' atrasados'}</Text>
            </View>
          ) : null}
        </View>

        {fora.length ? (
          <Grupo>
            {fora.map(({ emprestimo, livro, crianca }, i) => {
              const titulo = livro?.titulo ?? 'Livro'
              // a cascata e da chegada da lista, nao de cada letra da busca
              return (
                <Animated.View
                  key={emprestimo.id}
                  entering={termo ? undefined : entrada(i, { base: 40 })}
                  style={st.linhaLivro}>
                  <Pressable
                    onPress={() => marcarDevolvido(emprestimo.id, titulo)}
                    disabled={devolvendo === emprestimo.id}
                    hitSlop={space.md}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: false, busy: devolvendo === emprestimo.id }}
                    accessibilityLabel={`Marcar ${titulo} como devolvido`}>
                    <Marca ativa={devolvendo === emprestimo.id} />
                  </Pressable>
                  <Pressionavel
                    onPress={() =>
                      router.push({
                        pathname: '/estudo/contato/[id]',
                        params: { id: emprestimo.id },
                      })
                    }
                    escala={0.98}
                    opacidade={0.7}
                    style={st.linhaTexto}
                    accessibilityRole="button"
                    accessibilityLabel={`${titulo}, falar com a família`}>
                    <Text style={st.linhaNome} numberOfLines={1}>
                      {titulo}
                    </Text>
                    <Text style={st.legenda} numberOfLines={1}>
                      {crianca?.nome ?? 'criança sem ficha ativa'} · entrega{' '}
                      {diaMes(emprestimo.entrega)}
                    </Text>
                  </Pressionavel>
                  <Selo
                    rotulo={emprestimo.atrasado ? 'atrasado' : 'em dia'}
                    tom={emprestimo.atrasado ? 'vermelho' : 'verde'}
                  />
                  <Icone nome="seta" cor={color.faint} />
                </Animated.View>
              )
            })}
          </Grupo>
        ) : (
          <Card>
            <Text style={st.legenda}>
              {termo ? 'Nenhum empréstimo com esse nome.' : 'Todos os livros estão na estante.'}
            </Text>
          </Card>
        )}
        {fora.length ? (
          <Text style={st.legendaFraca}>Marque o quadrado quando o livro voltar.</Text>
        ) : null}
      </Animated.View>

      <Animated.View entering={entrada(1)}>
        <Grupo>
          <Linha
            titulo="Acervo"
            legenda="Títulos, tipos e exemplares"
            selo={{ rotulo: `${livros.length} ${livros.length === 1 ? 'título' : 'títulos'}` }}
            onPress={() => router.push('/estudo/acervo')}
          />
        </Grupo>
      </Animated.View>

      <Animated.View entering={entrada(2)}>
        <Botao
          rotulo="Emprestar livro"
          onPress={() => {
            novoEmprestimo()
            router.push('/estudo/emprestar')
          }}
        />
      </Animated.View>
    </>
  )
}

/** Aba 13: a aula de hoje, a escala e o que falta definir. */
function Devocional() {
  const { aulas, professores, erro } = useAulas()
  const unidades = useUnidades()
  const hoje = hojeISO()
  const deHoje = aulas.filter((a) => a.data === hoje)
  const semProfessor = aulas.filter((a) => !a.professorId)

  const nomeProfessor = (id: string | null) =>
    id ? (professores.find((p) => p.id === id)?.nome ?? 'professor sem acesso') : null
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''
  const variasUnidades = unidades.dados.length > 1

  const abrir = (id: string, completa: boolean) =>
    completa
      ? router.push({ pathname: '/estudo/aula/[id]', params: { id } })
      : router.push({ pathname: '/estudo/definir-aula', params: { id } })

  return (
    <>
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}

      {deHoje.length ? (
        <Animated.View entering={entrada(0)} style={st.secao}>
          <Overline>Aula de hoje</Overline>
          {deHoje.map((a, i) => (
            <Animated.View key={a.id} entering={entrada(i, { base: 40 })}>
              <Pressionavel
                onPress={() => router.push({ pathname: '/estudo/aula/[id]', params: { id: a.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Aula dos ${NOME_TURMA[a.turma]}`}>
                <Card style={st.cardAula}>
                  <View style={st.acento} />
                  <View style={st.linhaTexto}>
                    <Text style={st.linhaNome}>
                      {NOME_TURMA[a.turma]}
                      {variasUnidades ? ` · ${nomeUnidade(a.unidadeId)}` : ''}
                    </Text>
                    <Text style={st.legenda}>
                      {nomeProfessor(a.professorId) ?? 'professor a definir'}
                      {a.historia ? ` — ${a.historia}` : ''}
                    </Text>
                  </View>
                  <Selo rotulo={horaCurta(a.hora)} tom="roxo" />
                  <Icone nome="seta" cor={color.faint} />
                </Card>
              </Pressionavel>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      <Animated.View entering={entrada(1)} style={st.secao}>
        <View style={st.linhaTopo}>
          <Overline>Escala das aulas</Overline>
          <View style={st.contagem}>
            <NumeroAnimado valor={aulas.length} style={st.legenda} />
            <Text style={st.legenda}>{aulas.length === 1 ? ' aula' : ' aulas'}</Text>
          </View>
        </View>
        {aulas.length ? (
          <Grupo>
            {aulas.map((a, i) => {
              const professor = nomeProfessor(a.professorId)
              const completa = !!professor && !!a.historia
              return (
                <Animated.View key={a.id} entering={entrada(i, { base: 65 })}>
                  <Linha
                    titulo={`${rotuloCurto(deISO(a.data))} · ${horaCurta(a.hora)} · ${NOME_TURMA[a.turma]}${variasUnidades ? ` · ${nomeUnidade(a.unidadeId)}` : ''}`}
                    legenda={`${professor ?? 'professor a definir'} — ${a.historia ?? 'história a definir'}`}
                    legendaTom={completa ? undefined : 'ambar'}
                    selo={a.historia ? undefined : { rotulo: 'sem conteúdo', tom: 'ambar' }}
                    onPress={() => abrir(a.id, completa)}
                  />
                </Animated.View>
              )
            })}
          </Grupo>
        ) : (
          <Card>
            <Text style={st.legenda}>
              Nenhuma aula marcada daqui para frente. Marque a próxima no botão abaixo.
            </Text>
          </Card>
        )}
      </Animated.View>

      {semProfessor.length ? (
        <Animated.View entering={entrada(2)}>
          <Pressionavel
            onPress={() =>
              router.push({
                pathname: '/estudo/definir-aula',
                params: { id: semProfessor[0].id },
              })
            }
            accessibilityRole="button">
            <Card style={st.cardAlerta}>
              <View style={st.acentoAviso} />
              <View style={st.linhaTexto}>
                <View style={st.contagem}>
                  <NumeroAnimado valor={semProfessor.length} style={st.linhaNome} />
                  <Text style={st.linhaNome}>
                    {semProfessor.length === 1 ? ' aula sem professor' : ' aulas sem professor'}
                  </Text>
                </View>
                <Text style={st.legenda}>{semProfessor.map((a) => diaMes(a.data)).join(', ')}</Text>
              </View>
              <Icone nome="seta" cor={color.faint} />
            </Card>
          </Pressionavel>
        </Animated.View>
      ) : null}

      <Animated.View entering={entrada(3)}>
        <Botao
          variante="secundario"
          rotulo="Marcar aula"
          onPress={() => router.push('/estudo/definir-aula')}
        />
      </Animated.View>
    </>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
  secao: { gap: space.md },

  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.danger },
  legendaFraca: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.faint },
  linhaNome: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaTexto: { flex: 1, gap: 2 },
  contagem: { flexDirection: 'row', alignItems: 'center' },

  linhaLivro: {
    minHeight: target.minimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },

  cardAula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  cardAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    overflow: 'hidden',
  },
  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: onDark.fill,
  },
  acentoAviso: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
  radius: { borderRadius: radius.card },
})
