import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Barra } from '@/components/ui'
import { Aviso, Bloco, Botao, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { useUnidades } from '@/data/chamada'
import { DOCUMENTOS, novaFicha, salvarFicha } from '@/data/fichas'
import { rascunhoFicha } from '@/data/rascunhos'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Tela 17f. O que falta fica visivel em ambar: documento pendente nao
 * impede a crianca de treinar, mas a Secretaria precisa ver o buraco.
 *
 * "Salvar" grava a ficha inteira daqui mesmo, com documentos e responsaveis
 * faltando: o que falta fica pendente e entra depois, editando a ficha.
 */
export default function Documentos() {
  const ficha = rascunhoFicha.useValor()
  const unidades = useUnidades()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const entregues = ficha.documentos.length
  const total = DOCUMENTOS.length
  const faltam = total - entregues

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      // a unidade padrao e a primeira, como na ficha
      const unidadeId = ficha.unidadeId ?? unidades.dados[0]?.id ?? null
      if (!ficha.unidadeId && unidadeId) rascunhoFicha.definir({ unidadeId })
      await salvarFicha()
      novaFicha()
      mostrarRecado(ficha.id ? 'Ficha salva' : 'Criança cadastrada')
      // fecha os documentos e a ficha: volta para onde a ficha foi aberta
      if (router.canDismiss()) router.dismiss(2)
      else voltar('/secretaria/participantes')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a ficha.')
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo="Documentos"
      subtitulo={ficha.nome || 'Nova ficha'}
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Salvar'}
          desabilitado={salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} texto="Confira a ficha e tente de novo" />
        </Bloco>
      ) : null}
      <Bloco>
        <View style={st.progresso}>
          <View style={st.linhaTopo}>
            <Text style={st.titulo}>Documentos da ficha</Text>
            <Text style={st.contagem}>
              {entregues} de {total}
            </Text>
          </View>
          <Barra pct={(entregues / total) * 100} cor={faltam ? color.warn : color.success} />
          <Text style={faltam ? st.legendaAviso : st.legenda}>
            {faltam ? `${faltam} pendentes: podem vir na ficha e na escola` : 'Ficha completa'}
          </Text>
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Itens da ficha</Rotulo>
        <Grupo>
          {DOCUMENTOS.map((d, i) => {
            const entregue = ficha.documentos.includes(i)
            const anexo = ficha.anexos[i]
            return (
              <Linha
                key={d.nome}
                titulo={d.nome}
                legenda={
                  entregue ? (anexo ? `${anexo.nome} · sobe ao salvar` : 'entregue') : 'pendente'
                }
                legendaTom={entregue ? undefined : 'ambar'}
                esquerda={
                  <View style={[st.marca, entregue && st.marcaOk]}>
                    {entregue ? <Icone nome="check" cor={color.onPrimary} tamanho={14} /> : null}
                  </View>
                }
                onPress={() =>
                  router.push({
                    pathname: '/secretaria/participantes/anexar',
                    params: { doc: String(i) },
                  })
                }
              />
            )
          })}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Contato</Rotulo>
        <Grupo>
          <Linha
            titulo="Responsáveis"
            legenda={
              ficha.contatos.length
                ? ficha.contatos
                    .map((c) => `${c.parentesco.toLowerCase() || 'responsável'}, com telefone`)
                    .join(' · ')
                : 'Nenhum contato na ficha ainda'
            }
            selo={{
              rotulo: `${ficha.contatos.length} de 2`,
              tom: ficha.contatos.length ? 'roxo' : 'ambar',
            }}
            onPress={() => router.push('/secretaria/participantes/responsaveis')}
          />
        </Grupo>
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  progresso: {
    padding: space.base,
    gap: space.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  contagem: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  legendaAviso: { ...type.small, fontFamily: 'Inter_400Regular', color: color.warn },
  marca: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaOk: { backgroundColor: color.success, borderColor: color.success },
})
