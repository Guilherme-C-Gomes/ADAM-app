import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Barra } from '@/components/ui'
import { Aviso, Bloco, Botao, Entrada, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { disponiveis, rascunhoLivro, salvarLivro, useBiblioteca, type Livro } from '@/data/estudo'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Telas 13j (novo titulo) e 13k (livro do acervo): o mesmo formulario,
 * gravando no banco. Exemplares e contagem fisica — e por ela que a estante
 * fecha, por isso nao da para ter menos exemplares que os emprestados.
 */
export function LivroForm({
  livro,
  fim,
}: {
  livro?: Livro
  /** o que vem depois do formulario (ex.: o excluir da tela 13k) */
  fim?: React.ReactNode
}) {
  const escolha = rascunhoLivro.useValor()
  const { emprestimos } = useBiblioteca()

  const [titulo, setTitulo] = useState(livro?.titulo ?? '')
  const [exemplares, setExemplares] = useState(livro?.exemplares ?? 1)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const tipo = escolha.tipo || livro?.tipo || ''
  const capa = escolha.capaUri ?? livro?.capaUrl ?? undefined
  const emprestados = livro ? livro.exemplares - disponiveis(livro, emprestimos) : 0
  const naEstante = exemplares - emprestados
  const minimo = Math.max(1, emprestados)

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      await salvarLivro({
        id: livro?.id,
        titulo,
        tipo,
        exemplares,
        capaUri: escolha.capaUri,
        capaAntiga: livro?.capaPath,
      })
      rascunhoLivro.definir({ tipo: '', capaUri: undefined })
      mostrarRecado(livro ? 'Livro salvo' : 'Título cadastrado no acervo')
      voltar('/estudo/acervo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o livro.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo={livro ? livro.titulo : 'Novo título'}
      subtitulo={livro ? 'Acervo da biblioteca' : 'Entra no acervo'}
      voltarPara="/estudo/acervo"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : livro ? 'Salvar alterações' : 'Salvar título'}
          desabilitado={!titulo.trim() || !tipo || salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Pressable
          onPress={() => router.push('/estudo/capa')}
          style={({ pressed }) => [st.capaLinha, pressed && st.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Capa do livro">
          {capa ? (
            <Image source={{ uri: capa }} style={st.capa} contentFit="cover" />
          ) : (
            <View style={[st.capa, st.capaVazia]}>
              <Text style={st.capaLetra}>{(titulo || 'A').charAt(0)}</Text>
            </View>
          )}
          <View style={st.texto}>
            <Text style={st.titulo}>Capa do livro</Text>
            <Text style={st.link}>
              {capa ? 'Toque para trocar a foto' : 'Tirar ou escolher foto'}
            </Text>
          </View>
          <Icone nome="seta" cor={color.faint} />
        </Pressable>
      </Bloco>

      <Bloco ordem={1}>
        <Entrada
          rotulo="Título do livro"
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Título do livro"
        />
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Exemplares</Rotulo>
        <View style={st.contador}>
          <Text style={st.contadorValor}>{exemplares}</Text>
          <Text style={st.legenda}>na ONG</Text>
          <Passo rotulo="−" onPress={() => setExemplares((n) => Math.max(minimo, n - 1))} />
          <Passo rotulo="+" onPress={() => setExemplares((n) => n + 1)} />
        </View>
        {emprestados && exemplares === minimo ? (
          <Text style={st.legenda}>
            {emprestados} {emprestados === 1 ? 'está emprestado' : 'estão emprestados'}: não dá para
            contar menos que isso
          </Text>
        ) : null}
      </Bloco>

      <Bloco ordem={3}>
        <Grupo>
          <Linha
            titulo="Tipo do livro"
            legenda="Como se procura"
            legendaTom={tipo ? undefined : 'ambar'}
            selo={{ rotulo: tipo || 'escolher', tom: tipo ? 'roxo' : 'ambar' }}
            onPress={() => {
              if (!escolha.tipo && livro) rascunhoLivro.definir({ tipo: livro.tipo })
              router.push('/estudo/tipo-livro')
            }}
          />
        </Grupo>
      </Bloco>

      {livro ? (
        <Bloco ordem={4}>
          <View style={st.estante}>
            <View style={st.linhaTopo}>
              <Text style={st.titulo}>Na estante agora</Text>
              <Text style={st.contagem}>
                {naEstante} de {exemplares}
              </Text>
            </View>
            <Barra pct={(naEstante / exemplares) * 100} />
            <Text style={st.legenda}>
              {emprestados
                ? `${emprestados} ${emprestados === 1 ? 'emprestado' : 'emprestados'}`
                : 'Nenhum emprestado'}
            </Text>
          </View>
        </Bloco>
      ) : (
        <Bloco ordem={4}>
          <Aviso
            titulo="Conte todos os exemplares"
            texto={`Se vierem dois iguais de doação, são ${exemplares + 1}: a estante fecha pela contagem.`}
          />
        </Bloco>
      )}

      {fim}
    </TelaForm>
  )
}

function Passo({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.passo, pressed && st.pressed]}
      accessibilityRole="button"
      accessibilityLabel={rotulo === '+' ? 'Mais um exemplar' : 'Menos um exemplar'}>
      <Icone nome={rotulo === '+' ? 'mais' : 'menos'} cor={color.text} />
    </Pressable>
  )
}

const st = StyleSheet.create({
  capaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  capa: { width: 42, height: 54, borderRadius: 6, borderCurve: 'continuous' },
  capaVazia: { backgroundColor: color.primaryDk, alignItems: 'center', justifyContent: 'center' },
  capaLetra: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.primaryCh },
  texto: { flex: 1, gap: 2 },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  pressed: { opacity: 0.8 },

  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    paddingLeft: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  contadorValor: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.text },
  passo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
  },

  estante: {
    padding: space.base,
    gap: space.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contagem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
})
