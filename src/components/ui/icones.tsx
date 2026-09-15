import Svg, { Circle, Path, Rect } from 'react-native-svg'

/**
 * Icones dos tres setores, em SVG.
 *
 * Tracejado, nao preenchido: o preenchimento no design vem da pilula
 * ativa atras do icone, nao do desenho.
 */
type Props = { size?: number; cor: string }

export function IconeJogo({ size = 24, cor }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={5} width={19} height={14} rx={2} stroke={cor} strokeWidth={1.8} />
      <Path d="M12 5v14" stroke={cor} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={2.6} stroke={cor} strokeWidth={1.8} />
      <Path d="M2.5 9.2h3v5.6h-3M21.5 9.2h-3v5.6h3" stroke={cor} strokeWidth={1.8} />
    </Svg>
  )
}

export function IconeSecretaria({ size = 24, cor }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 20v-7M12 20V4M19 20v-11" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  )
}

export function IconeEstudo({ size = 24, cor }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.5C10.6 5.2 8.6 4.6 6 4.6c-.9 0-1.6.1-2.2.2v13c.6-.1 1.3-.2 2.2-.2 2.6 0 4.6.6 6 1.9M12 6.5c1.4-1.3 3.4-1.9 6-1.9.9 0 1.6.1 2.2.2v13c-.6-.1-1.3-.2-2.2-.2-2.6 0-4.6.6-6 1.9M12 6.5v13"
        stroke={cor}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  )
}
