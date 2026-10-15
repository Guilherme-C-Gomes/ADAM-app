import { type Href } from 'expo-router'
import { Fragment, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { MESES } from '@/data/calendario'
import type { NomeIcone } from '@/components/ui/icone'
import { Icone } from '@/components/ui/icone'
import { color, motion, onDark, radius, space, target, type } from '@/theme/tokens'
import { COR_FOCO, useFoco } from '@/hooks/use-foco'
import { voltar } from '@/lib/navegacao'

/**
 * Pecas das telas empilhadas do v2: formularios, seletores e listas.
 *
 * Quase toda tela nova do Figma e a mesma receita — cabecalho com
 * voltar, cards de linhas, aviso "i" e um botao roxo no rodape. Morar
 * aqui evita trinta copias do mesmo StyleSheet.
 */

/** Tela empilhada: cabecalho, conteudo rolavel e botao fixo no rodape. */
export function TelaForm({
  titulo,
  subtitulo,
  acao,
  voltarPara,
  rodape,
  children,
}: {
  titulo: string
  subtitulo: string
  acao?: { icone: NomeIcone; rotulo: string; onPress: () => void }
  /** para onde o voltar leva quando nao ha historico (web recarregada) */
  voltarPara?: Href
  rodape?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SafeAreaView style={s.tela} edges={['top', 'bottom']}>
      <HeroVoltar titulo={titulo} subtitulo={subtitulo} acao={acao} voltarPara={voltarPara} />
      <ScrollView
        contentContainerStyle={s.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {rodape ? <View style={s.rodape}>{rodape}</View> : null}
    </SafeAreaView>
  )
}

/** Entrada em cascata: cada bloco 40ms depois do anterior. */
export function Bloco({
  ordem = 0,
  children,
  style,
}: {
  ordem?: number
  children: React.ReactNode
  style?: ViewStyle
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.medium).delay(ordem * 40)}
      style={[s.bloco, style]}>
      {children}
    </Animated.View>
  )
}

export function Botao({
  rotulo,
  onPress,
  variante = 'primario',
  desabilitado,
}: {
  rotulo: string
  onPress: () => void
  variante?: 'primario' | 'secundario' | 'perigo'
  desabilitado?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        s.botao,
        variante === 'secundario' && s.botaoSecundario,
        variante === 'perigo' && s.botaoPerigo,
        pressed && s.pressed,
        desabilitado && s.desabilitado,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!desabilitado }}>
      <Text
        style={[
          s.botaoRotulo,
          variante === 'secundario' && s.textoSecundario,
          variante === 'perigo' && s.textoPerigo,
        ]}>
        {rotulo}
      </Text>
    </Pressable>
  )
}

/** Link de texto roxo ("Adicionar nome", "Editar exercício"). */
export function Link({
  rotulo,
  onPress,
  centro,
}: {
  rotulo: string
  onPress: () => void
  centro?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.sm}
      style={({ pressed }) => [s.linkAlvo, centro && s.centro, pressed && s.pressed]}
      accessibilityRole="button">
      <Text style={s.link}>{rotulo}</Text>
    </Pressable>
  )
}

/** Rotulo em caixa alta acima de campo ou secao, com contador opcional. */
export function Rotulo({ children, extra }: { children: string; extra?: string }) {
  return (
    <View style={s.rotuloLinha}>
      <Text style={s.rotulo}>{children}</Text>
      {extra ? <Text style={s.rotuloExtra}>{extra}</Text> : null}
    </View>
  )
}

export function Entrada({
  rotulo,
  icone,
  style,
  ...props
}: TextInputProps & { rotulo?: string; icone?: NomeIcone }) {
  const { focado, eventos } = useFoco(props)
  return (
    <View style={s.campo}>
      {rotulo ? <Rotulo>{rotulo}</Rotulo> : null}
      <View style={[s.entradaCaixa, focado && s.focado]}>
        {icone ? <Icone nome={icone} cor={focado ? COR_FOCO : color.muted} /> : null}
        <TextInput
          placeholderTextColor={color.faint}
          style={[s.entrada, props.multiline && s.entradaMulti, style]}
          {...props}
          {...eventos}
        />
      </View>
    </View>
  )
}

