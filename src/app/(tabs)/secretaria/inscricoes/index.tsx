import * as Clipboard from 'expo-clipboard'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Grupo, Linha, Link, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { Segmentado } from '@/components/ui/setor'
import { idadeDe, paraBR } from '@/data/fichas'
import {
  contarPendentes,
  LINK_INSCRICAO,
  useInscricoes,
  type StatusInscricao,
} from '@/data/inscricoes'
import { color, space, type } from '@/theme/tokens'

/**
 * Inscricoes pelo link: as fichas que as familias mandaram pelo formulario
 * publico. "Novas" esperam a Secretaria conferir e cadastrar.
 */
const ABAS = ['Novas', 'Cadastradas', 'Recusadas'] as const
const STATUS: Record<(typeof ABAS)[number], StatusInscricao> = {
  Novas: 'pendente',
  Cadastradas: 'aprovada',
  Recusadas: 'recusada',
}

export default function Inscricoes() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>('Novas')
  const { lista, carregando, erro, recarregar } = useInscricoes(STATUS[aba])

  // voltar de uma inscricao cadastrada ou recusada traz a lista nova (e o
  // numero da barra de menu)
  useFocusEffect(
    useCallback(() => {
      recarregar()
      contarPendentes()
    }, [recarregar]),
  )

  const copiar = async () => {
    await Clipboard.setStringAsync(LINK_INSCRICAO)
    mostrarRecado('Link copiado')
  }

  return (
    <TelaForm titulo="Inscrições pelo link" subtitulo="Fichas que as famílias enviaram">
      <Bloco>
        <View style={st.link}>
          <Text style={st.linkRotulo}>Link para as famílias</Text>
          <Text style={st.linkValor} selectable>
            {LINK_INSCRICAO.replace('https://', '')}
          </Text>
          <Text style={st.legenda}>
            A família preenche pelo celular e assina (gov.br ou na tela). A criança só entra na ADAM
            quando você cadastra aqui.
          </Text>
          <Link rotulo="Copiar link" onPress={copiar} />
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Segmentado opcoes={ABAS} valor={aba} onChange={setAba} />
      </Bloco>

      <Bloco ordem={2}>
        {carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : erro ? (
          <Aviso tom="ambar" titulo={erro} texto="Toque para tentar de novo" onPress={recarregar} />
        ) : !lista.length ? (
          <Aviso
            titulo={
              aba === 'Novas'
                ? 'Nenhuma inscrição nova'
                : aba === 'Cadastradas'
                  ? 'Nenhuma inscrição cadastrada ainda'
                  : 'Nenhuma inscrição recusada'
            }
            texto={
              aba === 'Novas' ? 'Quando uma família enviar a ficha, ela aparece aqui.' : undefined
            }
          />
        ) : (
          <Grupo>
            {lista.map((i) => (
              <Linha
                key={i.id}
                titulo={i.criancaNome}
                legenda={`${idadeDe(i.nascimento)} anos · ${i.unidade || 'sem unidade'} · enviada em ${paraBR(i.criadoEm.slice(0, 10))}`}
                selo={
                  i.assinaturaTipo === 'govbr'
                    ? { rotulo: 'gov.br', tom: i.assinaturaReconhecida ? 'verde' : 'ambar' }
                    : { rotulo: 'assinou na tela', tom: 'neutro' }
                }
                onPress={() => router.push(`/secretaria/inscricoes/${i.id}`)}
              />
            ))}
          </Grupo>
        )}
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  link: {
    gap: space.xs,
    padding: space.base,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linkRotulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted },
  linkValor: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.primaryLt },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
})
