import { useSyncExternalStore } from 'react'

/**
 * Simula o aparelho sem internet (tela 09 do Figma).
 *
 * Fica fora de React de propósito: Home e o botão de demonstração em
 * Ajustes precisam do mesmo valor sem precisar de um Provider no topo
 * da árvore só para isto.
 */
let offline = false
const ouvintes = new Set<() => void>()

export function useModoOffline() {
  return useSyncExternalStore(
    (ouvir) => {
      ouvintes.add(ouvir)
      return () => ouvintes.delete(ouvir)
    },
    () => offline,
  )
}

export function alternarModoOffline() {
  offline = !offline
  ouvintes.forEach((ouvir) => ouvir())
}
