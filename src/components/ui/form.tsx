import { useSegments, type Href } from 'expo-router'
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import Animated, {
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui'
import { HeroVoltar } from '@/components/ui/setor'
import { entrada, molaDeslize, molaPop, Pressionavel } from '@/components/ui/movimento'
import { useEspacoDaBarra } from '@/components/ui/tab-bar'
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
  // Dentro das abas com a barra de menu na tela, a cena ja termina acima
  // da barra (que ocupa a margem de baixo do iPhone): aplicar a margem de
  // baixo de novo deixaria um vao. Ajustes mora fora das abas e sempre a usa.
  const segmentos = useSegments()
  const comBarra = useEspacoDaBarra() > 0 && segmentos[0] === '(tabs)'
  return (
    <SafeAreaView style={s.tela} edges={comBarra ? ['top'] : ['top', 'bottom']}>
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

/** Entrada em cascata: cada bloco 25ms depois do anterior, subindo 8px. */
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
    <Animated.View entering={entrada(ordem)} style={[s.bloco, style]}>
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
    <Pressionavel
      onPress={onPress}
      disabled={desabilitado}
      style={[
        s.botao,
        variante === 'secundario' && s.botaoSecundario,
        variante === 'perigo' && s.botaoPerigo,
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
    </Pressionavel>
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
    <Pressionavel
      onPress={onPress}
      escala={0.98}
      opacidade={0.7}
      style={s.linha}
      accessibilityRole="button"
      accessibilityLabel={titulo}>
      {conteudo}
    </Pressionavel>
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
    <Pressionavel
      onPress={onPress}
      escala={0.98}
      opacidade={0.7}
      style={s.campoSeletor}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <View style={s.campoSeletorLinha}>
        <Text style={[s.campoSeletorValor, vazio && s.textoAviso]} numberOfLines={1}>
          {valor}
        </Text>
        <Icone nome="seta" cor={color.faint} />
      </View>
    </Pressionavel>
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

/** Marca de selecao. Quando acende, da um "pop" (encolhe e volta com mola). */
export function Marca({ ativa, tipo = 'check' }: { ativa: boolean; tipo?: 'check' | 'radio' }) {
  const escala = useSharedValue(1)
  const primeiro = useRef(true)

  useEffect(() => {
    // na abertura da tela as marcas ja aparecem prontas, sem pular
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    if (!ativa) return
    escala.set(
      withSequence(
        withTiming(0.8, { duration: motion.instant, reduceMotion: ReduceMotion.System }),
        withSpring(1, molaPop),
      ),
    )
  }, [ativa, escala])

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }))

  if (tipo === 'radio') {
    return (
      <Animated.View style={[s.radio, ativa && s.radioAtivo, pop]}>
        {ativa ? <View style={s.radioMiolo} /> : null}
      </Animated.View>
    )
  }
  return (
    <Animated.View style={[s.check, ativa && s.checkAtivo, pop]}>
      {ativa ? <Icone nome="check" cor={color.bg} tamanho={14} /> : null}
    </Animated.View>
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
    <Pressionavel
      onPress={onPress}
      escala={0.98}
      opacidade={0.7}
      style={s.linha}
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
    </Pressionavel>
  )
}

/**
 * Linha com chave liga/desliga. A chave e desenhada aqui (e nao o Switch
 * do sistema) para o polegar deslizar com mola igual no iPhone e na web;
 * o fundo roxo acende por opacidade. A linha inteira e o alvo de toque.
 */
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
  const ligado = useSharedValue(valor ? 1 : 0)

  useEffect(() => {
    ligado.set(withSpring(valor ? 1 : 0, molaDeslize))
  }, [valor, ligado])

  const polegar = useAnimatedStyle(() => ({
    transform: [{ translateX: ligado.get() * (CHAVE.largura - CHAVE.polegar - 4) }],
  }))
  const aceso = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, ligado.get())),
  }))

  return (
    <Pressable
      onPress={() => onChange(!valor)}
      style={s.linha}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={titulo}
      accessibilityHint={legenda}>
      <View style={s.linhaTexto}>
        <Text style={s.linhaTitulo}>{titulo}</Text>
        <Text style={s.legenda}>{legenda}</Text>
      </View>
      <View style={s.chave}>
        <Animated.View style={[StyleSheet.absoluteFill, s.chaveAcesa, aceso]} />
        <Animated.View style={[s.chavePolegar, polegar]} />
      </View>
    </Pressable>
  )
}

