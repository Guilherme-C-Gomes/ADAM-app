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
