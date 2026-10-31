import { useState } from 'react'
import { Keyboard, StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import {
  Bloco,
  Botao,
  CampoSeletor,
  Entrada,
  Grupo,
  Interruptor,
  Linha,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import { mascaraCpf } from '@/data/ficha-matricula'
import { rascunhoFicha, type Contato } from '@/data/rascunhos'
import { space } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'
import { digitarTelefone, mascaraTelefone, telefoneCompleto, telefoneValido } from '@/lib/telefone'

/**
 * Tela 17e. Um responsavel da ficha (Responsavel 1 ou 2), com o parentesco
 * escrito. Os atalhos so preenchem o campo: tia, padrasto ou vizinha se
 * escreve.
 */
const ATALHOS = ['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio']

/**
 * Orgao expedidor do RG: ja vem SSP/SP (quase todo mundo e de Sao Paulo);
 * tocando no campo abre a lista, e "Outro" deixa escrever.
 */
const ORGAO_PADRAO = 'SSP/SP'
const ORGAOS = [
  'SSP/SP',
  'SSP/MG',
  'SSP/RJ',
  'SSP/PR',
  'SSP/BA',
  'SSP/PE',
  'SSP/CE',
  'SSP/GO',
  'SSP/DF',
  'DETRAN',
  'PC',
]

export default function ContatoDaFicha() {
  const ficha = rascunhoFicha.useValor()
  const indice = ficha.editando
  const atual = ficha.contatos[indice]

  const [nome, setNome] = useState(atual?.nome ?? '')
  const [parentesco, setParentesco] = useState(atual?.parentesco ?? '')
  const [telefone, setTelefone] = useState(mascaraTelefone(atual?.telefone ?? ''))
  const [whatsapp, setWhatsapp] = useState(atual?.whatsapp ?? true)
  const [cpf, setCpf] = useState(mascaraCpf(atual?.cpf ?? ''))
  const [rg, setRg] = useState(atual?.rg ?? '')
  const [rgOrgao, setRgOrgao] = useState(atual?.rgOrgao || ORGAO_PADRAO)
  // a lista de orgaos aberta, e o campo livre ("Outro")
  const [escolhendoOrgao, setEscolhendoOrgao] = useState(false)
  const [orgaoLivre, setOrgaoLivre] = useState(!ORGAOS.includes(rgOrgao))
  // O primeiro contato nasce principal; so pode haver um por ficha.
  const [principal, setPrincipal] = useState(atual?.principal ?? indice === 0)

  const salvar = () => {
    const novo: Contato = {
      nome: nome.trim(),
      parentesco: parentesco.trim(),
      telefone: telefone.trim(),
      whatsapp,
      principal,
      cpf: cpf.replace(/\D/g, ''),
      rg: rg.trim(),
      // sem RG, o orgao nao fica (o SSP/SP padrao nao vira dado sozinho)
      rgOrgao: rg.trim() ? rgOrgao.trim() || ORGAO_PADRAO : '',
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
      titulo={`Responsável ${indice + 1}`}
      subtitulo={ficha.nome || 'Nova ficha'}
      rodape={
        <Botao
          rotulo="Salvar contato"
          desabilitado={
            !nome.trim() ||
            !parentesco.trim() ||
            !telefoneValido(telefone) ||
            // CPF e opcional; se escreveu, tem que estar inteiro
            (cpf.replace(/\D/g, '').length > 0 && cpf.replace(/\D/g, '').length !== 11)
          }
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
        <Entrada
          rotulo="Parentesco"
          value={parentesco}
          onChangeText={setParentesco}
          placeholder="Mãe, avó, tia, padrasto…"
          autoCapitalize="sentences"
          maxLength={40}
        />
        <View style={st.chips}>
          {ATALHOS.map((r) => (
            <Chip
              key={r}
              rotulo={r}
              ativo={parentesco.trim().toLowerCase() === r.toLowerCase()}
              onPress={() => setParentesco(r)}
            />
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
        <Rotulo>Documentos de quem assina a ficha</Rotulo>
        <Entrada rotulo="RG" value={rg} onChangeText={setRg} maxLength={20} />
        <CampoSeletor
          rotulo="Órgão expedidor"
          valor={rgOrgao || ORGAO_PADRAO}
          onPress={() => setEscolhendoOrgao((v) => !v)}
        />
        {escolhendoOrgao ? (
          <View style={st.chips}>
            {ORGAOS.map((o) => (
              <Chip
                key={o}
                rotulo={o}
                ativo={!orgaoLivre && rgOrgao === o}
                onPress={() => {
                  setRgOrgao(o)
                  setOrgaoLivre(false)
                  setEscolhendoOrgao(false)
                }}
              />
            ))}
            <Chip
              rotulo="Outro"
              ativo={orgaoLivre}
              onPress={() => {
                setOrgaoLivre(true)
                setRgOrgao('')
                setEscolhendoOrgao(false)
              }}
            />
          </View>
        ) : null}
        {orgaoLivre ? (
          <Entrada
            rotulo="Qual órgão expedidor?"
            value={rgOrgao}
            onChangeText={setRgOrgao}
            placeholder="Ex.: SSP/SC"
            autoCapitalize="characters"
            maxLength={20}
          />
        ) : null}
        <Entrada
          rotulo="CPF"
          value={cpf}
          onChangeText={(t) => setCpf(mascaraCpf(t))}
          placeholder="000.000.000-00"
          keyboardType="number-pad"
        />
      </Bloco>

      <Bloco ordem={4}>
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
        <Bloco ordem={5}>
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