/** Medidas da chave, as mesmas do Switch do iOS. */
const CHAVE = { largura: 51, altura: 31, polegar: 27 }

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
 * Marca embaixo de um dia: so o tom (bolinha verde ou ambar) ou, na forma
 * de objeto, o tom com as iniciais de quem esta escalado e o texto para o
 * leitor de tela. Na forma de objeto o dia tambem ganha um fundo suave.
 */
export type MarcaDia =
  'ok' | 'pendente' | { tom: 'ok' | 'pendente'; iniciais?: string[]; rotulo?: string }

/** Medidas do calendario: o circulo do dia e a altura de cada semana. */
const MIOLO = 34
const LINHA = 42
const LINHA_COM_INICIAIS = 60
const topoDoMiolo = (altura: number) => (altura === LINHA ? (LINHA - MIOLO) / 2 : 2)

/**
 * Calendario de um mes. Sem Intl: o Hermes do Expo Go nao tem os dados
 * de pt-BR, entao nome de mes e dia da semana saem de tabela propria.
 * `faixa` pinta um intervalo (filtros de periodo).
 *
 * Movimento: o mes novo entra deslizando do lado para onde se andou (com
 * fade, expoOut); o circulo do dia escolhido anda ate o dia novo com mola;
 * os dias marcados acendem em onda (25ms de um para o outro) quando o mes
 * aparece e de novo sempre que `onda` muda. Hoje ganha um anel discreto.
 * Com "reduzir movimento" ligado, tudo vai direto ao fim.
 */
export function Calendario({
  ano,
  mes,
  selecionado,
  faixa,
  marcas,
  hoje,
  onda,
  comIniciais,
  onEscolher,
  onMudarMes,
}: {
  ano: number
  mes: number
  selecionado?: number
  faixa?: { de: number; ate: number }
  /** bolinha embaixo do dia: verde (tudo certo) ou ambar (falta algo); ou com iniciais */
  marcas?: Record<number, MarcaDia>
  /** o dia de hoje neste mes, com anel. Sem a prop, o calendario acha sozinho; null = nenhum */
  hoje?: number | null
  /** mudar este valor acende os dias marcados de novo, em onda */
  onda?: string | number
  /** reserva espaco embaixo de cada dia para as iniciais das marcas */
  comIniciais?: boolean
  /** sem ela, os dias so se veem (nao se tocam) */
  onEscolher?: (dia: number) => void
  onMudarMes: (delta: number) => void
}) {
  // para que lado o mes andou: o novo entra vindo dali (0 = sem animar)
  const [direcao, setDirecao] = useState(0)
  const [largura, setLargura] = useState(0)

  const primeiro = new Date(ano, mes, 1).getDay()
  const total = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ]
  while (celulas.length % 7) celulas.push(null)

  const agora = new Date()
  const diaDeHoje =
    hoje !== undefined
      ? hoje
      : agora.getFullYear() === ano && agora.getMonth() === mes
        ? agora.getDate()
        : null
  const altura = comIniciais ? LINHA_COM_INICIAIS : LINHA
  // a ordem da onda: os dias marcados em ordem de data
  const marcados = Object.keys(marcas ?? {})
    .map(Number)
    .filter((d) => d >= 1 && d <= total)
    .sort((a, b) => a - b)
  // com faixa, as pontas acendem cada uma no seu dia; sem faixa, um circulo so anda
  const indiceEscolhido =
    !faixa && selecionado !== undefined && selecionado >= 1 && selecionado <= total
      ? primeiro + selecionado - 1
      : null

  const mudar = (delta: number) => {
    setDirecao(delta)
    onMudarMes(delta)
  }
  const deslize =
    direcao === 0
      ? undefined
      : (direcao > 0 ? FadeInRight : FadeInLeft)
          .withInitialValues({ opacity: 0, transform: [{ translateX: direcao > 0 ? 28 : -28 }] })
          .duration(motion.medium)
          .easing(motion.expoOut)
          .reduceMotion(ReduceMotion.System)

  return (
    <View style={s.calendarioBloco}>
      <SeletorPeriodo
        rotulo={`${MESES[mes]} de ${ano}`}
        onAnterior={() => mudar(-1)}
        onProximo={() => mudar(1)}
      />
      <View style={s.calendario}>
        <View style={s.semana}>
          {DIAS.map((d, i) => (
            <Text key={i} style={s.diaSemana}>
              {d}
            </Text>
          ))}
        </View>
        <View style={s.calendarioJanela}>
          <Animated.View
            key={`${ano}-${mes}`}
            entering={deslize}
            style={s.calendarioGrade}
            onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
            {indiceEscolhido !== null && largura > 0 ? (
              <PilulaDoDia indice={indiceEscolhido} largura={largura} altura={altura} />
            ) : null}
            {Array.from({ length: celulas.length / 7 }, (_, l) => (
              <View key={l} style={s.semana}>
                {celulas
                  .slice(l * 7, l * 7 + 7)
                  .map((dia, i) =>
                    dia === null ? (
                      <View key={i} style={[s.dia, { height: altura }]} />
                    ) : (
                      <DiaDoMes
                        key={i}
                        dia={dia}
                        altura={altura}
                        ativo={dia === selecionado}
                        naFaixa={!!faixa && dia >= faixa.de && dia <= faixa.ate}
                        ponta={!!faixa && (dia === faixa.de || dia === faixa.ate)}
                        eHoje={dia === diaDeHoje}
                        marca={marcas?.[dia]}
                        ordem={marcados.indexOf(dia)}
                        onda={onda}
                        comIniciais={!!comIniciais}
                        onEscolher={onEscolher}
                      />
                    ),
                  )}
              </View>
            ))}
          </Animated.View>
        </View>
      </View>
    </View>
  )
}

