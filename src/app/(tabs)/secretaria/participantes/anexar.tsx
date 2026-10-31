import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { DOCUMENTOS } from '@/data/fichas'
import { rascunhoFicha, type Anexo } from '@/data/rascunhos'
import { color, radius, space, type } from '@/theme/tokens'
import { arquivoGuardavel } from '@/lib/arquivo-guardavel'
import { voltar } from '@/lib/navegacao'

/** Tela 17g. Foto do papel serve: a familia raramente tem digitalizado. */
export default function AnexarDocumento() {
  const { doc = '0' } = useLocalSearchParams<{ doc?: string }>()
  const ficha = rascunhoFicha.useValor()
  const indice = Number(doc)
  const documento = DOCUMENTOS[indice] ?? DOCUMENTOS[0]
  const entregue = ficha.documentos.includes(indice)

  const [anexo, setAnexo] = useState<Anexo | null>(ficha.anexos[indice] ?? null)

  const daCamera = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync()
    if (!permissao.granted) return
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!r.canceled && r.assets[0])
      setAnexo({
        nome: 'foto-do-documento.jpg',
        uri: await arquivoGuardavel(r.assets[0].uri),
        tipo: 'image/jpeg',
      })
  }

  const daGaleria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 })
    if (!r.canceled && r.assets[0])
      setAnexo({
        nome: r.assets[0].fileName ?? 'foto.jpg',
        uri: await arquivoGuardavel(r.assets[0].uri),
        tipo: r.assets[0].mimeType ?? 'image/jpeg',
      })
  }

  const doArquivo = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] })
    const arquivo = r.assets?.[0]
    if (arquivo) {
      setAnexo({
        nome: arquivo.name,
        uri: await arquivoGuardavel(arquivo.uri),
        tipo: arquivo.mimeType,
      })
    }
  }

  // O arquivo so sobe para o banco no "Salvar ficha"; aqui ele entra no
  // rascunho junto com a marca de entregue.
  const marcarEntregue = (comArquivo: Anexo | null) => {
    const anexos = { ...ficha.anexos }
    if (comArquivo) anexos[indice] = comArquivo
    rascunhoFicha.definir({
      documentos: entregue ? ficha.documentos : [...ficha.documentos, indice],
      anexos,
    })
    voltar()
  }

  const marcarPendente = () => {
    const anexos = { ...ficha.anexos }
    delete anexos[indice]
    rascunhoFicha.definir({ documentos: ficha.documentos.filter((d) => d !== indice), anexos })
    voltar()
  }

  return (
    <TelaForm
      titulo="Anexar documento"
      subtitulo={`${documento.nome} · ${ficha.nome || 'nova ficha'}`}
      rodape={
        <Botao
          rotulo="Salvar documento"
          desabilitado={!anexo}
          onPress={() => marcarEntregue(anexo)}
        />
      }>
      <Bloco>
        <View style={st.previa}>
          {anexo?.uri ? (
            <Image source={{ uri: anexo.uri }} style={st.imagem} contentFit="cover" />
          ) : (
            <>
              <Icone nome="documento" cor={color.muted} tamanho={32} />
              <Text style={st.titulo}>{anexo ? anexo.nome : 'Nenhum arquivo anexado'}</Text>
              <Text style={st.legenda}>
                {anexo ? 'Pronto para salvar na ficha' : 'Anexe uma foto do papel ou um PDF'}
              </Text>
            </>
          )}
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Anexar de</Rotulo>
        <Grupo>
          <Linha
            titulo="Tirar foto do documento"
            legenda="Abre a câmera do celular"
            esquerda={<Icone nome="camera" cor={color.primaryCh} />}
            onPress={daCamera}
          />
          <Linha
            titulo="Escolher da galeria"
            legenda="Abre as fotos do aparelho"
            esquerda={<Icone nome="galeria" cor={color.primaryCh} />}
            onPress={daGaleria}
          />
          <Linha
            titulo="Escolher arquivo"
            legenda="PDF que já esteja no aparelho"
            esquerda={<Icone nome="documento" cor={color.primaryCh} />}
            onPress={doArquivo}
          />
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Grupo>
          {entregue ? (
            <Linha
              titulo="Marcar como pendente"
              legenda="O documento volta para a lista do que falta"
              perigo
              onPress={marcarPendente}
            />
          ) : (
            <Linha
              titulo="Entregue em papel, sem arquivo"
              legenda="Marca como entregue sem anexar nada"
              onPress={() => marcarEntregue(null)}
            />
          )}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Aviso
          titulo="JPG, PNG ou PDF, até 10 MB"
          texto="Fica guardado na ficha, e só a Secretaria abre."
        />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  previa: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  imagem: { width: '100%', height: 190, borderRadius: radius.campo },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    textAlign: 'center',
  },
})
