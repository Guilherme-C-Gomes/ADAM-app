/**
 * Dados de demonstracao do setor Jogo.
 *
 * Ficticios, como o resto do prototipo. As regras que moldam estes tipos
 * estao no documento de estrutura: turma sai da idade (R1), categoria do
 * jogo define elegibilidade (R2), modalidade define quantos entram em
 * campo (R3), posicao na tatica e fracao do campo e nunca pixel (R5),
 * "a definir" e estado valido e visivel (R7).
 */

export type CategoriaExercicio = 'Aquecimento' | 'Técnica' | 'Tático' | 'Jogo' | 'Físico'

export type Exercicio = {
  id: string
  nome: string
  categoria: CategoriaExercicio
  duracaoMin: number
  material?: string
}

export const exercicios: Exercicio[] = [
  { id: 'e1', nome: 'Aquecimento e mobilidade', categoria: 'Aquecimento', duracaoMin: 10 },
  { id: 'e2', nome: 'Passe curto em duplas', categoria: 'Técnica', duracaoMin: 15, material: '1 bola por dupla' },
  { id: 'e3', nome: 'Domínio orientado', categoria: 'Técnica', duracaoMin: 12, material: '8 cones' },
  { id: 'e4', nome: 'Recepção com bola rasteira', categoria: 'Técnica', duracaoMin: 15 },
  { id: 'e5', nome: 'Condução em zigue-zague', categoria: 'Técnica', duracaoMin: 10, material: '10 cones' },
  { id: 'e6', nome: 'Jogo reduzido 3 × 3', categoria: 'Jogo', duracaoMin: 20, material: '4 coletes' },
  { id: 'e7', nome: 'Finalização em dupla', categoria: 'Tático', duracaoMin: 15 },
]

export type Turma = 'Pequenos' | 'Maiores'

export type ExercicioDoTreino = {
  exercicioId: string
  /** Copiada do exercicio, editavel no plano. */
  duracaoMin: number
  feito: boolean
}

export type Treino = {
  id: string
  turma: Turma
  /** Rotulo curto: "sáb 12/09". */
  data: string
  hora: string
  local: string
  /** null = "a definir" (R7). */
  responsavel: string | null
  hoje: boolean
  exercicios: ExercicioDoTreino[]
}

export const treinos: Treino[] = [
  {
    id: 't1',
    turma: 'Pequenos',
    data: 'sáb 05/09',
    hora: '08h',
    local: 'Praça Olímpia',
    responsavel: 'Marina Alves',
    hoje: true,
    exercicios: [
      { exercicioId: 'e1', duracaoMin: 10, feito: true },
      { exercicioId: 'e2', duracaoMin: 15, feito: true },
      { exercicioId: 'e3', duracaoMin: 12, feito: true },
      { exercicioId: 'e4', duracaoMin: 15, feito: false },
      { exercicioId: 'e6', duracaoMin: 20, feito: false },
    ],
  },
  {
    id: 't2',
    turma: 'Maiores',
    data: 'sáb 05/09',
    hora: '10h',
    local: 'Praça Olímpia',
    responsavel: 'Chico Barbosa',
    hoje: true,
    exercicios: [
      { exercicioId: 'e1', duracaoMin: 10, feito: false },
      { exercicioId: 'e5', duracaoMin: 10, feito: false },
      { exercicioId: 'e7', duracaoMin: 15, feito: false },
    ],
  },
  {
    id: 't3',
    turma: 'Pequenos',
    data: 'sáb 12/09',
    hora: '08h',
    local: 'Praça Olímpia',
    responsavel: 'Marina Alves',
    hoje: false,
    exercicios: [
      { exercicioId: 'e1', duracaoMin: 10, feito: false },
      { exercicioId: 'e2', duracaoMin: 15, feito: false },
      { exercicioId: 'e3', duracaoMin: 12, feito: false },
      { exercicioId: 'e4', duracaoMin: 15, feito: false },
    ],
  },
  {
    id: 't4',
    turma: 'Maiores',
    data: 'sáb 12/09',
    hora: '10h',
    local: 'Praça Olímpia',
    responsavel: null,
    hoje: false,
    exercicios: [],
  },
]

/** Escala da semana: quem cobre cada horario (tela 11e). */
export type LinhaEscala = {
  id: string
  dia: string
  hora: string
  tecnico: string | null
  turma: Turma
}

