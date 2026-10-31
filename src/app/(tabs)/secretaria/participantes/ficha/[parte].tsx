import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Bloco, Botao, Entrada, Rotulo, TelaForm } from '@/components/ui/form'
import {
  campoVisivel,
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
import { digitarTelefone, mascaraTelefone } from '@/lib/telefone'
import { color, space, type } from '@/theme/tokens'

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
      {campos.map((c, i) => (
        <Bloco key={c.chave} ordem={i}>
          {c.opcoes ? (
            <>
              <Rotulo>{c.rotulo}</Rotulo>
              <View style={st.chips}>
                {c.opcoes.map(([valor, rotulo]) => {
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
                            ? c
                                .opcoes!.map(([v]) => v)
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
              onChangeText={(t) =>
                mudar(
                  c.chave,
                  c.tipo === 'telefone'
                    ? digitarTelefone(mascaraTelefone(m[c.chave]), t)
                    : c.tipo === 'cpf'
                      ? mascaraCpf(t)
                      : c.tipo === 'cep'
                        ? mascaraCep(t)
                        : t,
                )
              }
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
      ))}
    </TelaForm>
  )
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
    if (!ligada || cep.length === 8 || m.rua.trim().length < 3) return
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
})
