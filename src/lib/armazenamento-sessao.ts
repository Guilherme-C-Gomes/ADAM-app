import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Onde a sessao do Supabase mora no aparelho.
 *
 * "Lembrar este aparelho" ligado: no Keychain do iPhone (Keystore no
 * Android), criptografado pelo sistema. O app abre direto, sem pedir senha,
 * ate alguem tocar em "Sair da conta". Desligado: so na memoria, e a sessao
 * acaba quando o app fecha — para o celular emprestado ou compartilhado.
 *
 * AsyncStorage NAO serve para o token: ele fica em texto puro no aparelho,
 * e com ele se le a ficha de criancas e adolescentes.
 *
 * O Keychain recusa valores acima de uns 2 KB, e a sessao do Supabase passa
 * disso. Por isso o valor e guardado em pedacos: `chave.n` diz quantos, e
 * `chave.0`, `chave.1`... guardam cada um.
 */
const PEDACO = 1800
const CHAVE_LEMBRAR = 'adam.lembrar'
const OPCOES: SecureStore.SecureStoreOptions = {
  // lido tambem quando o app acorda em segundo plano para renovar o token
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}

const memoria = new Map<string, string>()
let lembrar: boolean | null = null

async function querLembrar() {
  if (lembrar === null) lembrar = (await AsyncStorage.getItem(CHAVE_LEMBRAR)) !== '0'
  return lembrar
}

async function lerSeguro(chave: string) {
  const n = Number(await SecureStore.getItemAsync(`${chave}.n`, OPCOES))
  if (!n) return null
  const partes: string[] = []
  for (let i = 0; i < n; i++) {
    const parte = await SecureStore.getItemAsync(`${chave}.${i}`, OPCOES)
    if (parte === null) return null
    partes.push(parte)
  }
  return partes.join('')
}

async function apagarSeguro(chave: string) {
  const n = Number(await SecureStore.getItemAsync(`${chave}.n`, OPCOES))
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${chave}.${i}`, OPCOES)
  await SecureStore.deleteItemAsync(`${chave}.n`, OPCOES)
}

async function gravarSeguro(chave: string, valor: string) {
  await apagarSeguro(chave)
  const partes = valor.match(new RegExp(`[\\s\\S]{1,${PEDACO}}`, 'g')) ?? ['']
  for (let i = 0; i < partes.length; i++) {
    await SecureStore.setItemAsync(`${chave}.${i}`, partes[i], OPCOES)
  }
  await SecureStore.setItemAsync(`${chave}.n`, String(partes.length), OPCOES)
}

// No web, o Expo pre-renderiza as telas no Node, onde nao existe `window`
// nem armazenamento. La nao ha sessao nenhuma para ler: devolve vazio em vez
// de derrubar o servidor de desenvolvimento.
const semArmazenamento = Platform.OS === 'web' && typeof window === 'undefined'

// A chave do Supabase tem caracteres que o Keychain nao aceita no nome.
const nomeSeguro = (chave: string) => chave.replace(/[^A-Za-z0-9._-]/g, '_')

/**
 * O adaptador que o cliente do Supabase usa (`auth.storage`).
 *
 * Na versao web (o app instalado pela tela de inicio, enquanto as lojas nao
 * liberam), "lembrar" guarda no armazenamento do navegador; o Keychain so
 * existe no app nativo. Desligado, vale a memoria nos dois.
 */
export const armazenamentoSessao = {
  async getItem(chave: string) {
    if (semArmazenamento) return null
    if (!(await querLembrar())) return memoria.get(chave) ?? null
    if (Platform.OS === 'web') return AsyncStorage.getItem(chave)
    return lerSeguro(nomeSeguro(chave))
  },
  async setItem(chave: string, valor: string) {
    if (semArmazenamento) return
    if (!(await querLembrar())) {
      memoria.set(chave, valor)
      return
    }
    if (Platform.OS === 'web') return AsyncStorage.setItem(chave, valor)
    await gravarSeguro(nomeSeguro(chave), valor)
  },
  async removeItem(chave: string) {
    memoria.delete(chave)
    if (semArmazenamento) return
    if (Platform.OS === 'web') return AsyncStorage.removeItem(chave)
    await apagarSeguro(nomeSeguro(chave))
  },
}

/**
 * Chamado no login, ANTES de entrar: decide onde a sessao nova vai morar.
 * Uma sessao antiga no Keychain ja foi apagada no "Sair da conta" (o
 * removeItem limpa o Keychain mesmo com o lembrar desligado).
 */
export async function definirLembrar(valor: boolean) {
  lembrar = valor
  await AsyncStorage.setItem(CHAVE_LEMBRAR, valor ? '1' : '0')
}

export async function lembrarAtual() {
  return querLembrar()
}
