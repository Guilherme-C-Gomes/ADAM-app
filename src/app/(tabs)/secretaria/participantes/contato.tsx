import { useState } from 'react'
import { Keyboard, StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import {
  Bloco,
  Botao,
  Entrada,
  Grupo,
  Interruptor,
  Linha,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import { rascunhoFicha, type Contato } from '@/data/rascunhos'
import { space } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'
import { digitarTelefone, mascaraTelefone, telefoneCompleto, telefoneValido } from '@/lib/telefone'

/** Tela 17e. Um contato da ficha: mae, pai, avo ou outro. */
const RELACOES: Contato['relacao'][] = ['Mãe', 'Pai', 'Avó', 'Outro']

export default function ContatoDaFicha() {
  const ficha = rascunhoFicha.useValor()
  const indice = ficha.editando
  const atual = ficha.contatos[indice]

  const [nome, setNome] = useState(atual?.nome ?? '')
  const [relacao, setRelacao] = useState<Contato['relacao']>(atual?.relacao ?? 'Mãe')
  const [telefone, setTelefone] = useState(mascaraTelefone(atual?.telefone ?? ''))
  const [whatsapp, setWhatsapp] = useState(atual?.whatsapp ?? true)
  // O primeiro contato nasce principal; so pode haver um por ficha.
  const [principal, setPrincipal] = useState(atual?.principal ?? indice === 0)

  const salvar = () => {
    const novo: Contato = {
      nome: nome.trim(),
      relacao,
      telefone: telefone.trim(),
      whatsapp,
      principal,
    }
    // Marcar este como principal desmarca o outro: um numero principal so.
    const contatos = ficha.contatos.map((c) => (principal ? { ...c, principal: false } : c))
    contatos[indice] = novo
    rascunhoFicha.definir({ contatos: contatos.filter(Boolean) })
    voltar()
  }

  const remover = () => {
    rascunhoFicha.definir({ contatos: ficha.contatos.filter((_, i) => i !== indice) })
    voltar()
  }

  return (
    <TelaForm
      titulo={relacao}
      subtitulo={ficha.nome || 'Nova ficha'}
      rodape={
        <Botao
          rotulo="Salvar contato"
          desabilitado={!nome.trim() || !telefoneValido(telefone)}
          onPress={salvar}
        />
      }>
      <Bloco>
        <Entrada
          rotulo="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Nome do responsável"
        />
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Relação com a criança</Rotulo>
        <View style={st.chips}>
          {RELACOES.map((r) => (
            <Chip key={r} rotulo={r} ativo={relacao === r} onPress={() => setRelacao(r)} />
          ))}
        </View>
      </Bloco>

      <Bloco ordem={2}>
        <Entrada
          rotulo="Telefone"
          icone="telefone"
          value={telefone}
          onChangeText={(t) => {
            const novo = digitarTelefone(telefone, t)
            setTelefone(novo)
            // acabou de completar o numero: o teclado sai da frente sozinho
            if (telefoneCompleto(novo) && !telefoneCompleto(telefone)) Keyboard.dismiss()
          }}
          placeholder="+55 (11) 98765-4321"
          keyboardType="phone-pad"
        />
      </Bloco>

      <Bloco ordem={3}>
        <Grupo>
          <Interruptor
            titulo="É WhatsApp"
            legenda="Dá para mandar mensagem"
            valor={whatsapp}
            onChange={setWhatsapp}
          />
          <Interruptor
            titulo="Número principal"
            legenda="Convocação e cobrança saem por aqui"
            valor={principal}
            onChange={setPrincipal}
          />
        </Grupo>
      </Bloco>

      {atual ? (
        <Bloco ordem={4}>
          <Grupo>
            <Linha
              titulo="Remover este contato"
              legenda="A ficha fica com o responsável que sobrar"
              perigo
              onPress={remover}
            />
          </Grupo>
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
