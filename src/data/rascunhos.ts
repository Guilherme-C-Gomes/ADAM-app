import { criarRascunho } from '@/hooks/use-rascunho'

import type { Periodo } from '@/data/metricas'

/*
 * Os rascunhos do Jogo (treino, jogo, exercicio, filtro) moram em
 * data/jogo-dados.ts, junto do banco.
 */

/**
 * Tela 12b · filtros da Secretaria. R12: valem para painel e relatorio —
 * inclusive o passo das setas, para os dois mostrarem o mesmo periodo.
 */
export const rascunhoFiltroSecretaria = criarRascunho({
  /** null = todas as unidades */
  unidadeId: null as string | null,
  periodo: 'Mês' as Periodo,
  /** 0 = o periodo de hoje; -1 = o anterior */
  passo: 0,
  /** so no Personalizado, "AAAA-MM-DD" */
  de: '',
  ate: '',
})

export type Contato = {
  nome: string
  /** Escrito: "Mãe", "Avó", "Tia", "Padrasto"... */
  parentesco: string
  telefone: string
  whatsapp: boolean
  /**
   * O numero principal da ficha — quase sempre o da mae. E dele que sai a
   * convocacao e a cobranca de livro, e e o unico que o professor ve. Um
   * so por ficha.
   */
  principal: boolean
}

/** Um arquivo escolhido no aparelho e ainda nao enviado ao banco. */
export type Anexo = { nome: string; uri?: string; tipo?: string }

/**
 * Telas 17 a 17h · a ficha da crianca sendo montada. So vai para o banco
 * no "Salvar ficha" (data/fichas.ts).
 *
 * A turma nao mora aqui: sai da idade (R1). A funcao em campo e
 * opcional (R4) e "sem posicao" e escolha, nao falta de dado.
 */
export const FICHA_VAZIA = {
  /** id da crianca no banco; vazio enquanto e ficha nova */
  id: undefined as string | undefined,
  nome: '',
  /** "DD/MM/AAAA", como a pessoa digita */
  nascimento: '',
  unidadeId: null as string | null,
  /** foto ja guardada no banco (caminho no Storage) */
  fotoPath: undefined as string | undefined,
  /** foto nova, escolhida agora no aparelho */
  fotoUri: undefined as string | undefined,
  funcao: null as 'Goleiro' | 'Defesa' | 'Meio' | 'Ataque' | null,
  observacao: '',
  contatos: [] as Contato[],
  /** Indice dos documentos entregues em DOCUMENTOS_DA_FICHA. */
  documentos: [] as number[],
  /** Arquivo anexado agora, por indice de documento. */
  anexos: {} as Record<number, Anexo>,
  /** Qual contato a tela 17e esta editando. */
  editando: 0,
  /** Veio de uma inscricao pelo link: salvar a ficha da baixa nela. */
  inscricaoId: undefined as string | undefined,
}

export const rascunhoFicha = criarRascunho({ ...FICHA_VAZIA })
