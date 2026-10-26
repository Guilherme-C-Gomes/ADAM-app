import { router, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { AdamSymbol, AdamWordmark } from '@/components/brand/adam-mark'
import { Avatar } from '@/components/ui'
import { usePerfil } from '@/data/perfis'
import type { NomeIcone } from '@/components/ui/icone'
import { Icone } from '@/components/ui/icone'
import { usePilulaDeslizante } from '@/components/ui/movimento'
import { voltar } from '@/lib/navegacao'
import { color, onDark, radius, space, target, type } from '@/theme/tokens'

/**
 * Cabecalho de tela de setor: marca, perfil, titulo e subtitulo.
 *
 * O selo do perfil diz quem esta usando o app. Para o ADM ele e a porta
 * para Ajustes; para os outros, para a propria conta — Ajustes do app e
 * so de quem administra. A marca volta para a Home, que tem estatistica,
 * entao so quem ve dado sensivel vai para la; os outros voltam para a
 * Chamada.
 */
export function HeroSetor({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  const { rotulo, pessoa, veDadosSensiveis } = usePerfil()

  return (
    <View style={s.hero}>
      <View style={s.topo}>
        <Pressable
          onPress={() => router.navigate(veDadosSensiveis ? '/inicio' : '/chamada')}
          style={({ pressed }) => [s.marca, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Ir para o início">
          <AdamSymbol size={22} />
          <AdamWordmark fontSize={16} />
        </Pressable>

        {/* a foto de quem esta logado (ou as iniciais) abre a propria conta:
            senha, foto, nome e e-mail. O ADM chega aos Ajustes por la. */}
        <Pressable
          onPress={() => router.push('/ajustes/conta')}
          hitSlop={space.sm}
          style={({ pressed }) => [s.foto, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${pessoa.nome || rotulo} · abrir minha conta`}>
          <Avatar iniciais={pessoa.iniciais || '?'} size={36} foto={pessoa.foto} />
        </Pressable>
      </View>

      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.subtitulo}>{subtitulo}</Text>
    </View>
  )
}

type Acao = { icone: NomeIcone; rotulo: string; onPress: () => void }

/**
 * A linha de cima de toda tela empilhada: voltar na margem esquerda e, se a
 * tela tiver, uma acao na margem direita. Mora num lugar so para as telas
 * nunca voltarem a desenhar o proprio voltar — foi assim que quatro delas
 * ficaram com um circulo atras da seta e sem o fundo do cabecalho.
 */
function TopoVoltar({ acao, voltarPara }: { acao?: Acao; voltarPara?: Href }) {
  return (
    <View style={s.topo}>
      <Pressable
        onPress={() => voltar(voltarPara)}
        hitSlop={space.sm}
        style={({ pressed }) => [s.voltar, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Voltar">
        <Icone nome="voltar" cor={color.text} tamanho={22} />
      </Pressable>

      {acao ? (
        <Pressable
          onPress={acao.onPress}
          hitSlop={space.sm}
          style={({ pressed }) => [s.voltar, s.acao, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={acao.rotulo}>
          <Icone nome={acao.icone} cor={color.text} tamanho={20} />
        </Pressable>
      ) : null}
    </View>
  )
}

/** Cabecalho de tela empilhada: voltar, titulo e subtitulo. */
export function HeroVoltar({
  titulo,
  subtitulo,
  acao,
  voltarPara,
}: {
  titulo: string
  subtitulo: string
  acao?: Acao
  /** para onde o voltar leva quando nao ha historico (web recarregada) */
  voltarPara?: Href
}) {
  return (
    <View style={s.hero}>
      <TopoVoltar acao={acao} voltarPara={voltarPara} />
      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.subtitulo}>{subtitulo}</Text>
    </View>
  )
}

/**
 * Cabecalho da ficha de uma pessoa (tela 06): o mesmo fundo e o mesmo topo
 * do HeroVoltar, com a foto e o nome no centro, como no design.
 */
export function HeroPerfil({
  iniciais,
  nome,
  meta,
  foto,
  acao,
}: {
  iniciais: string
  nome: string
  meta: string
  foto?: string | null
  acao?: Acao
}) {
  return (
    <View style={s.hero}>
      <TopoVoltar acao={acao} />
      <View style={s.perfil}>
        <Avatar iniciais={iniciais} size={68} foto={foto} />
        <Text style={s.perfilNome}>{nome}</Text>
        <Text style={s.subtitulo}>{meta}</Text>
      </View>
    </View>
  )
}

/**
 * Abas internas de um setor (Treinos · Jogos · Escala). A pilula roxa
 * desliza ate a aba escolhida, em vez de trocar de lugar num piscar.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: readonly T[]
  valor: T
  onChange: (v: T) => void
}) {
  const pilula = usePilulaDeslizante(valor)
  return (
    <View style={s.segmentado}>
      {/* trilho sem padding nem borda: a medida de cada aba vale para a
          pilula absoluta */}
      <View style={s.segmentoTrilho}>
        {pilula.medida ? (
          <Animated.View
            pointerEvents="none"
            style={[
              s.segmentoPilula,
              {
                top: pilula.medida.y,
                width: pilula.medida.largura,
                height: pilula.medida.altura,
              },
              pilula.estilo,
            ]}
          />
        ) : null}
        {opcoes.map((o) => {
          const ativo = o === valor
          return (
            <Pressable
              key={o}
              onLayout={pilula.medir(o)}
              onPress={() => onChange(o)}
              style={({ pressed }) => [
                s.segmento,
                // ate a pilula ser medida, a aba ativa pinta o proprio fundo
                ativo && !pilula.medida && s.segmentoAtivo,
                pressed && s.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}>
              <Text style={[s.segmentoRotulo, ativo && s.segmentoRotuloAtivo]}>{o}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    gap: space.xs,
    backgroundColor: color.surface,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: target.minimo },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.surface2,
  },
  pillAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: onDark.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFoto: { width: 18, height: 18 },
  foto: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: color.surface2,
  },
  pillInicial: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.text },
  pillRotulo: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  titulo: { ...type.h1, fontFamily: 'Inter_700Bold', color: color.text },
  subtitulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  // Feedback de toque do design: escala 0.97 junto da opacidade.
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },

  voltar: {
    width: target.minimo,
    height: target.minimo,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  acao: { alignItems: 'flex-end' },
  perfil: { alignItems: 'center', gap: space.xs, marginTop: -space.md },
  perfilNome: { ...type.h2, fontFamily: 'Inter_700Bold', color: color.text, marginTop: space.sm },

  segmentado: {
    flexDirection: 'row',
    padding: space.xs,
    borderRadius: radius.chip + space.xs,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  segmentoTrilho: { flex: 1, flexDirection: 'row' },
  segmentoPilula: {
    position: 'absolute',
    left: 0,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: onDark.fill,
  },
  segmento: {
    flex: 1,
    minHeight: target.minimo - space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  segmentoAtivo: { backgroundColor: onDark.fill },
  segmentoRotulo: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  segmentoRotuloAtivo: { fontFamily: 'Inter_600SemiBold', color: color.text },
})