export function Busca({
  valor,
  onChange,
  placeholder,
}: {
  valor: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const { focado, eventos } = useFoco()
  return (
    <View style={[s.busca, focado && s.focado]}>
      <Icone nome="busca" cor={focado ? COR_FOCO : color.muted} />
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.faint}
        style={s.buscaTexto}
        autoCorrect={false}
        {...eventos}
      />
    </View>
  )
}

/** Card que agrupa linhas com divisoria entre elas. */
export function Grupo({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const itens = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean)
  return (
    <View style={[s.grupo, style]}>
      {itens.map((filho, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={s.divisoria} /> : null}
          {filho}
        </Fragment>
      ))}
    </View>
  )
}

export type Tom = 'roxo' | 'verde' | 'ambar' | 'vermelho' | 'neutro'

const TONS: Record<Tom, { fundo: string; texto: string }> = {
  roxo: { fundo: color.primaryDk, texto: color.primaryCh },
  verde: { fundo: 'rgba(61, 214, 140, 0.14)', texto: color.success },
  ambar: { fundo: 'rgba(245, 165, 36, 0.14)', texto: color.warn },
  vermelho: { fundo: 'rgba(255, 122, 181, 0.14)', texto: color.danger },
  neutro: { fundo: color.surface2, texto: color.muted },
}

export function Selo({ rotulo, tom = 'roxo' }: { rotulo: string; tom?: Tom }) {
  const t = TONS[tom]
  return (
    <View style={[s.selo, { backgroundColor: t.fundo }]}>
      <Text style={[s.seloRotulo, { color: t.texto }]}>{rotulo}</Text>
    </View>
  )
}

/**
 * Linha de lista. Com `onPress` ganha seta e vira porta (R24); sem,
 * fica parada. `esquerda` recebe avatar, marca ou numero.
 */
export function Linha({
  titulo,
  legenda,
  legendaTom,
  valor,
  selo,
  esquerda,
  direita,
  onPress,
  perigo,
  semSeta,
}: {
  titulo: string
  legenda?: string
  legendaTom?: Tom
  valor?: string
  selo?: { rotulo: string; tom?: Tom }
  esquerda?: React.ReactNode
  direita?: React.ReactNode
  onPress?: () => void
  perigo?: boolean
  semSeta?: boolean
}) {
  const conteudo = (
    <>
      {esquerda}
      <View style={s.linhaTexto}>
        <Text style={[s.linhaTitulo, perigo && s.textoPerigo]} numberOfLines={1}>
          {titulo}
        </Text>
        {legenda ? (
          <Text
            style={[s.legenda, legendaTom && { color: TONS[legendaTom].texto }]}
            numberOfLines={2}>
            {legenda}
          </Text>
        ) : null}
      </View>
      {valor ? <Text style={s.linhaValor}>{valor}</Text> : null}
      {selo ? <Selo rotulo={selo.rotulo} tom={selo.tom} /> : null}
      {direita}
      {onPress && !semSeta ? <Icone nome="seta" cor={color.faint} /> : null}
    </>
  )

  if (!onPress) return <View style={s.linha}>{conteudo}</View>

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.linha, pressed && s.pressedLinha]}
      accessibilityRole="button"
      accessibilityLabel={titulo}>
      {conteudo}
    </Pressable>
  )
}

