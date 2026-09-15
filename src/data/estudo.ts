/**
 * Dados de demonstracao do setor Estudo (tela 13).
 *
 * Aula e devocional sao sessoes como o treino — mudam o tipo, nao o
 * modelo. A chamada e a escrita mais frequente do app.
 */
export const chamadaDeHoje = {
  hora: '08h',
  turma: 'Pequenos',
  aberta: true,
  marcadas: 0,
}

export type LinhaEscalaEstudo = {
  id: string
  dia: string
  hora: string
  responsavel: string | null
  turma: string
}

export const escalaEstudo: LinhaEscalaEstudo[] = [
  { id: 'e1', dia: 'Sáb', hora: '08h', responsavel: 'Marina Alves', turma: 'Pequenos' },
  { id: 'e2', dia: 'Sáb', hora: '10h', responsavel: 'Chico Barbosa', turma: 'Maiores' },
  { id: 'e3', dia: 'Qua', hora: '19h', responsavel: null, turma: 'Devocional' },
  { id: 'e4', dia: 'Qua', hora: '20h', responsavel: 'Bruna Teixeira', turma: 'Maiores' },
]

export const conteudoDaSemana = {
  tema: 'Passe e recepção com bola rasteira',
  objetivo: 'Objetivo: domínio orientado e leitura do apoio',
  materiais: 3,
}

export const SEMANAS = ['Esta semana', 'Próxima', 'Anterior'] as const
