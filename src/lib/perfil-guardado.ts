import AsyncStorage from '@react-native-async-storage/async-storage'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'

/**
 * A ultima linha boa de `usuarios` da conta logada, guardada no aparelho.
 *
 * E o que deixa o app abrir sem internet: a sessao continua no Keychain, mas
 * o perfil (nome, funcao, permissao) vinha sempre do banco. Sem sinal, a
 * Chamada offline ficava inalcancavel atras do login.
 *
 * So entra aqui o que a tela ja mostra (nome, e-mail, funcao) — nada da
 * ficha das criancas. Uma linha so: entrar com outra conta sobrescreve, e
 * "Sair da conta" apaga.
 */
export type LinhaUsuario = {
  id: string
  nome: string
  email: string
  funcao: string | null
  permissao: string
  ativo: boolean
  foto_path: string | null
}

const CHAVE = 'adam.perfil'

export async function guardarPerfil(linha: LinhaUsuario) {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(linha))
  } catch {
    // sem armazenamento (pre-render do web): so nao fica guardado
  }
}

/** A linha guardada, se for desta conta e estiver ativa. */
export async function perfilGuardado(usuarioId: string) {
  try {
    const texto = await AsyncStorage.getItem(CHAVE)
    const linha = texto ? (JSON.parse(texto) as LinhaUsuario) : null
    return linha?.id === usuarioId && linha.ativo ? linha : null
  } catch {
    return null
  }
}

export async function esquecerPerfil() {
  try {
    await AsyncStorage.removeItem(CHAVE)
  } catch {
    // nada guardado para apagar
  }
}

/**
 * O erro e de rede (o servidor nao respondeu), e nao uma resposta do banco?
 * So uma resposta de verdade pode barrar a entrada; falta de sinal, nao.
 */
export function ehErroDeRede(erro: unknown, status?: number) {
  if (!erro) return false
  if (isAuthRetryableFetchError(erro)) return true
  // sem resposta o PostgREST devolve status 0; 5xx e o servidor fora do ar;
  // 429 e excesso de pedidos — nenhum deles e o banco dizendo "nao"
  const codigo = status ?? (erro as { status?: unknown }).status
  if (typeof codigo === 'number' && (codigo === 0 || codigo === 429 || codigo >= 500)) return true
  const texto = String((erro as { message?: string } | null)?.message ?? erro)
  return /network|fetch|internet|timed? ?out|load failed|connection|offline/i.test(texto)
}
