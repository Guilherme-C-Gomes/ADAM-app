/**
 * As regras do setor Jogo — nada de dado aqui (os dados moram no banco,
 * via data/jogo-dados.ts). Estao no documento de estrutura: turma sai da
 * idade (R1), categoria do jogo define elegibilidade (R2), modalidade define
 * quantos entram em campo (R3), posicao na tatica e fracao do campo e nunca
 * pixel (R5), "a definir" e estado valido e visivel (R7).
 */

export const CATEGORIAS_EXERCICIO = ['Aquecimento', 'Fundamentos', 'Físico', 'Tático'] as const
export type CategoriaExercicio = (typeof CATEGORIAS_EXERCICIO)[number]

/** Tela 11z: o que cada categoria quer dizer, para o treinador achar depois. */
export const DESCRICAO_CATEGORIA: Record<CategoriaExercicio, string> = {
  Aquecimento: 'Começo do treino: corpo e mobilidade',
  Fundamentos: 'Passe, domínio, recepção, condução',
  Físico: 'Arrancada, resistência, mudança de direção',
  Tático: 'Jogo reduzido, posicionamento, decisão',
}

export const MODALIDADES = ['Campo', 'Society'] as const
export type Modalidade = (typeof MODALIDADES)[number]

/** R4: a posicao em campo e opcional na ficha; quem nao tem so aparece em "Todos". */
export const POSICOES = ['Goleiro', 'Defesa', 'Meio', 'Ataque'] as const
export type FuncaoCampo = (typeof POSICOES)[number]

/** R3: campo leva 11 em campo; society leva 7. */
export function jogadoresEmCampo(modalidade: Modalidade) {
  return modalidade === 'Campo' ? 11 : 7
}

/** Tela 11v: categoria e faixa de idade. Quem convoca e a ficha (R2). */
export const CATEGORIAS = [
  'Sub-11',
  'Sub-12',
  'Sub-13',
  'Sub-14',
  'Sub-15',
  'Sub-16',
  'Sub-17',
] as const
export type Categoria = (typeof CATEGORIAS)[number]

/**
 * R5: cada posicao e uma fracao do campo (0 a 1), entao a mesma formacao
 * serve para o campo de 11 e para o de 7, e para qualquer tamanho de tela.
 * fy 0 e a linha de fundo do ADAM, fy 1 e o ataque.
 */
export type PosicaoTatica = { numero: number; fx: number; fy: number }

export const FORMACOES_CAMPO = ['4-4-2', '4-3-3', '3-5-2', '4-5-1', '4-3-2-1', '4-1-4-1'] as const
export type FormacaoCampo = (typeof FORMACOES_CAMPO)[number]

