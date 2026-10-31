import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native'

import {
  Aviso,
  Bloco,
  Botao,
  Grupo,
  Linha,
  LinhaValor,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import { lerContatos, type Contato } from '@/data/estudo'
import { mascaraCpf } from '@/data/ficha-matricula'
import { digitosComPais, mascaraTelefone } from '@/lib/telefone'
import { color, space } from '@/theme/tokens'

/**
 * O cadastro de um responsavel, so para ler, aberto pela ficha da crianca:
 * parentesco, celular, WhatsApp, documentos de quem assina — e atalhos para
 * ligar e mandar mensagem. Mudar algo e pelo "Editar ficha".
 *
 * `n` e a posicao na lista da ficha (lerContatos, mesma ordem: principal
 * primeiro).
 */
export default function ResponsavelDaCrianca() {
  const { id, n } = useLocalSearchParams<{ id: string; n?: string }>()
  const [estado, setEstado] = useState({
    contato: null as Contato | null,
    carregando: true,
    erro: null as string | null,
  })
  const [vez, setVez] = useState(0)

  useEffect(() => {
    let ativo = true
    if (!id) return
    lerContatos(id, true).then(
      (lista) => {
        if (!ativo) return
        const c = lista[Number(n ?? 0)] ?? null
        setEstado({
          contato: c,
          carregando: false,
          erro: c ? null : 'Responsável não encontrado. Ele pode ter sido removido da ficha.',
        })
      },
      () => {
        if (ativo) {
          setEstado({
            contato: null,
            carregando: false,
            erro: 'Não foi possível abrir o responsável.',
          })
        }
      },
    )
    return () => {
      ativo = false
    }
  }, [id, n, vez])

  const c = estado.contato
  if (!c) {
    return (
      <TelaForm titulo="Responsável" subtitulo={estado.carregando ? 'Abrindo…' : 'Não abriu'}>
        {estado.carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : (
          <Aviso
            tom="ambar"
            titulo={estado.erro ?? 'Não foi possível abrir o responsável.'}
            texto="Toque para tentar de novo"
            onPress={() => {
              setEstado({ contato: null, carregando: true, erro: null })
              setVez((v) => v + 1)
            }}
          />
        )}
      </TelaForm>
    )
  }

  const celular = mascaraTelefone(c.telefone)
  const documentos = [
    c.rg ? `RG ${c.rg}${c.rg_orgao ? ` (${c.rg_orgao})` : ''}` : '',
    c.cpf ? `CPF ${mascaraCpf(c.cpf)}` : '',
  ].filter(Boolean)

  return (
    <TelaForm
      titulo={c.nome}
      subtitulo={c.relacao ? c.relacao.charAt(0).toUpperCase() + c.relacao.slice(1) : 'Responsável'}
      rodape={
        <View style={st.botoes}>
          <Botao
            rotulo="Ligar"
            variante="secundario"
            onPress={() => Linking.openURL(`tel:+${digitosComPais(c.telefone)}`)}
          />
          {c.whatsapp ? (
            <Botao
              rotulo="Mandar WhatsApp"
              onPress={() => Linking.openURL(`https://wa.me/${digitosComPais(c.telefone)}`)}
            />
          ) : null}
        </View>
      }>
      <Bloco>
        <Rotulo>Contato</Rotulo>
        <Grupo>
          <LinhaValor rotulo="Parentesco" valor={c.relacao || '—'} />
          <LinhaValor rotulo="Celular" valor={celular || '—'} />
          <LinhaValor rotulo="WhatsApp" valor={c.whatsapp ? 'Sim' : 'Não'} />
          <LinhaValor rotulo="Número principal" valor={c.principal ? 'Sim' : 'Não'} />
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Documentos de quem assina a ficha</Rotulo>
        <Grupo>
          <LinhaValor rotulo="RG" valor={c.rg || 'não informado'} />
          <LinhaValor rotulo="Órgão expedidor" valor={c.rg_orgao || 'não informado'} />
          <LinhaValor rotulo="CPF" valor={c.cpf ? mascaraCpf(c.cpf) : 'não informado'} />
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Grupo>
          <Linha
            titulo="Editar cadastro"
            legenda={
              documentos.length
                ? 'Mudar telefone, parentesco ou documentos'
                : 'Falta RG e CPF: dá para preencher na ficha'
            }
            onPress={() =>
              router.push({ pathname: '/secretaria/participantes/cadastrar', params: { id } })
            }
          />
        </Grupo>
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  botoes: { gap: space.sm },
})