/** Um dia do calendario. As marcas acendem em onda: escala + fade, na vez do dia. */
function DiaDoMes({
  dia,
  altura,
  ativo,
  naFaixa,
  ponta,
  eHoje,
  marca,
  ordem,
  onda,
  comIniciais,
  onEscolher,
}: {
  dia: number
  altura: number
  ativo: boolean
  naFaixa: boolean
  ponta: boolean
  eHoje: boolean
  marca: MarcaDia | undefined
  ordem: number
  onda: string | number | undefined
  comIniciais: boolean
  onEscolher?: (dia: number) => void
}) {
  const luz = useSharedValue(0)
  const temMarca = !!marca

  useEffect(() => {
    if (!temMarca) return
    luz.set(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(
          Math.max(0, ordem) * motion.stagger,
          withTiming(1, {
            duration: motion.medium,
            easing: motion.expoOut,
            reduceMotion: ReduceMotion.System,
          }),
          ReduceMotion.System,
        ),
      ),
    )
  }, [temMarca, ordem, onda, luz])

  const brilho = useAnimatedStyle(() => ({
    opacity: luz.get(),
    transform: [{ scale: 0.6 + 0.4 * luz.get() }],
  }))

  const tom = typeof marca === 'object' ? marca.tom : marca
  const iniciais = typeof marca === 'object' ? (marca.iniciais ?? []) : []
  const rotulo =
    typeof marca === 'object' && marca.rotulo
      ? `, ${marca.rotulo}`
      : tom === 'pendente'
        ? ', falta técnico'
        : tom === 'ok'
          ? ', tudo certo'
          : ''
  const corTom = tom === 'pendente' ? color.warn : color.success
  const destaque = ativo || ponta

  return (
    <Pressable
      disabled={!onEscolher}
      onPress={() => onEscolher?.(dia)}
      style={[s.dia, { height: altura, paddingTop: topoDoMiolo(altura) }, naFaixa && s.diaFaixa]}
      accessibilityRole={onEscolher ? 'button' : 'text'}
      accessibilityLabel={`Dia ${dia}${eHoje ? ', hoje' : ''}${rotulo}`}
      accessibilityState={{ selected: destaque }}>
      <View style={[s.diaMiolo, eHoje && s.diaHoje]}>
        {typeof marca === 'object' ? (
          <Animated.View
            pointerEvents="none"
            style={[s.diaTinta, tom === 'pendente' ? s.diaTintaAmbar : s.diaTintaVerde, brilho]}
          />
        ) : null}
        {ponta ? <FundoDia ativo /> : null}
        <Text style={[s.diaTexto, destaque && s.diaTextoAtivo]}>{dia}</Text>
      </View>
      {tom && comIniciais && typeof marca === 'object' ? (
        <Animated.View style={[s.diaIniciais, brilho]} pointerEvents="none">
          {iniciais.length ? (
            <>
              {iniciais.slice(0, iniciais.length > 2 ? 1 : 2).map((ini, k) => (
                <View
                  key={k}
                  style={[s.diaInicial, k > 0 && s.diaInicialJunta, { borderColor: corTom }]}>
                  <Text style={s.diaInicialTexto}>{ini.slice(0, 2)}</Text>
                </View>
              ))}
              {iniciais.length > 2 ? (
                <Text style={s.diaInicialMais}>+{iniciais.length - 1}</Text>
              ) : null}
            </>
          ) : (
            <View style={[s.diaInicial, s.diaInicialVazia]}>
              <Text style={[s.diaInicialTexto, { color: color.warn }]}>?</Text>
            </View>
          )}
        </Animated.View>
      ) : tom ? (
        <Animated.View style={[s.diaMarca, { backgroundColor: corTom }, brilho]} />
      ) : null}
    </Pressable>
  )
}

