import { memo } from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

/**
 * Os icones de interface, desenhados — nunca caractere de texto.
 *
 * "‹", "›", "⌕", "✓", "✆" e companhia saem na fonte do sistema: cada um com
 * uma espessura, fora do eixo optico da linha, e o 🗑 ainda vira emoji
 * colorido no iPhone. Os desenhos abaixo sao os do Figma (svgkit.py do
 * gerador), no mesmo quadro de 18x18 e com o mesmo traço, para o app e o
 * design falarem a mesma lingua.
 */
export type NomeIcone =
  | 'voltar'
  | 'seta'
  | 'seta-esquerda'
  | 'busca'
  | 'check'
  | 'alerta'
  | 'info'
  | 'fechar'
  | 'mais'
  | 'menos'
  | 'telefone'
  | 'lixeira'
  | 'lapis'
  | 'video'
  | 'sync'
  | 'calendario'
  | 'play'
  | 'menu'
  | 'sobe'
  | 'desce'
  | 'documento'
  | 'camera'
  | 'galeria'

type Props = { nome: NomeIcone; cor: string; tamanho?: number; traco?: number }

export const Icone = memo(function Icone({ nome, cor, tamanho = 18, traco = 1.8 }: Props) {
  const t = { stroke: cor, strokeWidth: traco, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 18 18" fill="none">
      {desenho(nome, cor, t)}
    </Svg>
  )
})

type Traco = {
  stroke: string
  strokeWidth: number
  strokeLinecap: 'round'
  strokeLinejoin: 'round'
}

function desenho(nome: NomeIcone, cor: string, t: Traco) {
  switch (nome) {
    // o voltar do design: 10x18, traço 2, sem circulo em volta
    case 'voltar':
      return <Path d="M13 1.5L5 9l8 7.5" {...t} strokeWidth={2} />
    // a seta de "esta linha abre outra tela"
    case 'seta':
      return <Path d="M6.5 3.5L11.5 9l-5 5.5" {...t} />
    case 'seta-esquerda':
      return <Path d="M11.5 3.5L6.5 9l5 5.5" {...t} />
    case 'busca':
      return (
        <>
          <Circle cx={7.5} cy={7.5} r={5.8} {...t} strokeWidth={1.9} />
          <Path d="M11.8 11.8L16 16" {...t} strokeWidth={1.9} />
        </>
      )
    case 'check':
      return <Path d="M2.5 9.5l4 4L15 4.5" {...t} strokeWidth={2.2} />
    case 'alerta':
      return (
        <>
          <Circle cx={9} cy={9} r={7.9} {...t} />
          <Path d="M9 5v5" {...t} strokeWidth={2} />
          <Circle cx={9} cy={13} r={1.1} fill={cor} />
        </>
      )
    case 'info':
      return (
        <>
          <Circle cx={9} cy={9} r={7.9} {...t} />
          <Circle cx={9} cy={5.2} r={1.1} fill={cor} />
          <Path d="M9 8v5" {...t} strokeWidth={2} />
        </>
      )
    case 'fechar':
      return <Path d="M4.5 4.5l9 9M13.5 4.5l-9 9" {...t} strokeWidth={2} />
    case 'mais':
      return <Path d="M9 3v12M3 9h12" {...t} strokeWidth={2} />
    case 'menos':
      return <Path d="M3 9h12" {...t} strokeWidth={2} />
    case 'telefone':
      return (
        <Path
          d="M3 2h3.5l1.5 4-2 1.5a10 10 0 0 0 4.5 4.5l1.5-2 4 1.5v3.5a1.5 1.5 0 0 1-1.8 1.5C7 16 2 11 1.5 3.8A1.5 1.5 0 0 1 3 2z"
          {...t}
        />
      )
    case 'lixeira':
      return <Path d="M2 5h14M4 5v11h10V5M7 5V2.5h4V5M7.5 8.5v5M10.5 8.5v5" {...t} />
    case 'lapis':
      return <Path d="M11.5 2.5l4 4-9 9-4.5 1 1-4.5zM10 4l4 4" {...t} />
    case 'video':
      return (
        <>
          <Rect x={1} y={3} width={12} height={12} rx={2.5} {...t} />
          <Path d="M13 8l4-3v8l-4-3z" {...t} />
        </>
      )
    case 'sync':
      return <Path d="M16 8A7.5 7.5 0 1 0 13.6 13.8M16 2.5V8h-5.4" {...t} strokeWidth={1.9} />
    case 'calendario':
      return <Path d="M1 4h16v13H1zM1 8h16M5 1.5v4M13 1.5v4" {...t} />
    // triangulo cheio, deslocado para a direita: o centro optico de um play
    // nao e o centro da caixa
    case 'play':
      return <Path d="M6 3.5l8.5 5.5L6 14.5z" fill={cor} {...t} strokeWidth={1} />
    // os tres pontos do canto: o que nao e a acao principal da tela
    case 'menu':
      return (
        <>
          <Circle cx={9} cy={3.5} r={1.9} fill={cor} />
          <Circle cx={9} cy={9} r={1.9} fill={cor} />
          <Circle cx={9} cy={14.5} r={1.9} fill={cor} />
        </>
      )
    // subiu e caiu: numero nunca comunica so por cor, leva a seta
    case 'sobe':
      return <Path d="M9 14V4M5 8l4-4 4 4" {...t} strokeWidth={1.9} />
    case 'desce':
      return <Path d="M9 4v10M5 10l4 4 4-4" {...t} strokeWidth={1.9} />
    case 'documento':
      return <Path d="M3 1h8l4 4v12H3zM6 9h6M6 13h6" {...t} />
    case 'camera':
      return (
        <>
          <Path d="M1 5.5h3.5L6 3h5l1.5 2.5H16v10H1z" {...t} />
          <Circle cx={8.5} cy={10.5} r={3.4} {...t} />
        </>
      )
    case 'galeria':
      return (
        <>
          <Rect x={1} y={2.5} width={16} height={13} rx={2.5} {...t} />
          <Circle cx={5.8} cy={7} r={1.7} {...t} />
          <Path d="M2 13.5l5-4 4 3.5 2.5-2.5 2.5 3" {...t} />
        </>
      )
  }
}
