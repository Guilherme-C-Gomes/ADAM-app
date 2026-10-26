import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { LETRAS_DIAS, NOME_DIA } from '@/components/escala/frase'
import { Avatar } from '@/components/ui'
import { Entrada } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { entrada, molaPop, Pressionavel } from '@/components/ui/movimento'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Pecas da escala dos treinos: os dias da semana em bolas (D S T Q Q S S),
 * o chip de pessoa (avatar + primeiro nome), o seletor de horario e a
 * frase que se reescreve a cada mudanca.
 */

/** Os dias de domingo a sabado. Com `onAlternar`, cada bola liga e desliga. */
export function DiasDaSemana({
  dias,
  onAlternar,
  pequeno,
}: {
  dias: number[]
  onAlternar?: (dia: number) => void
  pequeno?: boolean
}) {
  return (
    <View style={[st.dias, pequeno && st.diasPequenos]}>
      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
        <BolaDia
          key={d}
          dia={d}
          ativo={dias.includes(d)}
          pequeno={pequeno}
          onPress={onAlternar ? () => onAlternar(d) : undefined}
        />
      ))}
    </View>
  )
}

function BolaDia({
  dia,
  ativo,
  pequeno,
  onPress,
}: {
  dia: number
  ativo: boolean
  pequeno?: boolean
  onPress?: () => void
}) {
  // o roxo cresce passando um pouco do ponto (molaPop) quando o dia liga
  const aceso = useSharedValue(ativo ? 1 : 0)
  useEffect(() => {
    aceso.set(withSpring(ativo ? 1 : 0, molaPop))
  }, [ativo, aceso])
  const fundo = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, aceso.get())),
    transform: [{ scale: 0.55 + 0.45 * aceso.get() }],
  }))

  const conteudo = (
    <>
      <Animated.View pointerEvents="none" style={[st.bolaAcesa, fundo]} />
      <Text style={[st.letra, pequeno && st.letraPequena, ativo && st.letraAtiva]}>
        {LETRAS_DIAS[dia]}
      </Text>
    </>
  )
  if (!onPress) {
    return (
      <View
        style={[st.bola, pequeno && st.bolaPequena]}
        accessibilityLabel={`${NOME_DIA[dia]}${ativo ? ', tem treino' : ''}`}>
        {conteudo}
      </View>
    )
  }
  return (
    <Pressionavel
      onPress={onPress}
      escala={0.9}
      style={st.bola}
      hitSlop={2}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ativo }}
      accessibilityLabel={NOME_DIA[dia]}>
      {conteudo}
    </Pressionavel>
  )
}

/** Chip de escolha de pessoa: avatar com as iniciais e o primeiro nome. */
export function ChipPessoa({
  rotulo,
  iniciais,
  ativo,
  onPress,
  tom = 'roxo',
  desabilitado,
}: {
  rotulo: string
  iniciais?: string
  ativo: boolean
  onPress?: () => void
  /** ambar: o "ninguem ainda" escolhido */
  tom?: 'roxo' | 'ambar'
  desabilitado?: boolean
}) {
  return (
    <Pressionavel
      onPress={onPress}
      disabled={!onPress || desabilitado}
      escala={0.95}
      style={[
        st.chip,
        ativo && (tom === 'ambar' ? st.chipAmbar : st.chipAtivo),
        desabilitado && st.desabilitado,
      ]}
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: ativo, disabled: !!desabilitado }}
      accessibilityLabel={rotulo}>
      {iniciais ? <Avatar iniciais={iniciais} size={26} /> : null}
      {!iniciais && tom === 'ambar' ? (
        <Icone nome="alerta" cor={ativo ? color.warn : color.muted} tamanho={16} />
      ) : null}
      <Text
        style={[
          st.chipRotulo,
          ativo && (tom === 'ambar' ? st.chipRotuloAmbar : st.chipRotuloAtivo),
        ]}
        numberOfLines={1}>
        {rotulo}
      </Text>
    </Pressionavel>
  )
}

/** Chip so de texto (turma, horario), no mesmo tamanho do de pessoa. */
export function ChipTexto({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string
  ativo: boolean
  onPress: () => void
}) {
  return <ChipPessoa rotulo={rotulo} ativo={ativo} onPress={onPress} />
}

export function mascaraHora(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}
export const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)

const SUGESTOES = ['08:00', '09:00', '10:00', '14:00', '16:00', '18:00']

/**
 * Horario: os mais usados em chips grandes e, para o resto, o campo com a
 * mascara "08:00" (o mesmo da escala antiga). `extras` entram nos chips
 * (horarios que ja estao na escala).
 */
export function SeletorHora({
  hora,
  onChange,
  extras = [],
}: {
  hora: string
  onChange: (hora: string) => void
  extras?: string[]
}) {
  const chips = [...SUGESTOES, ...extras]
    .filter((h, i, todos) => horaValida(h) && todos.indexOf(h) === i)
    .sort()
  const [outro, setOutro] = useState(chips.includes(hora) ? '' : hora)
  return (
    <View style={st.campo}>
      <View style={st.chips}>
        {chips.map((h) => (
          <ChipTexto
            key={h}
            rotulo={h.endsWith(':00') ? `${Number(h.slice(0, 2))}h` : h.replace(':', 'h')}
            ativo={hora === h}
            onPress={() => {
              setOutro('')
              onChange(h)
            }}
          />
        ))}
      </View>
      <Entrada
        value={outro}
        onChangeText={(t) => {
          const h = mascaraHora(t)
          setOutro(h)
          onChange(h)
        }}
        placeholder="Outro horário (ex.: 07:30)"
        keyboardType="number-pad"
        maxLength={5}
      />
    </View>
  )
}

/**
 * A frase da escala. Cada texto novo entra subindo de leve (expoOut), como
 * se fosse reescrito; o leitor de tela le a frase nova.
 */
export function FraseViva({ texto, apagada }: { texto: string; apagada?: boolean }) {
  return (
    <Animated.Text
      key={texto}
      entering={entrada(0, { distancia: 6, duracao: 360 })}
      accessibilityLiveRegion="polite"
      style={[st.frase, apagada && st.fraseApagada]}>
      {texto}
    </Animated.Text>
  )
}

const BOLA = 40

const st = StyleSheet.create({
  dias: { flexDirection: 'row', justifyContent: 'space-between' },
  diasPequenos: { justifyContent: 'flex-start', gap: 3 },
  bola: {
    width: BOLA,
    height: BOLA,
    borderRadius: BOLA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
    overflow: 'hidden',
  },
  bolaPequena: { width: 20, height: 20, borderRadius: 10 },
  bolaAcesa: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: BOLA / 2,
    backgroundColor: onDark.fill,
  },
  letra: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.muted },
  letraPequena: { fontSize: 10, lineHeight: 12 },
  letraAtiva: { color: color.text },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.base,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.surface2,
    minWidth: 56,
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: 'rgba(158, 5, 210, 0.22)', borderColor: color.primaryLt },
  chipAmbar: { backgroundColor: 'rgba(245, 165, 36, 0.12)', borderColor: color.warn },
  chipRotulo: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.muted },
  chipRotuloAtivo: { color: color.text },
  chipRotuloAmbar: { color: color.warn },
  desabilitado: { opacity: 0.4 },

  campo: { gap: space.md },

  frase: { ...type.h2, fontFamily: 'Inter_600SemiBold', color: color.text, lineHeight: 28 },
  fraseApagada: { color: color.muted },
})
