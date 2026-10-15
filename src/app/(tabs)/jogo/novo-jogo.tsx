import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { Chip } from '@/components/ui'
import { Aviso, Bloco, Botao, Grupo, LinhaValor, Rotulo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { DIAS_SEMANA } from '@/data/calendario'
import { MODALIDADES, jogadoresEmCampo } from '@/data/jogo'
import { diaMes, horaCurta, rascunhoJogo, salvarJogo } from '@/data/jogo-dados'
import { deISO } from '@/data/metricas'
import { COR_FOCO, useFoco } from '@/hooks/use-foco'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, target, type } from '@/theme/tokens'

/**
 * Tela 11g. Categoria e modalidade sao coisas diferentes (R3): categoria e
 * a divisao por idade e decide quem e elegivel (R2); modalidade e o formato
 * e decide quantos entram em campo.
 */
export default function NovoJogo() {
  const jogo = rascunhoJogo.useValor()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const quando = jogo.data
    ? `${DIAS_SEMANA[deISO(jogo.data).getDay()].toLowerCase()}, ${diaMes(jogo.data)} · ${horaCurta(jogo.hora)}`
    : 'escolher'
  const podeSalvar = !!jogo.adversario.trim() && !!jogo.local.trim() && !!jogo.data && !salvando

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      await salvarJogo()
      mostrarRecado(jogo.id ? 'Jogo salvo' : 'Jogo adicionado')
      voltar('/jogo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o jogo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo={jogo.id ? 'Editar jogo' : 'Adicionar jogo'}
      subtitulo={jogo.campeonato.trim() || 'Amistoso ou campeonato'}
      voltarPara="/jogo"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Salvar jogo'}
          desabilitado={!podeSalvar}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Grupo>
          <CampoTexto
            rotulo="Campeonato"
            valor={jogo.campeonato}
            placeholder="Opcional"
            onChange={(v) => rascunhoJogo.definir({ campeonato: v })}
          />
          <CampoTexto
            rotulo="Adversário"
            valor={jogo.adversario}
            onChange={(v) => rascunhoJogo.definir({ adversario: v })}
          />
          <LinhaValor
            rotulo="Categoria"
            valor={jogo.categoria}
            onPress={() => router.push('/jogo/categoria')}
          />
          <LinhaValor
            rotulo="Data e hora"
            valor={quando}
            onPress={() => router.push('/jogo/data-hora')}
          />
          <CampoTexto
            rotulo="Local"
            valor={jogo.local}
            onChange={(v) => rascunhoJogo.definir({ local: v })}
          />
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo>Modalidade</Rotulo>
        <View style={st.chips}>
          {MODALIDADES.map((m) => (
            <Chip
              key={m}
              rotulo={m}
              ativo={jogo.modalidade === m}
              onPress={() => rascunhoJogo.definir({ modalidade: m })}
            />
          ))}
        </View>
        <Text style={st.legenda}>{jogadoresEmCampo(jogo.modalidade)} em campo</Text>
      </Bloco>

      <Bloco ordem={2}>
        <Aviso
          titulo="A escalação é montada depois"
          texto="Salve o jogo e abra a escalação pelo card na lista de jogos."
        />
      </Bloco>
    </TelaForm>
  )
}

/** Linha "Rotulo ... valor" em que o valor se edita no lugar. */
function CampoTexto({
  rotulo,
  valor,
  onChange,
  placeholder = 'Toque para escrever',
}: {
  rotulo: string
  valor: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const foco = useFoco()
  return (
    <View style={st.linha}>
      <Text style={st.rotulo}>{rotulo}</Text>
      <TextInput
        {...foco.eventos}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.faint}
        style={[st.entrada, foco.focado && st.focado]}
        accessibilityLabel={rotulo}
      />
    </View>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  linha: {
    minHeight: target.minimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  entrada: {
    flex: 1,
    textAlign: 'right',
    minHeight: target.minimo,
    paddingHorizontal: space.sm,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    ...type.small,
    fontFamily: 'Inter_600SemiBold',
    color: color.text,
  },
  focado: { borderColor: COR_FOCO },
})
