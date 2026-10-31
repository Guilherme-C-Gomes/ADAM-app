import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'

/**
 * Rascunho de formulario compartilhado entre telas.
 *
 * O Figma divide cada formulario em telas de escolha (categoria, data,
 * comissao, livro, quem leva...). A tela de escolha grava aqui e volta;
 * o formulario le o mesmo valor. Fora de React pelo mesmo motivo do
 * modo offline: sem Provider no topo so para isto.
 *
 * `guardar`: na versao web, cada mudanca fica tambem no aparelho
 * (localStorage). O celular recarrega a pagina sozinho quando a pessoa sai
 * para a camera ou para os arquivos (libera memoria) — sem isto o rascunho
 * so da memoria sumia e o formulario voltava em branco. O guardado vence
 * depois de `validade` e pode ser aliviado (`aliviar`) se nao couber.
 */
type Guardar<T> = {
  chave: string
  /** em ms; mais velho que isto, nao volta */
  validade: number
  /** versao mais leve para quando o completo nao cabe no aparelho */
  aliviar?: (valor: T) => T
}

const temArmazenamento = () => {
  try {
    return Platform.OS === 'web' && typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function lerGuardado<T extends object>(inicial: T, g?: Guardar<T>): T {
  if (!g || !temArmazenamento()) return inicial
  try {
    const bruto = localStorage.getItem(g.chave)
    if (!bruto) return inicial
    const { em, valor } = JSON.parse(bruto) as { em: number; valor: Partial<T> }
    if (!em || Date.now() - em > g.validade) {
      localStorage.removeItem(g.chave)
      return inicial
    }
    return { ...inicial, ...valor }
  } catch {
    return inicial
  }
}

function guardarNoAparelho<T>(valor: T, g?: Guardar<T>) {
  if (!g || !temArmazenamento()) return
  const gravar = (v: T) =>
    localStorage.setItem(g.chave, JSON.stringify({ em: Date.now(), valor: v }))
  try {
    gravar(valor)
  } catch {
    // nao coube (arquivo grande): guarda sem o pesado
    try {
      if (g.aliviar) gravar(g.aliviar(valor))
    } catch {
      // segue so na memoria
    }
  }
}

export function criarRascunho<T extends object>(inicial: T, guardar?: Guardar<T>) {
  let valor = lerGuardado(inicial, guardar)
  const ouvintes = new Set<() => void>()

  const definir = (parcial: Partial<T>) => {
    valor = { ...valor, ...parcial }
    guardarNoAparelho(valor, guardar)
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
      () => inicial,
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
    /** Apaga o guardado no aparelho (ao sair da conta). */
    esquecer: () => {
      valor = inicial
      try {
        if (guardar && temArmazenamento()) localStorage.removeItem(guardar.chave)
      } catch {}
      ouvintes.forEach((ouvir) => ouvir())
    },
  }
}
