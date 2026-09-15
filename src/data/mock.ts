/**
 * Dados de demonstracao do prototipo.
 *
 * Sao ficticios e existem so para dar forma as telas enquanto o backend
 * nao entra. Nenhum dado real de participante deve ser commitado aqui.
 */

export type Unidade = 'Atibaia' | 'Caiana'

export const POSICOES = ['Goleiro', 'Defesa', 'Meio', 'Ataque'] as const
export type FuncaoCampo = (typeof POSICOES)[number]

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
  /**
   * R4: opcional de proposito. Crianca que acabou de chegar nao tem
   * posicao, e obrigar a escolher inventa um dado que ninguem conferiu.
   * Quem nao tem funcao aparece em "Todos" e some nos outros filtros.
   */
  funcaoCampo?: FuncaoCampo
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
  { id: '13', nome: 'Nicolas Barreto', iniciais: 'NB', idade: 13, unidade: 'Atibaia', frequencia: 86, semanas: [true, true, true, true, true, true, false, true], desde: 'março de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Chegou pedindo para jogar no gol.', funcaoCampo: 'Goleiro' },
  { id: '14', nome: 'Otávio Lins', iniciais: 'OL', idade: 14, unidade: 'Atibaia', frequencia: 91, semanas: [true, true, true, true, true, true, true, true], desde: 'fevereiro de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Capitão do time nos últimos jogos.', funcaoCampo: 'Defesa' },
  { id: '15', nome: 'Pedro Henrique S.', iniciais: 'PH', idade: 13, unidade: 'Atibaia', frequencia: 78, semanas: [true, true, true, true, false, true, false, true], desde: 'maio de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Vem melhorando na marcação.', funcaoCampo: 'Defesa' },
  { id: '16', nome: 'Rafaela Dias', iniciais: 'RD', idade: 14, unidade: 'Caiana', frequencia: 83, semanas: [true, true, true, true, true, false, true, true], desde: 'agosto de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Joga nas duas laterais.', funcaoCampo: 'Defesa' },
  { id: '17', nome: 'Samuel Antunes', iniciais: 'SA', idade: 13, unidade: 'Atibaia', frequencia: 74, semanas: [true, true, true, false, true, true, false, true], desde: 'janeiro de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Entrosou rápido com o grupo.', funcaoCampo: 'Defesa' },
  { id: '18', nome: 'Thiago Moreira', iniciais: 'TM', idade: 14, unidade: 'Caiana', frequencia: 88, semanas: [true, true, true, true, true, true, false, true], desde: 'julho de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Boa leitura de jogo.', funcaoCampo: 'Meio' },
  { id: '19', nome: 'Vitória Campos', iniciais: 'VC', idade: 13, unidade: 'Atibaia', frequencia: 80, semanas: [true, true, true, true, false, true, true, true], desde: 'abril de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Organiza a saída de bola.', funcaoCampo: 'Meio' },
  { id: '20', nome: 'Wesley Prado', iniciais: 'WP', idade: 14, unidade: 'Atibaia', frequencia: 69, semanas: [true, true, false, true, true, false, true, true], desde: 'setembro de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Faltou por causa do trabalho da mãe.', funcaoCampo: 'Meio' },
  { id: '21', nome: 'Yasmin Ferreira', iniciais: 'YF', idade: 13, unidade: 'Caiana', frequencia: 85, semanas: [true, true, true, true, true, false, true, true], desde: 'outubro de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Cobra as bolas paradas.', funcaoCampo: 'Meio' },
  { id: '22', nome: 'Arthur Bezerra', iniciais: 'AB', idade: 14, unidade: 'Atibaia', frequencia: 93, semanas: [true, true, true, true, true, true, true, true], desde: 'junho de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma A · terça', observacao: 'Artilheiro do campeonato.', funcaoCampo: 'Ataque' },
  { id: '23', nome: 'Bianca Teixeira', iniciais: 'BT', idade: 13, unidade: 'Atibaia', frequencia: 77, semanas: [true, true, true, false, true, true, false, true], desde: 'novembro de 2024', responsavel: 'Cadastro pendente', turma: 'Turma A · terça', observacao: 'Rápida no contra-ataque.', funcaoCampo: 'Ataque' },
  { id: '24', nome: 'Caio Villela', iniciais: 'CV', idade: 14, unidade: 'Caiana', frequencia: 71, semanas: [true, true, true, true, false, true, false, true], desde: 'fevereiro de 2024', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Voltou depois de uma lesão no tornozelo.', funcaoCampo: 'Ataque' },
  { id: '25', nome: 'Davi Monteiro', iniciais: 'DM', idade: 13, unidade: 'Atibaia', frequencia: 64, semanas: [true, false, true, true, false, true, false, true], desde: 'março de 2025', responsavel: 'Cadastro pendente', turma: 'Turma A · terça', observacao: 'Chegou há pouco; ainda escolhendo posição.' },
  { id: '26', nome: 'Elisa Prates', iniciais: 'EP', idade: 14, unidade: 'Caiana', frequencia: 82, semanas: [true, true, true, true, true, false, true, true], desde: 'maio de 2023', responsavel: 'Responsável cadastrado', turma: 'Turma B · quinta', observacao: 'Reserva que entra bem no segundo tempo.', funcaoCampo: 'Goleiro' },
]

