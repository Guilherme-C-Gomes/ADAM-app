import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Rect } from 'react-native-svg'

import type { PosicaoTatica } from '@/data/jogo'
import { color, type } from '@/theme/tokens'

/**
 * Campo de futebol com os jogadores posicionados.
 *
 * As posicoes chegam em fracao do campo (R5), nunca em pixel: a mesma
 * formacao serve para o campo de 11 e o de 7, e para qualquer largura
 * de tela. O desenho e SVG; os jogadores sao Views por cima, porque
 * numero dentro de circulo fica melhor com texto nativo.
 */
const RELVA = '#123D2A'
const LINHA = 'rgba(255,255,255,0.28)'
const FICHA = 34

export function Campo({
  posicoes,
  largura,
  onTocarJogador,
}: {
  posicoes: PosicaoTatica[]
  largura: number
  onTocarJogador?: (numero: number) => void
}) {
  const altura = Math.round(largura * 1.16)

  return (
    <View style={[s.wrapper, { width: largura, height: altura }]}>
      <Svg width={largura} height={altura}>
        <Rect x={0} y={0} width={largura} height={altura} rx={12} fill={RELVA} />
        <Rect
          x={8}
          y={8}
          width={largura - 16}
          height={altura - 16}
          rx={6}
          stroke={LINHA}
          strokeWidth={1.5}
          fill="none"
        />
        <Line x1={8} y1={altura / 2} x2={largura - 8} y2={altura / 2} stroke={LINHA} strokeWidth={1.5} />
        <Circle cx={largura / 2} cy={altura / 2} r={largura * 0.14} stroke={LINHA} strokeWidth={1.5} fill="none" />
        <Circle cx={largura / 2} cy={altura / 2} r={2} fill={LINHA} />

        {/* areas: a do ADAM embaixo, a do adversario em cima */}
        <Rect
          x={largura * 0.22}
          y={8}
          width={largura * 0.56}
          height={altura * 0.14}
          stroke={LINHA}
          strokeWidth={1.5}
          fill="none"
        />
        <Rect
          x={largura * 0.22}
          y={altura - 8 - altura * 0.14}
          width={largura * 0.56}
          height={altura * 0.14}
          stroke={LINHA}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>

      {posicoes.map((p) => (
        <View
          key={p.numero}
          style={[
            s.ficha,
            {
              // fy 0 e a linha de fundo do ADAM, que na tela fica embaixo
              left: p.fx * (largura - FICHA) ,
              top: (1 - p.fy) * (altura - FICHA),
            },
          ]}
          accessibilityRole={onTocarJogador ? 'button' : 'image'}
          accessibilityLabel={`Jogador ${p.numero}`}>
          <Text style={s.fichaNumero}>{p.numero}</Text>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  wrapper: { alignSelf: 'center' },
  ficha: {
    position: 'absolute',
    width: FICHA,
    height: FICHA,
    borderRadius: FICHA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fichaNumero: { ...type.caption, fontFamily: 'Inter_700Bold', color: color.onPrimary },
})
