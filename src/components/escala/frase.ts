import { NOME_TURMA, type Turma } from '@/data/chamada'

/**
 * A frase da escala de uma turma, reescrita a cada mudanca:
 * "Pequenos treinam toda terça e quinta, às 8h, com Vini."
 *
 * Sem Intl (Hermes): nomes de dia de tabela propria. Domingo e sabado sao
 * masculinos ("todo sábado"); os outros, femininos ("toda terça").
 */
const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MASCULINO = [true, false, false, false, false, false, true]

/** As letras dos chips, de domingo a sabado. */
export const LETRAS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const
/** O nome do dia para o leitor de tela. */
export const NOME_DIA = NOMES

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome

/** "08:00" -> "8h"; "08:30" -> "8h30". */
export function horaFalada(hora: string) {
  const [h = '0', m = '00'] = hora.split(':')
  const n = Number(h)
  return m === '00' ? `${n}h` : `${n}h${m}`
}

/** ["a", "b", "c"] -> "a, b e c" */
export function lista(itens: string[]) {
  if (itens.length <= 1) return itens[0] ?? ''
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** "toda terça e quinta", "todo domingo e toda quarta", "de segunda a sexta". */
function diasFalados(dias: number[], extra?: (dia: number) => string) {
  const ordem = dias.filter((d, i) => dias.indexOf(d) === i).sort((a, b) => a - b)
  if (!extra && ordem.length === 7) return 'todos os dias'
  if (!extra && ordem.join() === '1,2,3,4,5') return 'de segunda a sexta'
  // o artigo so se repete quando o genero muda: "toda terça, quinta e todo sábado"
  const partes = ordem.map((d, i) => {
    const artigo =
      i > 0 && MASCULINO[ordem[i - 1]] === MASCULINO[d] ? '' : MASCULINO[d] ? 'todo ' : 'toda '
    return `${artigo}${NOMES[d]}${extra ? ` (${extra(d)})` : ''}`
  })
  return lista(partes)
}

export type DiaDaFrase = { dia: number; hora: string; tecnico: string | null }

/**
 * A frase de uma turma a partir dos dias da escala (cada um com hora e
 * nome do tecnico). null quando a turma nao treina nenhum dia.
 */
export function fraseDaSemana(turma: Turma, dias: DiaDaFrase[]) {
  if (!dias.length) return null
  const horas = dias
    .map((d) => d.hora)
    .filter((h, i, todas) => todas.indexOf(h) === i)
    .sort()
  const tecnicos = dias.map((d) => d.tecnico ?? '').filter((t, i, todos) => todos.indexOf(t) === i)
  const umSo = tecnicos.length === 1
  const quem = (hora: string) => (dia: number) => {
    const t = dias.find((d) => d.dia === dia && d.hora === hora)?.tecnico
    return t ? primeiroNome(t) : 'sem técnico'
  }
  const diasDa = (hora: string) => dias.filter((d) => d.hora === hora).map((d) => d.dia)

  const corpo =
    horas.length === 1
      ? `${diasFalados(diasDa(horas[0]), umSo ? undefined : quem(horas[0]))}, às ${horaFalada(horas[0])}`
      : lista(
          horas.map(
            (h) => `${diasFalados(diasDa(h), umSo ? undefined : quem(h))} às ${horaFalada(h)}`,
          ),
        )
  const fim = umSo
    ? tecnicos[0]
      ? `, com ${primeiroNome(tecnicos[0])}`
      : ', ainda sem técnico'
    : ''
  return `${NOME_TURMA[turma]} treinam ${corpo}${fim}.`
}
