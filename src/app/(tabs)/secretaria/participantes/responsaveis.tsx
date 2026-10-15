import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, Rotulo, Selo, TelaForm } from '@/components/ui/form'
import { rascunhoFicha } from '@/data/rascunhos'
import { color, space, type } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Telas 17d e 17d2. Mae e pai, cada um com o seu numero, e UM deles e o
 * numero principal — quase sempre o da mae. E dele que saem a convocacao
 * e a cobranca, e e o unico que o professor ve. Um contato ja serve: a
 * ficha existe para a coordenacao achar alguem, nao para exigir
 * formulario completo antes da crianca poder treinar.
 */
export default function Responsaveis() {
  const ficha = rascunhoFicha.useValor()
  const [principal, segundo] = ficha.contatos

  const abrir = (indice: number) => {
    rascunhoFicha.definir({ editando: indice })
    router.push('/secretaria/participantes/contato')
  }

  return (
    <TelaForm
      titulo="Responsáveis"
      subtitulo={`${ficha.nome || 'Nova ficha'} · ${ficha.contatos.length} de 2`}
      rodape={<Botao rotulo="Salvar responsáveis" onPress={() => voltar()} />}>
      <Bloco>
        <Rotulo>{principal?.relacao ?? 'Mãe'}</Rotulo>
        <Grupo>
          {principal ? (
            <Linha
              titulo={principal.nome}
              legenda={principal.telefone}
              selo={{ rotulo: principal.relacao.toLowerCase() }}
              direita={
                <View style={st.selos}>
                  {principal.whatsapp ? <Selo rotulo="WhatsApp" tom="verde" /> : null}
                  {principal.principal ? <Selo rotulo="principal" tom="ambar" /> : null}
                </View>
              }
              onPress={() => abrir(0)}
            />
          ) : (
            <Linha
              titulo="Adicionar a mãe"
              legenda="Ou quem é o responsável principal"
              onPress={() => abrir(0)}
            />
          )}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>{segundo?.relacao ?? 'Pai'}</Rotulo>
        <Grupo>
          {segundo ? (
            <Linha
              titulo={segundo.nome}
              legenda={segundo.telefone}
              selo={{ rotulo: segundo.relacao.toLowerCase() }}
              direita={
                <View style={st.selos}>
                  {segundo.whatsapp ? <Selo rotulo="WhatsApp" tom="verde" /> : null}
                  {segundo.principal ? <Selo rotulo="principal" tom="ambar" /> : null}
                </View>
              }
              onPress={() => abrir(1)}
            />
          ) : (
            <Linha
              titulo="Adicionar o pai"
              legenda="Opcional. Ou avó, ou quem busca a criança"
              onPress={() => abrir(1)}
            />
          )}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Aviso
          titulo="Um número é o principal"
          texto="Dele saem a convocação e a cobrança de livro, e é o único que o professor consegue ver."
        />
        <Text style={st.nota} />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  selos: { flexDirection: 'row', gap: space.xs },
  nota: { ...type.caption, color: color.faint },
})
