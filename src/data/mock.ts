/**
 * Dados de demonstracao do prototipo.
 *
 * Sao ficticios e existem so para dar forma as telas enquanto o backend
 * nao entra. Nenhum dado real de participante deve ser commitado aqui.
 */

export type Unidade = 'Atibaia' | 'Caiana'

export type Participante = {
  id: string
  nome: string
  iniciais: string
  idade: number
  unidade: Unidade
  frequencia: number
  /** Presenca das ultimas 8 semanas, da mais antiga para a mais recente. */
  semanas: boolean[]
  desde: string
  responsavel: string
  turma: string
  observacao: string
}

export const participantes: Participante[] = [
  { id: '1', nome: 'Ana Beatriz L.', iniciais: 'AB', idade: 12, unidade: 'Atibaia', frequencia: 92, semanas: [true, true, true, true, true, true, false, true], desde: 'março de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Participa bem das atividades em grupo.' },
  { id: '2', nome: 'Bruno Carvalho', iniciais: 'BC', idade: 14, unidade: 'Caiana', frequencia: 47, semanas: [true, true, true, true, false, false, false, false], desde: 'agosto de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Faltou as últimas semanas sem aviso. Contato pendente.' },
  { id: '3', nome: 'Carla Menezes', iniciais: 'CM', idade: 11, unidade: 'Atibaia', frequencia: 38, semanas: [true, true, true, false, false, false, false, false], desde: 'janeiro de 2025', responsavel: 'Cadastro pendente', turma: 'Turma A · terça', observacao: 'Mudou de endereço; transporte é o principal obstáculo.' },
  { id: '4', nome: 'Diego Fernandes', iniciais: 'DF', idade: 13, unidade: 'Caiana', frequencia: 52, semanas: [true, true, true, true, false, false, false, false], desde: 'maio de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Retomou frequência após conversa com a equipe.' },
  { id: '5', nome: 'Eduarda Pires', iniciais: 'EP', idade: 15, unidade: 'Atibaia', frequencia: 88, semanas: [true, true, true, true, true, true, false, true], desde: 'outubro de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Ajuda na organização dos encontros.' },
  { id: '6', nome: 'Felipe Ramos', iniciais: 'FR', idade: 12, unidade: 'Caiana', frequencia: 95, semanas: [true, true, true, true, true, true, true, true], desde: 'fevereiro de 2025', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Frequência estável desde o início.' },
  { id: '7', nome: 'Gabriela Souza', iniciais: 'GS', idade: 10, unidade: 'Atibaia', frequencia: 79, semanas: [true, true, true, true, true, false, false, true], desde: 'julho de 2024', responsavel: 'Cadastro pendente', turma: 'Turma A · terça', observacao: 'Demonstra interesse nas oficinas de leitura.' },
  { id: '8', nome: 'Henrique Alves', iniciais: 'HA', idade: 16, unidade: 'Caiana', frequencia: 41, semanas: [true, true, true, false, false, false, false, false], desde: 'abril de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Conflito de horário com atividade escolar.' },
  { id: '9', nome: 'Isabela Nunes', iniciais: 'IN', idade: 13, unidade: 'Atibaia', frequencia: 84, semanas: [true, true, true, true, true, true, false, true], desde: 'setembro de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Boa integração com o grupo novo.' },
  { id: '10', nome: 'João Pedro M.', iniciais: 'JP', idade: 11, unidade: 'Caiana', frequencia: 90, semanas: [true, true, true, true, true, true, false, true], desde: 'novembro de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Frequência exemplar no trimestre.' },
  { id: '11', nome: 'Larissa Costa', iniciais: 'LC', idade: 14, unidade: 'Atibaia', frequencia: 67, semanas: [true, true, true, true, false, false, false, true], desde: 'junho de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Oscilou em agosto, recuperou em setembro.' },
  { id: '12', nome: 'Matheus Rocha', iniciais: 'MR', idade: 12, unidade: 'Caiana', frequencia: 73, semanas: [true, true, true, true, true, false, false, true], desde: 'dezembro de 2024', responsavel: 'Cadastro pendente', turma: 'Turma B · quinta', observacao: 'Acompanhamento próximo recomendado.' },
]

/** Abaixo disso, o participante entra na lista de atencao. */
export const LIMITE_BAIXA_FREQUENCIA = 60

export const resumo = {
  ativos: 74,
  totalVagas: 90,
  porUnidade: { Atibaia: 41, Caiana: 33 } as Record<Unidade, number>,
  presencaSemana: 68,
  presencaTotal: 74,
  metaPresenca: 80,
  proximoEncontro: 'Próximo encontro: quinta, 14h — Atibaia',
}

export const mediaMensal = [
  { mes: 'jun', valor: 62 },
  { mes: 'jul', valor: 67 },
  { mes: 'ago', valor: 75 },
  { mes: 'set', valor: 78 },
]

export const presencaPorDia = [
  { rotulo: 'Terça', valor: 71 },
  { rotulo: 'Quinta', valor: 84 },
]

export const ajustes = {
  fonte: 'Formulário de presença ADAM',
  fonteMeta: 'Google Forms · 1.284 respostas',
  ultimaSync: 'Sincronizado há 12 min',
  acesso: [
    { rotulo: 'Coordenação geral', valor: '3 pessoas' },
    { rotulo: 'Educadores', valor: '11 pessoas' },
    { rotulo: 'Exportar relatório mensal', valor: 'Sim' },
    { rotulo: 'Retenção de dados', valor: '24 meses' },
    { rotulo: 'Versão do app', valor: 'v1.0.0' },
  ],
}