export const formacoes: Record<FormacaoCampo, PosicaoTatica[]> = {
  '4-4-2': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.16, fy: 0.28 },
    { numero: 3, fx: 0.38, fy: 0.26 },
    { numero: 4, fx: 0.62, fy: 0.26 },
    { numero: 5, fx: 0.84, fy: 0.28 },
    { numero: 6, fx: 0.16, fy: 0.55 },
    { numero: 7, fx: 0.4, fy: 0.55 },
    { numero: 8, fx: 0.6, fy: 0.55 },
    { numero: 9, fx: 0.84, fy: 0.55 },
    { numero: 10, fx: 0.38, fy: 0.82 },
    { numero: 11, fx: 0.62, fy: 0.82 },
  ],
  '4-3-3': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.16, fy: 0.28 },
    { numero: 3, fx: 0.38, fy: 0.26 },
    { numero: 4, fx: 0.62, fy: 0.26 },
    { numero: 5, fx: 0.84, fy: 0.28 },
    { numero: 6, fx: 0.3, fy: 0.54 },
    { numero: 7, fx: 0.5, fy: 0.5 },
    { numero: 8, fx: 0.7, fy: 0.54 },
    { numero: 9, fx: 0.18, fy: 0.82 },
    { numero: 10, fx: 0.5, fy: 0.86 },
    { numero: 11, fx: 0.82, fy: 0.82 },
  ],
  '3-5-2': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.26, fy: 0.26 },
    { numero: 3, fx: 0.5, fy: 0.24 },
    { numero: 4, fx: 0.74, fy: 0.26 },
    { numero: 5, fx: 0.12, fy: 0.54 },
    { numero: 6, fx: 0.34, fy: 0.52 },
    { numero: 7, fx: 0.5, fy: 0.58 },
    { numero: 8, fx: 0.66, fy: 0.52 },
    { numero: 9, fx: 0.88, fy: 0.54 },
    { numero: 10, fx: 0.38, fy: 0.84 },
    { numero: 11, fx: 0.62, fy: 0.84 },
  ],
  '4-5-1': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.16, fy: 0.28 },
    { numero: 3, fx: 0.38, fy: 0.26 },
    { numero: 4, fx: 0.62, fy: 0.26 },
    { numero: 5, fx: 0.84, fy: 0.28 },
    { numero: 6, fx: 0.1, fy: 0.56 },
    { numero: 7, fx: 0.3, fy: 0.54 },
    { numero: 8, fx: 0.5, fy: 0.56 },
    { numero: 9, fx: 0.7, fy: 0.54 },
    { numero: 10, fx: 0.9, fy: 0.56 },
    { numero: 11, fx: 0.5, fy: 0.86 },
  ],
  '4-3-2-1': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.16, fy: 0.28 },
    { numero: 3, fx: 0.38, fy: 0.26 },
    { numero: 4, fx: 0.62, fy: 0.26 },
    { numero: 5, fx: 0.84, fy: 0.28 },
    { numero: 6, fx: 0.26, fy: 0.48 },
    { numero: 7, fx: 0.5, fy: 0.46 },
    { numero: 8, fx: 0.74, fy: 0.48 },
    { numero: 9, fx: 0.36, fy: 0.68 },
    { numero: 10, fx: 0.64, fy: 0.68 },
    { numero: 11, fx: 0.5, fy: 0.88 },
  ],
  '4-1-4-1': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.16, fy: 0.26 },
    { numero: 3, fx: 0.38, fy: 0.24 },
    { numero: 4, fx: 0.62, fy: 0.24 },
    { numero: 5, fx: 0.84, fy: 0.26 },
    { numero: 6, fx: 0.5, fy: 0.42 },
    { numero: 7, fx: 0.14, fy: 0.62 },
    { numero: 8, fx: 0.38, fy: 0.6 },
    { numero: 9, fx: 0.62, fy: 0.6 },
    { numero: 10, fx: 0.86, fy: 0.62 },
    { numero: 11, fx: 0.5, fy: 0.86 },
  ],
}

export const FORMACOES_7 = ['2-3-1', '3-2-1', '2-2-2'] as const
export type Formacao7 = (typeof FORMACOES_7)[number]

export const formacoes7: Record<Formacao7, PosicaoTatica[]> = {
  '2-3-1': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.3, fy: 0.3 },
    { numero: 3, fx: 0.7, fy: 0.3 },
    { numero: 4, fx: 0.18, fy: 0.58 },
    { numero: 5, fx: 0.5, fy: 0.56 },
    { numero: 6, fx: 0.82, fy: 0.58 },
    { numero: 7, fx: 0.5, fy: 0.86 },
  ],
  '3-2-1': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.2, fy: 0.3 },
    { numero: 3, fx: 0.5, fy: 0.27 },
    { numero: 4, fx: 0.8, fy: 0.3 },
    { numero: 5, fx: 0.34, fy: 0.6 },
    { numero: 6, fx: 0.66, fy: 0.6 },
    { numero: 7, fx: 0.5, fy: 0.86 },
  ],
  '2-2-2': [
    { numero: 1, fx: 0.5, fy: 0.08 },
    { numero: 2, fx: 0.3, fy: 0.3 },
    { numero: 3, fx: 0.7, fy: 0.3 },
    { numero: 4, fx: 0.3, fy: 0.58 },
    { numero: 5, fx: 0.7, fy: 0.58 },
    { numero: 6, fx: 0.34, fy: 0.86 },
    { numero: 7, fx: 0.66, fy: 0.86 },
  ],
}

/** R3 de novo: a lista de formacoes depende da modalidade. */
export function formacoesDe(modalidade: Modalidade) {
  return modalidade === 'Campo'
    ? {
        nomes: FORMACOES_CAMPO as readonly string[],
        mapa: formacoes as Record<string, PosicaoTatica[]>,
      }
    : {
        nomes: FORMACOES_7 as readonly string[],
        mapa: formacoes7 as Record<string, PosicaoTatica[]>,
      }
}

/**
 * R2: "Sub-14" quer dizer 13 e 14 anos, e a lista de elegiveis sai da
 * idade no cadastro. Nao existe lista de convocaveis mantida a mao.
 */
export function idadesDaCategoria(categoria: string) {
  const teto = Number(categoria.replace(/\D/g, ''))
  return Number.isFinite(teto) && teto > 0 ? { min: teto - 1, max: teto } : { min: 0, max: 99 }
}

/** R9: so "entenderam" abaixo de 3 vira alerta. */
export const LIMITE_COMPREENSAO = 3

/** "Marina Alves" -> "MA" */
export function iniciaisDe(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