export const escalaSemana: LinhaEscala[] = [
  { id: 'x1', dia: 'Sáb', hora: '08h', tecnico: 'Marina Alves', turma: 'Pequenos' },
  { id: 'x2', dia: 'Sáb', hora: '10h', tecnico: 'Chico Barbosa', turma: 'Maiores' },
  { id: 'x3', dia: 'Qua', hora: '19h', tecnico: null, turma: 'Pequenos' },
  { id: 'x4', dia: 'Qua', hora: '20h', tecnico: null, turma: 'Maiores' },
]

export const MODALIDADES = ['Campo', 'Society', 'Fut7'] as const
export type Modalidade = (typeof MODALIDADES)[number]

/** R3: campo leva 11 em campo; society e fut7 levam 7. */
export function jogadoresEmCampo(modalidade: Modalidade) {
  return modalidade === 'Campo' ? 11 : 7
}

export type Partida = {
  id: string
  adversario: string
  categoria: string
  modalidade: Modalidade
  dia: string
  /** DD/MM, para a mensagem da convocacao. */
  data: string
  hora: string
  local: string
}

export const partidas: Partida[] = [
  { id: 'j1', adversario: 'São Bento', categoria: 'Sub-14', modalidade: 'Campo', dia: 'domingo', data: '06/09', hora: '15h', local: 'Campo do Guarani' },
  { id: 'j2', adversario: 'Vila Nova', categoria: 'Sub-17', modalidade: 'Society', dia: 'domingo', data: '06/09', hora: '17h', local: 'Campo do Guarani' },
  { id: 'j3', adversario: 'Olímpico', categoria: 'Sub-12', modalidade: 'Fut7', dia: 'sábado', data: '12/09', hora: '09h', local: 'Praça Olímpia' },
]

export const campeonato = {
  nome: 'Campeonato Regional',
  rodada: '3ª rodada',
  posicao: '2º lugar',
  pontos: 10,
  jogos: 3,
}

/**
 * R5: cada posicao e uma fracao do campo (0 a 1), entao a mesma formacao
 * serve para o campo de 11 e para o de 7, e para qualquer tamanho de tela.
 * fy 0 e a linha de fundo do ADAM, fy 1 e o ataque.
 */
export type PosicaoTatica = { numero: number; fx: number; fy: number }

export const FORMACOES_CAMPO = ['4-4-2', '4-3-3', '3-5-2'] as const
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
    ? { nomes: FORMACOES_CAMPO as readonly string[], mapa: formacoes as Record<string, PosicaoTatica[]> }
    : { nomes: FORMACOES_7 as readonly string[], mapa: formacoes7 as Record<string, PosicaoTatica[]> }
}

export type SituacaoConvocacao = 'Em campo' | 'Banco'

export type Convocacao = {
  participanteId: string
  situacao: SituacaoConvocacao
}

/** Convocacao do jogo j1 (ADAM × São Bento, Sub-14, campo: 11 + banco). */
export const convocacoes: Record<string, Convocacao[]> = {
  j1: [
    { participanteId: '13', situacao: 'Em campo' },
    { participanteId: '14', situacao: 'Em campo' },
    { participanteId: '15', situacao: 'Em campo' },
    { participanteId: '16', situacao: 'Em campo' },
    { participanteId: '17', situacao: 'Em campo' },
    { participanteId: '18', situacao: 'Em campo' },
    { participanteId: '19', situacao: 'Em campo' },
    { participanteId: '20', situacao: 'Em campo' },
    { participanteId: '21', situacao: 'Em campo' },
    { participanteId: '22', situacao: 'Em campo' },
    { participanteId: '23', situacao: 'Em campo' },
    { participanteId: '24', situacao: 'Banco' },
    { participanteId: '26', situacao: 'Banco' },
    { participanteId: '11', situacao: 'Banco' },
  ],
  j2: [],
  j3: [],
}

/**
 * R2: "Sub-14" quer dizer 13 e 14 anos, e a lista de elegiveis sai da
 * idade no cadastro. Nao existe lista de convocaveis mantida a mao.
 */
export function idadesDaCategoria(categoria: string) {
  const teto = Number(categoria.replace(/\D/g, ''))
  return Number.isFinite(teto) && teto > 0 ? { min: teto - 1, max: teto } : { min: 0, max: 99 }
}

/** Ultima avaliacao de treino (tela 11m alimenta o card da aba Treinos). */
export const avaliacaoRecente = {
  avaliados: 12,
  treino: 4.2,
  entenderam: 3.8,
  dificuldade: 2.4,
}

/** R9: so "entenderam" abaixo de 3 vira alerta. */
export const LIMITE_COMPREENSAO = 3
