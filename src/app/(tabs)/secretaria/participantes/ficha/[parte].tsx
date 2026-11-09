import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Keyboard, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import {
  Bloco,
  Botao,
  CampoSeletor,
  Entrada,
  Grupo,
  Linha,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import {
  campoVisivel,
  completarComResponsaveis,
  marcados,
  mascaraCep,
  mascaraCpf,
  PARTES,
  type Campo,
  type Chave,
  type Parte,
} from '@/data/ficha-matricula'
import { rascunhoFicha } from '@/data/rascunhos'
import { buscarCep, buscarCepDaRua } from '@/lib/cep'
import { voltar } from '@/lib/navegacao'
import { digitarTelefone, digitosComPais, mascaraTelefone, telefoneCompleto } from '@/lib/telefone'
import { color, onDark, space, type } from '@/theme/tokens'

/**
 * Uma parte da ficha de matricula (endereco, escola, familia ou saude),
 * no cadastro da crianca. Os campos saem de PARTES
 * (data/ficha-matricula.ts) e mexem no rascunho: tudo sobe junto no
 * "Salvar ficha".
 */
export default function ParteDaFicha() {
  const { parte } = useLocalSearchParams<{ parte: Parte }>()
  const ficha = rascunhoFicha.useValor()
  const config = PARTES[parte] ?? PARTES.endereco
  const m = ficha.matricula

  const mudar = (chave: Chave, valor: string) =>
    rascunhoFicha.definir({ matricula: { ...rascunhoFicha.ler().matricula, [chave]: valor } })

  const campos = (config.campos as Campo[]).filter((c) => campoVisivel(c, m))
  const cep = useBuscaDeCep(parte === 'endereco')
  // a lista de opcoes aberta (campos de "Selecionar", como a serie)
  const [aberta, setAberta] = useState<Chave | null>(null)

  // Familia: o que ja esta nos responsaveis entra nos campos em branco (mae,
  // pai e urgencia) — nunca por cima do que ja foi escrito
  useEffect(() => {
    if (parte !== 'familia') return
    const f = rascunhoFicha.ler()
    const novo = completarComResponsaveis(f.matricula, f.contatos)
    if (novo) rascunhoFicha.definir({ matricula: novo })
  }, [parte])

  const contatos = ficha.contatos.filter((c) => c.nome.trim() && c.telefone.trim())
  const urgencia = digitosComPais(m.urgenciaTelefone)
  // quem da urgencia e um dos responsaveis (pelo numero)
  const urgenciaDe = urgencia
    ? contatos.findIndex((c) => digitosComPais(c.telefone) === urgencia)
    : -1
  // "Outra pessoa": escreve nome e numero; com um responsavel escolhido, nao
  const [outraPessoa, setOutraPessoa] = useState(
    () => !!m.urgenciaTelefone.trim() && urgenciaDe < 0,
  )
  const escreveUrgencia = outraPessoa || !contatos.length

  return (
    <TelaForm
      titulo={config.titulo}
      subtitulo={ficha.nome || 'Nova ficha'}
      rodape={<Botao rotulo="Pronto" onPress={() => voltar()} />}>
      {cep ? (
        <Bloco>
          <Text style={st.cep}>{cep}</Text>
        </Bloco>
      ) : null}
      {campos.map((c, i) =>
        c.chave === 'urgenciaTelefone' && !escreveUrgencia ? null : c.chave === 'urgenciaNome' ? (
          <Bloco key={c.chave} ordem={i}>
            <Rotulo>Em caso de urgência, chamar</Rotulo>
            {contatos.length ? (
              <Grupo>
                {contatos.map((r, n) => (
                  <Linha
                    key={`${r.telefone}-${n}`}
                    titulo={r.nome}
                    legenda={`${r.parentesco || 'Responsável'} · ${mascaraTelefone(r.telefone)}`}
                    selo={
                      !outraPessoa && urgenciaDe === n
                        ? { rotulo: 'escolhido', tom: 'verde' }
                        : { rotulo: 'Usar', tom: 'roxo' }
                    }
                    semSeta
                    onPress={() => {
                      setOutraPessoa(false)
                      rascunhoFicha.definir({
                        matricula: {
                          ...rascunhoFicha.ler().matricula,
                          urgenciaNome: r.nome.trim(),
                          urgenciaTelefone: r.telefone.trim(),
                        },
                      })
                    }}
                  />
                ))}
                <Linha
                  titulo="Outra pessoa"
                  legenda="Escrever o nome e o celular"
                  selo={outraPessoa ? { rotulo: 'escolhido', tom: 'verde' } : undefined}
                  semSeta
                  onPress={() => {
                    // sai de um responsavel: comeca em branco
                    if (!outraPessoa && urgenciaDe >= 0) {
                      rascunhoFicha.definir({
                        matricula: {
                          ...rascunhoFicha.ler().matricula,
                          urgenciaNome: '',
                          urgenciaTelefone: '',
                        },
                      })
                    }
                    setOutraPessoa(true)
                  }}
                />
              </Grupo>
            ) : (
              <Text style={st.cep}>
                Os responsáveis cadastrados aparecem aqui para escolher. Sem eles, escreva abaixo.
              </Text>
            )}
            {escreveUrgencia ? (
              <Entrada
                rotulo="Nome"
                value={m.urgenciaNome}
                onChangeText={(t) => mudar('urgenciaNome', t)}
                placeholder="Quem chamar"
                autoCapitalize="words"
                maxLength={200}
              />
            ) : (
              <Text style={st.escolhido}>
                Na urgência, a ADAM liga para {m.urgenciaNome || 'o responsável escolhido'}.
              </Text>
            )}
          </Bloco>
        ) : (
          <Bloco key={c.chave} ordem={i}>
            {c.opcoes && c.lista ? (
              <>
                <CampoSeletor
                  rotulo={c.rotulo}
                  valor={valorDaLista(c, m[c.chave]) || 'Selecionar'}
                  vazio={!m[c.chave].trim()}
                  onPress={() => setAberta((v) => (v === c.chave ? null : c.chave))}
                />
                {aberta === c.chave ? (
                  <View style={st.chips}>
                    {opcoesCom(c, m[c.chave]).map(([valor, rotulo]) => (
                      <Chip
                        key={valor}
                        rotulo={rotulo}
                        ativo={m[c.chave] === valor}
                        onPress={() => {
                          mudar(c.chave, m[c.chave] === valor ? '' : valor)
                          setAberta(null)
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : c.opcoes ? (
              <>
                <Rotulo>{c.rotulo}</Rotulo>
                <View style={st.chips}>
                  {opcoesCom(c, m[c.chave]).map(([valor, rotulo]) => {
                    const lista = marcados(m[c.chave])
                    const ativo = c.multipla ? lista.includes(valor) : m[c.chave] === valor
                    return (
                      <Chip
                        key={valor}
                        rotulo={rotulo}
                        ativo={ativo}
                        // tocar de novo na escolhida desmarca; na de varias,
                        // liga e desliga cada uma, na ordem das opcoes
                        onPress={() =>
                          mudar(
                            c.chave,
                            c.multipla
                              ? opcoesCom(c, m[c.chave])
                                  .map(([v]) => v)
                                  .filter((v) => (v === valor ? !ativo : lista.includes(v)))
                                  .join(',')
                              : ativo
                                ? ''
                                : valor,
                          )
                        }
                      />
                    )
                  })}
                </View>
              </>
            ) : (
              <Entrada
                rotulo={c.rotulo}
                value={
                  c.tipo === 'telefone'
                    ? mascaraTelefone(m[c.chave])
                    : c.tipo === 'cpf'
                      ? mascaraCpf(m[c.chave])
                      : c.tipo === 'cep'
                        ? mascaraCep(m[c.chave])
                        : m[c.chave]
                }
                onChangeText={(t) => {
                  const novo =
                    c.tipo === 'telefone'
                      ? digitarTelefone(mascaraTelefone(m[c.chave]), t)
                      : c.tipo === 'cpf'
                        ? mascaraCpf(t)
                        : c.tipo === 'cep'
                          ? mascaraCep(t)
                          : t
                  // campo de tamanho certo ficou completo: fecha o teclado
                  if (completo(c, novo) && !completo(c, m[c.chave])) Keyboard.dismiss()
                  mudar(c.chave, novo)
                }}
                placeholder={
                  c.placeholder ?? (c.tipo === 'telefone' ? '+55 (11) 98765-4321' : undefined)
                }
                keyboardType={
                  c.tipo === 'telefone'
                    ? 'phone-pad'
                    : c.tipo === 'cpf' || c.tipo === 'cep'
                      ? 'number-pad'
                      : c.tipo === 'numero'
                        ? 'decimal-pad'
                        : 'default'
                }
                autoCapitalize={c.tipo ? 'none' : 'sentences'}
                multiline={c.tipo === 'multilinha'}
                maxLength={c.tipo === 'multilinha' ? 600 : 200}
              />
            )}
          </Bloco>
        ),
      )}
    </TelaForm>
  )
}

/**
 * As opcoes do campo, mais o valor que ja estava gravado e nao e uma delas
 * (ficha antiga com a serie escrita a mao, "5 ano"): aparece marcado, para
 * nao se perder ao editar.
 */
function opcoesCom(c: Campo, valor: string): [string, string][] {
  const opcoes = c.opcoes ?? []
  const fora = (c.multipla ? marcados(valor) : valor.trim() ? [valor] : []).filter(
    (v) => !opcoes.some(([o]) => o === v),
  )
  return [...opcoes, ...fora.map((v): [string, string] => [v, v])]
}

const valorDaLista = (c: Campo, valor: string) =>
  opcoesCom(c, valor).find(([v]) => v === valor)?.[1] ?? ''

/** O campo de tamanho fixo (CPF, CEP, celular) esta inteiro? */
function completo(c: Campo, valor: string) {
  const d = valor.replace(/\D/g, '')
  if (c.tipo === 'cpf') return d.length === 11
  if (c.tipo === 'cep') return d.length === 8
  if (c.tipo === 'telefone') return telefoneCompleto(valor)
  return false
}

/**
 * Busca de CEP da parte "Endereco" (lib/cep.ts), mexendo no rascunho:
 * - CEP completo: preenche rua, bairro e cidade (o numero fica);
 * - sem CEP, com rua (e de preferencia o bairro): acha o CEP, depois de a
 *   pessoa parar de digitar.
 * Devolve a frase do que aconteceu ('' = nada a dizer).
 */
function useBuscaDeCep(ligada: boolean) {
  const m = rascunhoFicha.useValor().matricula
  const [aviso, setAviso] = useState('')
  // o ultimo CEP buscado (ou achado pela rua): nao busca de novo o mesmo
  const ultimo = useRef(m.cep.replace(/\D/g, ''))
  const cep = m.cep.replace(/\D/g, '')

  useEffect(() => {
    if (!ligada || cep.length !== 8 || cep === ultimo.current) return
    ultimo.current = cep
    let vivo = true
    buscarCep(cep).then((e) => {
      if (!vivo) return
      if (!e) {
        setAviso('CEP não encontrado. Confira o número ou preencha o endereço.')
        return
      }
      const atual = rascunhoFicha.ler().matricula
      rascunhoFicha.definir({
        matricula: {
          ...atual,
          rua: e.rua || atual.rua,
          bairro: e.bairro || atual.bairro,
          cidade: e.cidade || atual.cidade,
        },
      })
      setAviso('Endereço preenchido pelo CEP. Falta só o número.')
    })
    return () => {
      vivo = false
    }
  }, [ligada, cep])

  useEffect(() => {
    // so com o CEP em branco: CEP pela metade e a pessoa digitando
    if (!ligada || cep.length > 0 || m.rua.trim().length < 3) return
    let vivo = true
    // espera a pessoa parar de digitar
    const espera = setTimeout(() => {
      buscarCepDaRua(m.rua, m.bairro, m.cidade || 'Atibaia').then((achado) => {
        if (!vivo) return
        if (!achado) {
          setAviso(
            m.bairro.trim()
              ? 'Não achei o CEP dessa rua nesse bairro. Pode digitar o CEP.'
              : 'Escreva o bairro para eu achar o CEP.',
          )
          return
        }
        ultimo.current = achado
        rascunhoFicha.definir({
          matricula: { ...rascunhoFicha.ler().matricula, cep: mascaraCep(achado) },
        })
        setAviso('CEP encontrado pela rua e bairro.')
      })
    }, 900)
    return () => {
      vivo = false
      clearTimeout(espera)
    }
  }, [ligada, cep, m.rua, m.bairro, m.cidade])

  return ligada ? aviso : ''
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  cep: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  escolhido: { ...type.small, fontFamily: 'Inter_400Regular', color: onDark.text },
})
