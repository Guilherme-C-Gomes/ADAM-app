import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

import { armazenamentoSessao } from '@/lib/armazenamento-sessao'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY

/**
 * O .env de desenvolvimento comeca com valores de marcador para o app
 * subir antes do projeto Supabase existir. Detectamos isso para que a
 * tela de login explique o que falta, em vez de estourar um erro de
 * rede que nao diz nada.
 */
export const supabaseConfigurado =
  !!supabaseUrl &&
  !!supabaseKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseKey !== 'placeholder'

/**
 * A sessao mora no Keychain (lib/armazenamento-sessao.ts), nunca em
 * AsyncStorage: e com ela que se le a ficha de criancas e adolescentes.
 *
 * A publishable key abaixo vai embutida no app e qualquer pessoa que o
 * instale consegue le-la. Quem protege os dados e o Row Level Security do
 * banco (supabase/migrations), nao o segredo da chave.
 */
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseKey ?? 'placeholder',
  {
    auth: {
      storage: armazenamentoSessao,
      autoRefreshToken: true,
      persistSession: true,
      // O app nao roda em navegador: nao ha URL de callback para ler.
      detectSessionInUrl: false,
    },
  },
)

// No celular, o token so se renova com o app na frente. Em segundo plano o
// relogio para, e ao voltar ele renova antes de a sessao vencer — e isso que
// mantem o "lembrar este aparelho" sem pedir senha de novo.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
