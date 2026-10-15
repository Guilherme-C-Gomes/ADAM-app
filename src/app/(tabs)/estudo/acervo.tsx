import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Busca, Grupo, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { disponiveis, rascunhoLivro, useBiblioteca } from '@/data/estudo'
import { color, radius, space, target, type } from '@/theme/tokens'

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
            rascunhoLivro.definir({ tipo: '', capaUri: undefined })
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
        <Rotulo extra={`${visiveis.length} de ${livros.length}`}>Títulos</Rotulo>
        {carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : visiveis.length ? (
          <Grupo>
            {visiveis.map((l) => {
              const livres = disponiveis(l, emprestimos)
              return (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    // a ficha do livro parte do que esta no banco
                    rascunhoLivro.definir({ tipo: '', capaUri: undefined })
                    router.push({ pathname: '/estudo/livro/[id]', params: { id: l.id } })
                  }}
                  style={({ pressed }) => [st.linha, pressed && st.pressed]}
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
                </Pressable>
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
  pressed: { opacity: 0.7 },
  radius: { borderRadius: radius.card },
})
