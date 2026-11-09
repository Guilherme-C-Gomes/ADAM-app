import * as DocumentPicker from 'expo-document-picker'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, Link, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { DOCUMENTOS } from '@/data/fichas'
import { anexosDe, rascunhoFicha, type Anexo } from '@/data/rascunhos'
import { color, radius, space, type } from '@/theme/tokens'
import { arquivoGuardavel } from '@/lib/arquivo-guardavel'
import { escolherDaGaleria, tirarFoto } from '@/lib/imagem'
import { supabase } from '@/lib/supabase'
import { voltar } from '@/lib/navegacao'

const ehPdf = (a: Anexo) => a.tipo === 'application/pdf' || a.nome.toLowerCase().endsWith('.pdf')

/**
 * Tela 17g. Foto do papel serve: a familia raramente tem digitalizado. Um
 * documento aceita mais de um arquivo (o RG tem frente e verso), e os que
 * ja estao guardados aparecem aqui — editar a ficha nao perde nada.
 *
 * Cada arquivo entra direto no rascunho (e o documento fica entregue): se a
 * pagina recarregar ao voltar da camera, o que ja foi anexado continua.
 */
export default function AnexarDocumento() {
  const { doc = '0' } = useLocalSearchParams<{ doc?: string }>()
  const ficha = rascunhoFicha.useValor()
  const indice = Number(doc)
  const documento = DOCUMENTOS[indice] ?? DOCUMENTOS[0]
  const entregue = ficha.documentos.includes(indice)
  const arquivos = anexosDe(ficha.anexos[indice])
  const ehRg = documento.tipo === 'rg_certidao'
  const urls = useEnderecos(arquivos)

  const gravar = (lista: Anexo[], marcarEntregue: boolean) => {
    const atual = rascunhoFicha.ler()
    rascunhoFicha.definir({
      anexos: { ...atual.anexos, [indice]: lista },
      documentos:
        marcarEntregue && !atual.documentos.includes(indice)
          ? [...atual.documentos, indice]
          : atual.documentos,
    })
  }
  const adicionar = (novo: Anexo) =>
    gravar([...anexosDe(rascunhoFicha.ler().anexos[indice]), novo], true)

  // tirarFoto / escolherDaGaleria (lib/imagem.ts): na web abrem a camera e a
  // galeria de verdade (o seletor do Expo abria os arquivos no Android) e a
  // foto ja vem reduzida e guardavel
  const daCamera = async () => {
    const foto = await tirarFoto()
    if (foto) {
      adicionar({ nome: `foto-${arquivos.length + 1}.jpg`, uri: foto.uri, tipo: foto.tipo })
    }
  }

  const daGaleria = async () => {
    const foto = await escolherDaGaleria()
    if (foto) adicionar({ nome: foto.nome, uri: await arquivoGuardavel(foto.uri), tipo: foto.tipo })
  }

  const doArquivo = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] })
    const arquivo = r.assets?.[0]
    if (arquivo) {
      adicionar({
        nome: arquivo.name,
        uri: await arquivoGuardavel(arquivo.uri),
        tipo: arquivo.mimeType,
      })
    }
  }

  // tirar um arquivo: o que ja estava guardado sai do bucket so no "Salvar"
  const tirar = (n: number) => {
    const alvo = arquivos[n]
    if (alvo?.path) {
      const atual = rascunhoFicha.ler()
      rascunhoFicha.definir({
        arquivosRemovidos: [...(atual.arquivosRemovidos ?? []), alvo.path],
      })
    }
    gravar(
      arquivos.filter((_, i) => i !== n),
      false,
    )
  }

  // pendente: so sai da lista de entregues; os arquivos guardados ficam
  // (voltam se o documento for marcado de novo)
  const marcarPendente = () => {
    const atual = rascunhoFicha.ler()
    rascunhoFicha.definir({
      documentos: atual.documentos.filter((d) => d !== indice),
      anexos: { ...atual.anexos, [indice]: arquivos.filter((a) => a.path) },
    })
    voltar()
  }

  const marcarEntregue = () => {
    gravar(arquivos, true)
    voltar()
  }

  return (
    <TelaForm
      titulo="Anexar documento"
      subtitulo={`${documento.nome} · ${ficha.nome || 'nova ficha'}`}
      rodape={<Botao rotulo="Pronto" onPress={() => voltar()} />}>
      {ehRg ? (
        <Bloco>
          <Aviso
            tom="roxo"
            titulo="Frente e verso"
            texto="Tire uma foto de cada lado. Dá para anexar quantas precisar."
          />
        </Bloco>
      ) : null}

      <Bloco ordem={1}>
        {arquivos.length ? (
          <View style={st.lista}>
            {arquivos.map((a, n) => {
              const endereco = a.uri ?? (a.path ? urls[a.path] : undefined)
              return (
                <View key={`${a.path ?? a.uri ?? a.nome}-${n}`} style={st.item}>
                  {endereco && !ehPdf(a) ? (
                    <Image source={{ uri: endereco }} style={st.imagem} contentFit="cover" />
                  ) : (
                    <View style={st.previa}>
                      <Icone nome="documento" cor={color.muted} tamanho={28} />
                      <Text style={st.titulo} numberOfLines={1}>
                        {a.nome}
                      </Text>
                    </View>
                  )}
                  <View style={st.itemRodape}>
                    <Text style={st.legenda}>
                      {ehRg && arquivos.length > 1
                        ? n === 0
                          ? 'Frente'
                          : n === 1
                            ? 'Verso'
                            : `Arquivo ${n + 1}`
                        : `Arquivo ${n + 1}`}
                      {a.path ? ' · guardado na ficha' : ' · sobe ao salvar'}
                    </Text>
                    <Link rotulo="Tirar" onPress={() => tirar(n)} />
                  </View>
                </View>
              )
            })}
          </View>
        ) : (
          <View style={st.previa}>
            <Icone nome="documento" cor={color.muted} tamanho={32} />
            <Text style={st.titulo}>Nenhum arquivo anexado</Text>
            <Text style={st.legenda}>Anexe uma foto do papel ou um PDF</Text>
          </View>
        )}
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>{arquivos.length ? 'Anexar mais um' : 'Anexar de'}</Rotulo>
        <Grupo>
          <Linha
            titulo={ehRg ? 'Tirar foto (frente ou verso)' : 'Tirar foto do documento'}
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

      <Bloco ordem={3}>
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
              titulo={arquivos.length ? 'Marcar como entregue' : 'Entregue em papel, sem arquivo'}
              legenda={
                arquivos.length ? 'Com os arquivos acima' : 'Marca como entregue sem anexar nada'
              }
              onPress={marcarEntregue}
            />
          )}
        </Grupo>
      </Bloco>

      <Bloco ordem={4}>
        <Aviso
          titulo="JPG, PNG ou PDF, até 10 MB cada"
          texto="Fica guardado na ficha, e só a Secretaria abre."
        />
      </Bloco>
    </TelaForm>
  )
}

/** Enderecos temporarios (1 hora) dos arquivos ja guardados no bucket privado. */
function useEnderecos(arquivos: Anexo[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const caminhos = arquivos.flatMap((a) => (a.path && !ehPdf(a) ? [a.path] : []))
  const chave = caminhos.join('|')
  useEffect(() => {
    let ativo = true
    const lista = chave ? chave.split('|') : []
    if (!lista.length) return
    supabase.storage
      .from('fichas')
      .createSignedUrls(lista, 3600)
      .then(({ data }) => {
        if (!ativo || !data) return
        setUrls((antes) => {
          const novo = { ...antes }
          for (const d of data) if (d.path && d.signedUrl) novo[d.path] = d.signedUrl
          return novo
        })
      })
    return () => {
      ativo = false
    }
  }, [chave])
  return urls
}

const st = StyleSheet.create({
  lista: { gap: space.md },
  item: { gap: space.xs },
  itemRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
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
    flexShrink: 1,
  },
})