/** Campo que abre um seletor: rotulo em cima, valor e seta embaixo. */
export function CampoSeletor({
  rotulo,
  valor,
  onPress,
  vazio,
}: {
  rotulo: string
  valor: string
  onPress: () => void
  vazio?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.campoSeletor, pressed && s.pressedLinha]}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <View style={s.campoSeletorLinha}>
        <Text style={[s.campoSeletorValor, vazio && s.textoAviso]} numberOfLines={1}>
          {valor}
        </Text>
        <Icone nome="seta" cor={color.faint} />
      </View>
    </Pressable>
  )
}

/** Linha "Rotulo ........ valor ›" dos formularios de jogo e emprestimo. */
export function LinhaValor({
  rotulo,
  valor,
  onPress,
}: {
  rotulo: string
  valor: string
  onPress?: () => void
}) {
  return (
    <Linha
      titulo={rotulo}
      direita={<Text style={s.linhaValorForte}>{valor}</Text>}
      onPress={onPress}
    />
  )
}

export function Marca({ ativa, tipo = 'check' }: { ativa: boolean; tipo?: 'check' | 'radio' }) {
  if (tipo === 'radio') {
    return (
      <View style={[s.radio, ativa && s.radioAtivo]}>
        {ativa ? <View style={s.radioMiolo} /> : null}
      </View>
    )
  }
  return (
    <View style={[s.check, ativa && s.checkAtivo]}>
      {ativa ? <Icone nome="check" cor={color.bg} tamanho={14} /> : null}
    </View>
  )
}

/** Linha marcavel (radio ou check), usada em todos os seletores. */
export function Opcao({
  titulo,
  legenda,
  ativa,
  onPress,
  tipo = 'radio',
  iniciais,
  valor,
  selo,
}: {
  titulo: string
  legenda?: string
  ativa: boolean
  onPress: () => void
  tipo?: 'check' | 'radio'
  iniciais?: string
  valor?: string
  selo?: { rotulo: string; tom?: Tom }
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.linha, pressed && s.pressedLinha]}
      accessibilityRole={tipo === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: ativa }}
      accessibilityLabel={titulo}>
      <Marca ativa={ativa} tipo={tipo} />
      {iniciais ? <Avatar iniciais={iniciais} size={30} /> : null}
      <View style={s.linhaTexto}>
        <Text style={s.linhaTitulo}>{titulo}</Text>
        {legenda ? <Text style={s.legenda}>{legenda}</Text> : null}
      </View>
      {valor ? <Text style={s.legenda}>{valor}</Text> : null}
      {selo ? <Selo rotulo={selo.rotulo} tom={selo.tom} /> : null}
    </Pressable>
  )
}

export function Interruptor({
  titulo,
  legenda,
  valor,
  onChange,
}: {
  titulo: string
  legenda: string
  valor: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <View style={s.linha}>
      <View style={s.linhaTexto}>
        <Text style={s.linhaTitulo}>{titulo}</Text>
        <Text style={s.legenda}>{legenda}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: color.surface2, true: onDark.fill }}
        thumbColor={color.text}
        ios_backgroundColor={color.surface2}
      />
    </View>
  )
}

/** Card de aviso com "i": explica a regra em vez de esconder o motivo. */
export function Aviso({
  titulo,
  texto,
  tom = 'neutro',
  onPress,
}: {
  titulo: string
  texto?: string
  tom?: 'neutro' | 'ambar' | 'roxo'
  onPress?: () => void
}) {
  const corIcone = tom === 'ambar' ? color.warn : tom === 'roxo' ? color.primaryCh : color.muted
  const conteudo = (
    <>
      {tom === 'ambar' ? <View style={s.acentoAmbar} /> : null}
      <Icone nome={tom === 'ambar' ? 'alerta' : 'info'} cor={corIcone} tamanho={20} />
      <View style={s.linhaTexto}>
        <Text style={s.linhaTitulo}>{titulo}</Text>
        {texto ? <Text style={s.legenda}>{texto}</Text> : null}
      </View>
      {onPress ? <Icone nome="seta" cor={color.faint} /> : null}
    </>
  )
  if (!onPress) return <View style={s.aviso}>{conteudo}</View>
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.aviso, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={titulo}>
      {conteudo}
    </Pressable>
  )
}