/** Abaixo disso, o participante entra na lista de atencao. */
export const LIMITE_BAIXA_FREQUENCIA = 60

export const resumo = {
  ativos: 74,
  porUnidade: { Atibaia: 41, Caiana: 33 } as Record<Unidade, number>,
}

/** Tela 04 do Figma: card "Presença no último treino", não "da semana". */
export const ultimoTreino = {
  data: 'sábado, 30 de agosto',
  local: 'Praça Olímpia',
  pctPresenca: 58,
}

export const proximoTreino = { data: 'sábado, 6 de setembro', hora: '08h' }

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

export const PERIODOS_RELATORIO = ['Mês', 'Trimestre', 'Ano'] as const
export type PeriodoRelatorio = (typeof PERIODOS_RELATORIO)[number]

/** Tela 07/07b/07c do Figma: cada periodo tem seu proprio recorte. */
export const frequenciaPorPeriodo: Record<
  PeriodoRelatorio,
  {
    rotuloPeriodo: string
    valor: number
    deltaPp: number
    meta: number
    buckets: { rotulo: string; valor: number }[]
  }
> = {
  Mês: {
    rotuloPeriodo: 'ago a set',
    valor: 78,
    deltaPp: 3,
    meta: 80,
    buckets: [
      { rotulo: 'jun', valor: 62 },
      { rotulo: 'jul', valor: 67 },
      { rotulo: 'ago', valor: 75 },
      { rotulo: 'set', valor: 78 },
    ],
  },
  Trimestre: {
    rotuloPeriodo: 'jun a ago',
    valor: 61,
    deltaPp: 5,
    meta: 70,
    buckets: [
      { rotulo: 'T1', valor: 52 },
      { rotulo: 'T2', valor: 56 },
      { rotulo: 'T3', valor: 58 },
      { rotulo: 'T4', valor: 61 },
    ],
  },
  Ano: {
    rotuloPeriodo: '2026',
    valor: 55,
    deltaPp: 11,
    meta: 70,
    buckets: [
      { rotulo: '2023', valor: 44 },
      { rotulo: '2024', valor: 49 },
      { rotulo: '2025', valor: 53 },
      { rotulo: '2026', valor: 55 },
    ],
  },
}

export const chamadasFeitas = { feitas: 19, esperadas: 21, semRegistro: 2 }

export const retencao = {
  entradas: 5,
  saidas: 2,
  consistenciaPct: 92,
}

