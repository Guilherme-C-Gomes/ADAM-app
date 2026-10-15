import { Image } from 'expo-image'
import type { Href } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Telas 13q (capa do livro), 17c (foto da crianca) e a foto de quem esta
 * logado: a mesma escolha.
 *
 * A foto fica no aparelho e sobe com a ficha; nada de imagem de
 * crianca saindo para servico de terceiro sem autorizacao assinada.
 */
export function EscolherFoto({
  titulo,
  subtitulo,
  uri,
  vazio,
  nota,
  legendas = ['É assim que ela aparece na lista', 'Como vai aparecer na lista'],
  voltarPara,
  extra,
  onEscolher,
  onRemover,
  rodape,
}: {
  titulo: string
  subtitulo: string
  uri?: string
  /** Letra ou iniciais desenhadas quando ainda nao ha foto. */
  vazio: string
  nota: string
  /** [com foto, sem foto] */
  legendas?: [string, string]
  voltarPara?: Href
  /** um aviso acima da foto (erro ao salvar, por exemplo) */
  extra?: React.ReactNode
  onEscolher: (uri: string) => void
  onRemover: () => void
  rodape?: React.ReactNode
}) {
  const daCamera = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync()
    if (!permissao.granted) return
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
    if (!r.canceled && r.assets[0]) onEscolher(r.assets[0].uri)
  }

  const daGaleria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true })
    if (!r.canceled && r.assets[0]) onEscolher(r.assets[0].uri)
  }

  return (
    <TelaForm titulo={titulo} subtitulo={subtitulo} rodape={rodape} voltarPara={voltarPara}>
      {extra}
      <Bloco>
        <View style={st.previa}>
          {uri ? (
            <Image source={{ uri }} style={st.foto} contentFit="cover" />
          ) : (
            <View style={[st.foto, st.fotoVazia]}>
              <Text style={st.iniciais}>{vazio}</Text>
            </View>
          )}
          <Text style={st.legenda}>{uri ? legendas[0] : legendas[1]}</Text>
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Grupo>
          {[
            <Linha
              key="camera"
              titulo="Tirar foto"
              legenda="Abre a câmera do celular"
              esquerda={<Icone nome="camera" cor={color.primaryCh} />}
              onPress={daCamera}
            />,
            <Linha
              key="galeria"
              titulo="Escolher da galeria"
              legenda="Abre as fotos do aparelho"
              esquerda={<Icone nome="galeria" cor={color.primaryCh} />}
              onPress={daGaleria}
            />,
            uri ? (
              <Linha
                key="remover"
                titulo="Remover foto"
                legenda="Volta a mostrar as iniciais"
                esquerda={<Icone nome="fechar" cor={color.danger} />}
                perigo
                onPress={onRemover}
              />
            ) : null,
          ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Aviso titulo={nota} />
      </Bloco>
    </TelaForm>
  )
}

/** Botao de salvar padrao das duas telas de foto. */
export function BotaoFoto({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return <Botao rotulo={rotulo} onPress={onPress} />
}

const st = StyleSheet.create({
  previa: { alignItems: 'center', gap: space.md, paddingVertical: space.base },
  foto: { width: 132, height: 132, borderRadius: 66 },
  fotoVazia: {
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border,
  },
  iniciais: { fontSize: 40, fontFamily: 'Inter_700Bold', color: color.muted },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  radius: { borderRadius: radius.card },
})
