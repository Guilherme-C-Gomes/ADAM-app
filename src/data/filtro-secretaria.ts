import { useUnidades } from '@/data/chamada'
import { intervaloDo } from '@/data/metricas'
import { rascunhoFiltroSecretaria } from '@/data/rascunhos'

/** "Atibaia", "Atibaia e Caiana", "A, B e C" */
export function juntarNomes(nomes: string[]) {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

/**
 * O filtro da Secretaria pronto para as telas: o nome da unidade, o
 * rotulo do periodo e as setas. As setas mexem no filtro compartilhado,
 * entao o painel e o relatorio andam juntos (R12) — e nao passam de hoje.
 */
export function useFiltroSecretaria() {
  const filtro = rascunhoFiltroSecretaria.useValor()
  const unidades = useUnidades()
  const nomeUnidade = filtro.unidadeId
    ? (unidades.dados.find((u) => u.id === filtro.unidadeId)?.nome ?? '…')
    : 'Todas'
  const intervalo = intervaloDo(filtro)

  return {
    filtro,
    unidades: unidades.dados,
    /** "Atibaia e Caiana", para o subtitulo dos cabecalhos */
    todasAsUnidades: juntarNomes(unidades.dados.map((u) => u.nome)),
    nomeUnidade,
    intervalo,
    rotulo: `${nomeUnidade} · ${intervalo.rotulo}`,
    anterior: () => rascunhoFiltroSecretaria.definir({ passo: filtro.passo - 1 }),
    proximo: () => {
      if (filtro.passo < 0) rascunhoFiltroSecretaria.definir({ passo: filtro.passo + 1 })
    },
  }
}