export const qualidadeTreinos = {
  avaliados: 12,
  comoFoi: 4.2,
  entenderam: 3.8,
  dificuldade: 2.4,
  escalaCumprida: { feitas: 22, total: 24, nota: '2 treinos ficaram sem técnico definido' },
  conteudoAplicado: { feitas: 8, total: 8, nota: 'Todas as semanas do trimestre tiveram tema' },
}

/** Tela 09 do Figma: fila local enquanto o aparelho fica sem internet. */
export const filaOffline = {
  chamadas: 3,
  registros: 3,
  motivos: [
    'O celular está sem internet',
    'O Wi-Fi da praça caiu de novo',
    'O app precisa ser atualizado',
  ],
}


export type UnidadeInfo = {
  nome: Unidade
  nomeCompleto: string
  endereco: string
  criancas: number
}

export const unidadesInfo: UnidadeInfo[] = [
  { nome: 'Atibaia', nomeCompleto: 'Atibaia', endereco: 'Praça Olímpia', criancas: 58 },
  { nome: 'Caiana', nomeCompleto: 'São José de Caiana', endereco: 'Quadra da igreja', criancas: 16 },
]

export type Turma = {
  id: string
  nome: string
  faixaEtaria: string
  horarios: string[]
}

export const turmas: Turma[] = [
  { id: '1', nome: 'Pequenos', faixaEtaria: '7 a 11 anos', horarios: ['sáb 08h', 'qua 19h'] },
  { id: '2', nome: 'Maiores', faixaEtaria: '12 a 17 anos', horarios: ['sáb 10h', 'qua 20h'] },
]

/** Conta autenticada nesta demonstração — ver login.tsx (entra sem backend). */
export const contaAtual = {
  primeiroNome: 'Coordenação',
  nome: 'Coordenação ADAM',
  email: 'coordenacao@adam.org.br',
  iniciais: 'CA',
  papel: 'Coordenação',
}

export type PapelUsuario = 'Treinador' | 'Professor' | 'Secretaria' | 'Administrador'

export type Usuario = {
  id: string
  nome: string
  email: string
  papel: PapelUsuario
}

export const usuarios: Usuario[] = [
  { id: '1', nome: 'Marina Alves', email: 'marina@adam.org.br', papel: 'Treinador' },
  { id: '2', nome: 'Chico Barbosa', email: 'chico@adam.org.br', papel: 'Treinador' },
  { id: '3', nome: 'Rafael Nunes', email: 'rafael@adam.org.br', papel: 'Treinador' },
  { id: '4', nome: 'Bruna Teixeira', email: 'bruna@adam.org.br', papel: 'Professor' },
  { id: '5', nome: 'Helena Prado', email: 'helena@adam.org.br', papel: 'Secretaria' },
  { id: '6', nome: 'Coordenação ADAM', email: 'coordenacao@adam.org.br', papel: 'Administrador' },
]

export type RegistroAcesso = {
  id: string
  autor: string
  acao: string
  quando: string
}

export const registroAcessos: RegistroAcesso[] = [
  { id: '1', autor: 'Marina Alves', acao: 'fez a chamada dos Pequenos', quando: 'hoje, 08:42' },
  { id: '2', autor: 'Coordenação ADAM', acao: 'criou o acesso de Rafael Nunes', quando: 'hoje, 07:15' },
  { id: '3', autor: 'Helena Prado', acao: 'exportou 74 fichas em CSV', quando: 'ontem, 17:30' },
  { id: '4', autor: 'Chico Barbosa', acao: 'salvou o treino de sábado', quando: 'ontem, 14:02' },
  { id: '5', autor: 'Marina Alves', acao: 'cadastrou 2 crianças', quando: '05/09, 09:20' },
  { id: '6', autor: 'Coordenação ADAM', acao: 'mudou a permissão de Bruna', quando: '04/09, 11:48' },
]
