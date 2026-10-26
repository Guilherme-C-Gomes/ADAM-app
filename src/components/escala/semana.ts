import { fraseDaSemana } from '@/components/escala/frase'
import { HORARIO, type Turma } from '@/data/chamada'
import type { LinhaEscala, PessoaEquipe, Semana } from '@/data/jogo-dados'

/** A hora de uma turma quando ela ainda nao tem escala: "08:00", "10:00". */
export const horaPadrao = (t: Turma) => `${HORARIO[t].slice(0, 2)}:00`

/** As linhas da escala de uma turma; `unidadeId` null = todas as unidades. */
export function linhasDaTurma(escala: LinhaEscala[], unidadeId: string | null, turma: Turma) {
  return escala.filter(
    (l) => (unidadeId === null || l.unidadeId === unidadeId) && l.turma === turma,
  )
}

/**
 * A semana gravada de uma turma, no formato do editor: os dias, a hora mais
 * usada e o tecnico (undefined quando cada dia tem um tecnico diferente).
 */
export function semanaSalva(
  escala: LinhaEscala[],
  unidadeId: string,
  turma: Turma,
): Omit<Semana, 'unidadeId' | 'turma'> {
  const linhas = linhasDaTurma(escala, unidadeId, turma)
  if (!linhas.length) return { dias: [], hora: horaPadrao(turma), tecnicoId: null }
  const conta = new Map<string, number>()
  for (const l of linhas) conta.set(l.hora, (conta.get(l.hora) ?? 0) + 1)
  const hora = [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  const tecnicos = linhas.map((l) => l.tecnicoId).filter((t, i, todos) => todos.indexOf(t) === i)
  return {
    dias: linhas.map((l) => l.diaSemana).filter((d, i, todos) => todos.indexOf(d) === i),
    hora,
    tecnicoId: tecnicos.length === 1 ? tecnicos[0] : undefined,
  }
}

/** A frase do que esta gravado na escala de uma turma (null: nenhum dia). */
export function fraseGravada(
  escala: LinhaEscala[],
  equipe: PessoaEquipe[],
  unidadeId: string | null,
  turma: Turma,
) {
  return fraseDaSemana(
    turma,
    linhasDaTurma(escala, unidadeId, turma).map((l) => ({
      dia: l.diaSemana,
      hora: l.hora,
      tecnico: l.tecnicoId ? (equipe.find((p) => p.id === l.tecnicoId)?.nome ?? 'alguém') : null,
    })),
  )
}
