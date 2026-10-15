import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Barra } from '@/components/ui'
import { Bloco, Botao, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { useUnidades } from '@/data/chamada'
import { DOCUMENTOS } from '@/data/fichas'
import { rascunhoFicha } from '@/data/rascunhos'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Tela 17f. O que falta fica visivel em ambar: documento pendente nao
 * impede a crianca de treinar, mas a Secretaria precisa ver o buraco.
 */
export default function Documentos() {
  const ficha = rascunhoFicha.useValor()
  const unidades = useUnidades()
  const unidade = unidades.dados.find((u) => u.id === ficha.unidadeId)?.nome ?? ''
  const entregues = ficha.documentos.length
  const total = DOCUMENTOS.length
  const faltam = total - entregues

  const exportar = async () => {
    const linhas = DOCUMENTOS.map(
      (d, i) => `<li>${d.nome} — ${ficha.documentos.includes(i) ? 'entregue' : 'pendente'}</li>`,
    ).join('')
    const html = `<html><body style="font-family:sans-serif;padding:32px">
      <h2>Ficha · ${ficha.nome || 'criança'}</h2>
      <p>${unidade} · ${entregues} de ${total} documentos</p>
      <ul>${linhas}</ul></body></html>`
    const { uri } = await Print.printToFileAsync({ html })
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri)
  }

  return (
    <TelaForm
      titulo="Documentos"
      subtitulo={ficha.nome || 'Nova ficha'}
      rodape={<Botao variante="secundario" rotulo="Exportar ficha em PDF" onPress={exportar} />}>
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
                    {entregue ? <Icone nome="check" cor={color.bg} tamanho={14} /> : null}
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
                ? ficha.contatos.map((c) => `${c.relacao.toLowerCase()}, com telefone`).join(' · ')
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
