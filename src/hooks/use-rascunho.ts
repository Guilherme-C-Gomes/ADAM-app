import { useSyncExternalStore } from 'react'

/**
 * Rascunho de formulario compartilhado entre telas.
 *
 * O Figma divide cada formulario em telas de escolha (categoria, data,
 * comissao, livro, quem leva...). A tela de escolha grava aqui e volta;
 * o formulario le o mesmo valor. Fora de React pelo mesmo motivo do
 * modo offline: sem Provider no topo so para isto.
 */
export function criarRascunho<T extends object>(inicial: T) {
  let valor = inicial
  const ouvintes = new Set<() => void>()

  const definir = (parcial: Partial<T>) => {
    valor = { ...valor, ...parcial }
    ouvintes.forEach((ouvir) => ouvir())
  }

  const acompanhar = () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- chamado como hook pelas telas
    useSyncExternalStore(
      (ouvir) => {
        ouvintes.add(ouvir)
        return () => ouvintes.delete(ouvir)
      },
      () => valor,
    )

  return {
    /**
     * Le o rascunho e re-renderiza quando ele muda. O nome comeca com "use"
     * de proposito: o React Compiler so reconhece como hook a chamada com
     * esse prefixo. Chamado `rascunho.usar()`, ele virava funcao comum para
     * o compilador, que guardava o resultado e deixava de chamar nas
     * renderizacoes seguintes — e a ordem dos hooks da tela quebrava.
     */
    useValor: acompanhar,
    definir,
    ler: () => valor,
    limpar: () => definir(inicial),
  }
}