/** Pilula de periodo com setas: "Setembro de 2026  ‹ ›". */
export function SeletorPeriodo({
  rotulo,
  onAnterior,
  onProximo,
  onPress,
}: {
  rotulo: string
  onAnterior: () => void
  onProximo: () => void
  onPress?: () => void
}) {
  return (
    <View style={s.periodo}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={s.periodoRotuloAlvo}
        accessibilityRole="button"
        accessibilityLabel={`Período: ${rotulo}`}>
        <Icone nome="calendario" cor={color.muted} tamanho={16} />
        <Text style={s.periodoRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
      </Pressable>
      <Pressable
        onPress={onAnterior}
        hitSlop={space.sm}
        style={({ pressed }) => [s.periodoSeta, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Período anterior">
        <Icone nome="seta-esquerda" cor={color.text} />
      </Pressable>
      <Pressable
        onPress={onProximo}
        hitSlop={space.sm}
        style={({ pressed }) => [s.periodoSeta, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Próximo período">
        <Icone nome="seta" cor={color.text} />
      </Pressable>
    </View>
  )
}

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/**
 * Calendario de um mes. Sem Intl: o Hermes do Expo Go nao tem os dados
 * de pt-BR, entao nome de mes e dia da semana saem de tabela propria.
 * `faixa` pinta um intervalo (filtros de periodo).
 */
export function Calendario({
  ano,
  mes,
  selecionado,
  faixa,
  marcas,
  hoje,
  onEscolher,
  onMudarMes,
}: {
  ano: number
  mes: number
  selecionado?: number
  faixa?: { de: number; ate: number }
  /** bolinha embaixo do dia: verde (tudo certo) ou ambar (falta algo) */
  marcas?: Record<number, 'ok' | 'pendente'>
  /** o dia de hoje neste mes, com contorno */
  hoje?: number
  onEscolher: (dia: number) => void
  onMudarMes: (delta: number) => void
}) {
  const primeiro = new Date(ano, mes, 1).getDay()
  const total = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ]
  while (celulas.length % 7) celulas.push(null)

  return (
    <View style={s.calendarioBloco}>
      <SeletorPeriodo
        rotulo={`${MESES[mes]} de ${ano}`}
        onAnterior={() => onMudarMes(-1)}
        onProximo={() => onMudarMes(1)}
      />
      <View style={s.calendario}>
        <View style={s.semana}>
          {DIAS.map((d, i) => (
            <Text key={i} style={s.diaSemana}>
              {d}
            </Text>
          ))}
        </View>
        {Array.from({ length: celulas.length / 7 }, (_, l) => (
          <View key={l} style={s.semana}>
            {celulas.slice(l * 7, l * 7 + 7).map((dia, i) => {
              const ativo = dia !== null && dia === selecionado
              const naFaixa = dia !== null && faixa && dia >= faixa.de && dia <= faixa.ate
              const ponta = dia !== null && faixa && (dia === faixa.de || dia === faixa.ate)
              const marca = dia !== null ? marcas?.[dia] : undefined
              return (
                <Pressable
                  key={i}
                  disabled={dia === null}
                  onPress={() => dia !== null && onEscolher(dia)}
                  style={[s.dia, naFaixa && s.diaFaixa]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    dia
                      ? `Dia ${dia}${marca === 'pendente' ? ', falta técnico' : marca === 'ok' ? ', tudo certo' : ''}`
                      : undefined
                  }
                  accessibilityState={{ selected: ativo || !!ponta }}>
                  <View
                    style={[
                      s.diaMiolo,
                      dia !== null && dia === hoje && s.diaHoje,
                      (ativo || ponta) && s.diaAtivo,
                    ]}>
                    <Text style={[s.diaTexto, (ativo || ponta) && s.diaTextoAtivo]}>
                      {dia ?? ''}
                    </Text>
                  </View>
                  {marca ? (
                    <View
                      style={[
                        s.diaMarca,
                        { backgroundColor: marca === 'ok' ? color.success : color.warn },
                      ]}
                    />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

/** Hook de rascunho de formulario salvo: mostra "Salvo" e volta. */
export function useSalvar() {
  const [salvo, setSalvo] = useState(false)
  return {
    salvo,
    salvar: () => {
      setSalvo(true)
      setTimeout(() => voltar(), 350)
    },
  }
}

export const estilosForm = StyleSheet.create({
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
})

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  rodape: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  bloco: { gap: space.sm },
  centro: { alignSelf: 'center' },

  botao: {
    minHeight: target.minimo + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.botao,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
    paddingHorizontal: space.base,
  },
  // Secundario: o roxo da marca em tom claro — destaca sem disputar com o
  // principal (roxo cheio). O texto e o primaryLt, que passa no contraste AA.
  botaoSecundario: {
    backgroundColor: 'rgba(158, 5, 210, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(194, 75, 238, 0.55)',
  },
  botaoPerigo: {
    backgroundColor: 'rgba(255, 122, 181, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 181, 0.5)',
  },
  botaoRotulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  textoSecundario: { color: color.primaryLt },
  textoPerigo: { color: color.danger },
  textoAviso: { color: color.warn },
  desabilitado: { opacity: 0.4 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  pressedLinha: { opacity: 0.7 },

  linkAlvo: { minHeight: 32, justifyContent: 'center' },
  link: { ...type.small, fontFamily: 'Inter_600SemiBold', color: onDark.text },

  rotuloLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rotuloExtra: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: onDark.text },

  campo: { gap: space.sm },
  entradaCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  entrada: {
    flex: 1,
    minHeight: 48,
    color: color.text,
    ...type.body,
    fontFamily: 'Inter_400Regular',
  },
  entradaMulti: { minHeight: 88, paddingVertical: space.md, textAlignVertical: 'top' },
  focado: { borderColor: COR_FOCO },

  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 48,
    paddingHorizontal: space.base,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  buscaTexto: { flex: 1, color: color.text, ...type.body, fontFamily: 'Inter_400Regular' },

  grupo: {
    paddingHorizontal: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  divisoria: { height: 1, backgroundColor: color.divider },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold' },

  linha: {
    minHeight: target.minimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaTexto: { flex: 1, gap: 2 },
  linhaTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  linhaValor: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  linhaValorForte: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },

  campoSeletor: { flex: 1, gap: space.xs, paddingVertical: space.md, minHeight: target.minimo },
  campoSeletorLinha: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  campoSeletorValor: { flex: 1, ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },

  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.border,
  },
  checkAtivo: { backgroundColor: color.success, borderColor: color.success },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.border,
  },
  radioAtivo: { borderColor: color.primaryLt },
  radioMiolo: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primaryLt },

  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    paddingLeft: space.base + 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  acentoAmbar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },

  periodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 48,
    paddingLeft: space.base,
    paddingRight: space.xs,
    borderRadius: radius.campo,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  periodoRotuloAlvo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  periodoRotulo: { flex: 1, ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  periodoSeta: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },

  calendarioBloco: { gap: space.md },
  calendario: {
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  semana: { flexDirection: 'row' },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    paddingVertical: space.xs,
  },
  dia: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  diaFaixa: { backgroundColor: color.primaryDk },
  diaMiolo: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  diaAtivo: { backgroundColor: onDark.fill },
  diaTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text },
  diaTextoAtivo: { fontFamily: 'Inter_700Bold' },
  diaHoje: { borderWidth: 1, borderColor: color.primaryLt },
  diaMarca: { position: 'absolute', bottom: 1, width: 5, height: 5, borderRadius: 3 },
})