/**
 * O circulo roxo do dia escolhido: um so, que anda de um dia para o outro
 * com mola (translateX/Y, thread de UI). Quando aparece, cresce no lugar
 * passando um pouco do ponto (backOut).
 */
function PilulaDoDia({
  indice,
  largura,
  altura,
}: {
  indice: number
  largura: number
  altura: number
}) {
  const celula = largura / 7
  const alvoX = (indice % 7) * celula + (celula - MIOLO) / 2
  const alvoY = Math.floor(indice / 7) * (altura + space.xs) + topoDoMiolo(altura)
  const x = useSharedValue(alvoX)
  const y = useSharedValue(alvoY)
  const aceso = useSharedValue(0)

  useEffect(() => {
    x.set(withSpring(alvoX, molaDeslize))
    y.set(withSpring(alvoY, molaDeslize))
  }, [alvoX, alvoY, x, y])

  useEffect(() => {
    aceso.set(
      withTiming(1, {
        duration: motion.medium,
        easing: motion.backOut,
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [aceso])

  const estilo = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, aceso.get() * 2)),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: 0.5 + 0.5 * aceso.get() },
    ],
  }))

  return <Animated.View pointerEvents="none" style={[s.pilulaDia, estilo]} />
}

/**
 * O circulo roxo das pontas de uma faixa. Quando a ponta muda, ele cresce
 * no dia novo passando um pouco do ponto (backOut).
 */
function FundoDia({ ativo }: { ativo: boolean }) {
  const aceso = useSharedValue(0)

  useEffect(() => {
    aceso.set(
      ativo
        ? withTiming(1, {
            duration: motion.medium,
            easing: motion.backOut,
            reduceMotion: ReduceMotion.System,
          })
        : withTiming(0, { duration: motion.instant, reduceMotion: ReduceMotion.System }),
    )
  }, [ativo, aceso])

  const estilo = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, aceso.get() * 2)),
    transform: [{ scale: 0.5 + 0.5 * aceso.get() }],
  }))

  return <Animated.View pointerEvents="none" style={[s.diaAtivo, estilo]} />
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
  rodape: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: space.sm,
  },
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
  chave: {
    width: CHAVE.largura,
    height: CHAVE.altura,
    borderRadius: CHAVE.altura / 2,
    backgroundColor: color.surface2,
    overflow: 'hidden',
  },
  chaveAcesa: { backgroundColor: onDark.fill },
  chavePolegar: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: CHAVE.polegar,
    height: CHAVE.polegar,
    borderRadius: CHAVE.polegar / 2,
    backgroundColor: color.text,
  },
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
  // a janela corta o mes que entra deslizando; a grade e a medida da pilula
  calendarioJanela: { overflow: 'hidden' },
  calendarioGrade: { gap: space.xs },
  semana: { flexDirection: 'row' },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    paddingVertical: space.xs,
  },
  dia: { flex: 1, alignItems: 'center' },
  diaFaixa: { backgroundColor: color.primaryDk },
  diaMiolo: {
    width: MIOLO,
    height: MIOLO,
    borderRadius: MIOLO / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaAtivo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: MIOLO / 2,
    backgroundColor: onDark.fill,
  },
  pilulaDia: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MIOLO,
    height: MIOLO,
    borderRadius: MIOLO / 2,
    backgroundColor: onDark.fill,
  },
  diaTinta: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: MIOLO / 2,
  },
  diaTintaVerde: { backgroundColor: 'rgba(61, 214, 140, 0.16)' },
  diaTintaAmbar: {
    backgroundColor: 'rgba(245, 165, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 36, 0.6)',
  },
  diaTexto: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text },
  diaTextoAtivo: { fontFamily: 'Inter_700Bold' },
  // anel discreto do dia de hoje
  diaHoje: { borderWidth: 1.5, borderColor: 'rgba(194, 75, 238, 0.55)' },
  diaMarca: { position: 'absolute', bottom: 1, width: 5, height: 5, borderRadius: 3 },
  diaIniciais: {
    marginTop: 3,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaInicial: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
    borderWidth: 1,
  },
  diaInicialJunta: { marginLeft: -5 },
  diaInicialVazia: { borderColor: color.warn, borderStyle: 'dashed' },
  diaInicialTexto: {
    fontSize: 8,
    lineHeight: 10,
    fontFamily: 'Inter_700Bold',
    color: color.text,
  },
  diaInicialMais: {
    marginLeft: 1,
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: color.muted,
  },
})
