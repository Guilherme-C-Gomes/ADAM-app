import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/**
 * O .env de desenvolvimento comeca com valores de marcador para o app
 * subir antes do projeto Supabase existir. Detectamos isso para que a
 * tela de login explique o que falta, em vez de estourar um erro de
 * rede que nao diz nada.
 */
export const supabaseConfigurado =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder'

/**
 * ATENCAO ao religar a autenticacao.
 *
 * A sessao abaixo e gravada em AsyncStorage, que NAO e criptografado: o
 * token fica legivel em texto puro no armazenamento do app. Para um
 * painel que expoe nome, idade e frequencia de criancas e adolescentes,
 * o token de sessao deve ir para `expo-secure-store`, que usa o Keychain
 * no iOS e o Keystore no Android.
 *
 * Trocar o `storage` abaixo por um adaptador de SecureStore antes de
 * colocar dados reais no app. Dois cuidados na troca: o SecureStore tem
 * limite de 2KB por entrada, e a API e assincrona.
 *
 * Vale tambem ativar Row Level Security em toda tabela antes da primeira
 * carga real — a chave anon abaixo vai embutida no app e e legivel por
 * qualquer pessoa que o instale. Sem RLS, ela le o banco inteiro.
 */
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // O app nao roda em navegador: nao ha URL de callback para ler.
      detectSessionInUrl: false,
    },
  },
)
