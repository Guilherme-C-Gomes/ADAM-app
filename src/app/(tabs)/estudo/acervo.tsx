import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Busca, Grupo, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, NumeroAnimado, Pressionavel } from '@/components/ui/movimento'
import { disponiveis, rascunhoLivro, useBiblioteca } from '@/data/estudo'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

/** Tela 13r. O acervo inteiro, filtrado por tipo — R10: o filtro filtra. */
export default function Acervo() {
  const { livros, emprestimos, tipos, carregando, erro } = useBiblioteca()
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<string>('Todos')

  const termo = busca.trim().toLowerCase()
  const visiveis = livros
    .filter((l) => (tipo === 'Todos' ? true : l.tipo === tipo))
    .filter((l) => (termo ? l.titulo.toLowerCase().includes(termo) : true))

  return (
    <TelaForm
      titulo="Acervo"
      subtitulo={`${livros.length} ${livros.length === 1 ? 'título' : 'títulos'} · biblioteca da ADAM`}
      voltarPara="/estudo"
      rodape={
        <Botao
          rotulo="Cadastrar novo título"
          onPress={() => {
            rascunhoLivro.limpar()
            router.push('/estudo/novo-titulo')
          }}
        />
      }>
      <Busca valor={busca} onChange={setBusca} placeholder="Buscar por título" />

      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <View style={st.chips}>
          {['Todos', ...tipos].map((t) => (
            <Chip key={t} rotulo={t} ativo={tipo === t} onPress={() => setTipo(t)} />
          ))}
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <View style={st.cabecalho}>
          <Rotulo>Títulos</Rotulo>
          <View style={st.cabecalhoContagem}>
            <NumeroAnimado valor={visiveis.length} style={st.cabecalhoExtra} />
            <Text style={st.cabecalhoExtra}>{` de ${livros.length}`}</Text>
          </View>
        </View>
        {carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : visiveis.length ? (
          <Grupo>
            {visiveis.map((l, i) => {
              const livres = disponiveis(l, emprestimos)
              // a cascata e da chegada da lista, nao de cada letra da busca
              return (
                <Animated.View key={l.id} entering={termo ? undefined : entrada(i, { base: 40 })}>
                  <Pressionavel
                    onPress={() => {
                      // a ficha do livro parte do que esta no banco
                      rascunhoLivro.limpar()
                      router.push({ pathname: '/estudo/livro/[id]', params: { id: l.id } })
                    }}
                    escala={0.98}
                    opacidade={0.7}
                    style={st.linha}
                    accessibilityRole="button"
                    accessibilityLabel={`${l.titulo}, ${livres} de ${l.exemplares} na estante`}>
                    {l.capaUrl ? (
                      <Image source={{ uri: l.capaUrl }} style={st.capa} contentFit="cover" />
                    ) : (
                      <View style={[st.capa, { backgroundColor: l.cor }]}>
                        <Text style={st.capaLetra}>{l.titulo.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={st.texto}>
                      <Text style={st.titulo} numberOfLines={1}>
                        {l.titulo}
                      </Text>
                      <Text style={st.legenda}>{l.tipo}</Text>
                    </View>
                    <Text style={st.contagem}>
                      {livres} de {l.exemplares}
                    </Text>
                    <Icone nome="seta" cor={color.faint} />
                  </Pressionavel>
                </Animated.View>
              )
            })}
          </Grupo>
        ) : (
          <Aviso
            titulo={livros.length ? 'Nenhum título com esse filtro' : 'O acervo ainda está vazio'}
            texto={
              livros.length
                ? 'Troque o tipo ou limpe a busca.'
                : 'Cadastre os livros da ONG no botão abaixo, contando todos os exemplares.'
            }
          />
        )}
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  linha: {
    minHeight: target.minimo + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  capa: {
    width: 34,
    height: 44,
    borderRadius: 6,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capaLetra: { ...type.body, fontFamily: 'Inter_700Bold', color: color.text },
  texto: { flex: 1, gap: 2 },
  titulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  contagem: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.muted },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cabecalhoContagem: { flexDirection: 'row', alignItems: 'center' },
  cabecalhoExtra: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: onDark.text },
  radius: { borderRadius: radius.card },
})
