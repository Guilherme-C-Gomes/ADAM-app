import * as SecureStore from 'expo-secure-store'
import * as Updates from 'expo-updates'
import { DevSettings, Platform } from 'react-native'

/**
 * Escuro ou claro, escolhido em cada aparelho.
 *
 * As cores do app (theme/tokens.ts) sao lidas uma vez, ao abrir: os
 * StyleSheets das telas guardam o valor. Por isso a escolha precisa ser
 * lida de forma SINCRONA antes de tudo (localStorage na web, o getItem do
 * SecureStore no app), e trocar de tema guarda e recarrega o app.
 */
export type Tema = 'escuro' | 'claro'

const CHAVE = 'adam-tema'

export function temaGuardado(): Tema {
  try {
    const v =
      Platform.OS === 'web'
        ? typeof localStorage !== 'undefined'
          ? localStorage.getItem(CHAVE)
          : null
        : SecureStore.getItem(CHAVE)
    return v === 'claro' ? 'claro' : 'escuro'
  } catch {
    return 'escuro'
  }
}

/** Guarda o outro tema e recarrega o app ja com ele. */
export async function trocarTema(atual: Tema) {
  const novo: Tema = atual === 'escuro' ? 'claro' : 'escuro'
  try {
    if (Platform.OS === 'web') localStorage.setItem(CHAVE, novo)
    else SecureStore.setItem(CHAVE, novo)
  } catch {
    return
  }
  if (Platform.OS === 'web') {
    window.location.reload()
    return
  }
  try {
    await Updates.reloadAsync()
  } catch {
    // em desenvolvimento (Expo Go) o reloadAsync nao existe
    DevSettings.reload()
  }
}
