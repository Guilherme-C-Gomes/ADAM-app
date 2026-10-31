import { useLocalSearchParams } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Bloco, Botao, Entrada, Rotulo, TelaForm } from '@/components/ui/form'
import {
  campoVisivel,
  mascaraCep,
  mascaraCpf,
  PARTES,
  type Campo,
  type Chave,
  type Parte,
} from '@/data/ficha-matricula'
import { rascunhoFicha } from '@/data/rascunhos'
import { voltar } from '@/lib/navegacao'
import { digitarTelefone, mascaraTelefone } from '@/lib/telefone'
import { space } from '@/theme/tokens'

/**
 * Uma parte da ficha de matricula (endereco, escola, familia, saude ou
 * declaracao), no cadastro da crianca. Os campos saem de PARTES
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

  return (
    <TelaForm
      titulo={config.titulo}
      subtitulo={ficha.nome || 'Nova ficha'}
      rodape={<Botao rotulo="Pronto" onPress={() => voltar()} />}>
      {campos.map((c, i) => (
        <Bloco key={c.chave} ordem={i}>
          {c.opcoes ? (
            <>
              <Rotulo>{c.rotulo}</Rotulo>
              <View style={st.chips}>
                {c.opcoes.map(([valor, rotulo]) => (
                  <Chip
                    key={valor}
                    rotulo={rotulo}
                    ativo={m[c.chave] === valor}
                    // tocar de novo na escolhida desmarca
                    onPress={() => mudar(c.chave, m[c.chave] === valor ? '' : valor)}
                  />
                ))}
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

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
