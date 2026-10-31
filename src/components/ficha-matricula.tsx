import { StyleSheet, View } from 'react-native'

import { Grupo, Linha, Rotulo } from '@/components/ui/form'
import {
  campoVisivel,
  ORDEM_DAS_PARTES,
  PARTES,
  valorLegivel,
  type Campo,
  type FichaMatricula,
} from '@/data/ficha-matricula'
import { space } from '@/theme/tokens'

/**
 * A ficha de matricula preenchida, parte por parte, so para ler. O que
 * ficou em branco aparece escrito ("nao informado"), nunca some.
 */
export function FichaMatriculaVista({ dados }: { dados: FichaMatricula }) {
  return (
    <View style={st.partes}>
      {ORDEM_DAS_PARTES.map((parte) => {
        const campos = (PARTES[parte].campos as Campo[]).filter((c) => campoVisivel(c, dados))
        return (
          <View key={parte} style={st.parte}>
            <Rotulo>{PARTES[parte].titulo}</Rotulo>
            <Grupo>
              {campos.map((c) => {
                const valor = valorLegivel(c, dados)
                return (
                  <Linha
                    key={c.chave}
                    titulo={c.rotulo}
                    legenda={valor || 'não informado'}
                    legendaTom={valor ? undefined : 'neutro'}
                    semSeta
                  />
                )
              })}
            </Grupo>
          </View>
        )
      })}
    </View>
  )
}

const st = StyleSheet.create({
  partes: { gap: space.lg },
  parte: { gap: space.sm },
})
