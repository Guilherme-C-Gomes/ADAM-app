import { useRef, useState } from 'react'
import { Keyboard, StyleSheet, Text, View } from 'react-native'

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
import { responsaveisPeloComeco, type ResponsavelAchado } from '@/data/fichas'
import { rascunhoFicha, type Contato } from '@/data/rascunhos'
import { onDark, space, type } from '@/theme/tokens'
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

/** RG de Sao Paulo: 9 numeros -> 12.345.678-9 */
function mascaraRgSP(texto: string) {
  const v = texto.replace(/\D/g, '').slice(0, 9)
  return v
    .replace(/^(\w{2})(\w)/, '$1.$2')
    .replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3')
    .replace(/\.(\w{3})(\w)$/, '.$1-$2')
}
const rgSPCompleto = (rg: string) => rg.replace(/\D/g, '').length === 9
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
  // responsaveis ja cadastrados com este comeco de celular (mae de irmaos)
  const [sugestoes, setSugestoes] = useState<ResponsavelAchado[]>([])
  // o cadastro que foi usado: os dados vieram de la
  const [achado, setAchado] = useState<ResponsavelAchado | null>(null)
  // so a resposta da ultima busca conta (a pessoa digita mais rapido que a rede)
  const ultimaBusca = useRef('')

  /** Puxa os dados de um responsavel ja cadastrado. */
  const usar = (r: ResponsavelAchado, tudo: boolean) => {
    // tocou na sugestao: vem tudo; sozinho (numero completo): so o que esta em branco
    setNome((v) => (tudo ? r.nome : v.trim() || r.nome))
    setParentesco((v) => (tudo ? r.parentesco || v : v.trim() || r.parentesco))
    setCpf((v) => ((tudo || !v.replace(/\D/g, '')) && r.cpf ? mascaraCpf(r.cpf) : v))
    setRg((v) => (tudo ? r.rg || v : v.trim() || r.rg))
    if (r.rgOrgao && (tudo || !rg.trim())) {
      setRgOrgao(r.rgOrgao)
      setOrgaoLivre(!ORGAOS.includes(r.rgOrgao))
    }
    setWhatsapp(r.whatsapp)
    setTelefone(r.telefone)
    setAchado(r)
    setSugestoes([])
    Keyboard.dismiss()
  }

  /** A cada numero digitado: procura quem ja tem um celular com esse comeco. */
  const procurar = (numero: string) => {
    ultimaBusca.current = numero
    setAchado(null)
    responsaveisPeloComeco(numero).then((lista) => {
      if (ultimaBusca.current !== numero) return
      const exato = lista.find(
        (r) => telefoneCompleto(numero) && r.telefone === mascaraTelefone(numero),
      )
      if (exato) usar(exato, false)
      else setSugestoes(lista)
    })
  }

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
            // parentesco nao e obrigatorio: responsavel de ficha antiga
            // (de antes do campo existir) salva sem ele
            !nome.trim() ||
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
            if (novo !== telefone) procurar(novo)
          }}
          placeholder="+55 (11) 98765-4321"
          keyboardType="phone-pad"
        />
        {sugestoes.length > 0 ? (
          <>
            <Text style={st.achado}>Já cadastrado com este celular? Toque para usar:</Text>
            <Grupo>
              {sugestoes.map((r) => (
                <Linha
                  key={r.telefone}
                  titulo={r.nome}
                  legenda={[
                    r.telefone,
                    r.criancas.length
                      ? `${r.parentesco || 'Responsável'} de ${r.criancas.join(', ')}`
                      : r.parentesco,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  selo={{ rotulo: 'Usar', tom: 'roxo' }}
                  onPress={() => usar(r, true)}
                />
              ))}
            </Grupo>
          </>
        ) : null}
        {achado ? (
          <Text style={st.achado}>
            Cadastro de {achado.nome}
            {achado.criancas.length ? `, responsável de ${achado.criancas.join(', ')}` : ''}: os
            dados foram preenchidos. Confira e ajuste se precisar.
          </Text>
        ) : null}
      </Bloco>

      <Bloco ordem={3}>
        <Rotulo>Documentos de quem assina a ficha</Rotulo>
        <Entrada
          rotulo="RG"
          value={rg}
          onChangeText={(t) => {
            // SSP/SP: formata e, com os 9 caracteres, fecha o teclado
            if (!orgaoLivre && rgOrgao === ORGAO_PADRAO) {
              const novo = mascaraRgSP(t)
              if (rgSPCompleto(novo) && !rgSPCompleto(rg)) Keyboard.dismiss()
              setRg(novo)
            } else setRg(t)
          }}
          placeholder={!orgaoLivre && rgOrgao === ORGAO_PADRAO ? '12.345.678-9' : undefined}
          // RG e so numero: abre o teclado de numeros
          keyboardType="number-pad"
          maxLength={20}
        />
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
          onChangeText={(t) => {
            const novo = mascaraCpf(t)
            // 11 numeros: o teclado sai da frente sozinho
            if (novo.replace(/\D/g, '').length === 11 && cpf.replace(/\D/g, '').length < 11) {
              Keyboard.dismiss()
            }
            setCpf(novo)
          }}
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
  achado: { ...type.small, fontFamily: 'Inter_400Regular', color: onDark.text },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
