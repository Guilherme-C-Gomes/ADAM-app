import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState, View } from 'react-native'

import { sessao } from '@/data/perfis'
import { conferirPerfil, retomarSessao } from '@/lib/auth'
import { color } from '@/theme/tokens'

/**
 * Nenhuma tela do app abre sem alguem logado.
 *
 * Na versao web qualquer um pode digitar /chamada ou /secretaria direto no
 * navegador, e recarregar a pagina apaga a sessao da memoria. A guarda
 * tenta primeiro retomar a sessao lembrada no aparelho (o "lembrar este
 * aparelho"); se nao houver, manda para o login.
 *
 * Os dados em si quem protege e o banco (Row Level Security): sem sessao,
 * ele nao entrega nada. A guarda e para a pessoa nao ver um app vazio nem
 * o esqueleto das telas.
 *
 * Logado, a guarda tambem confere o perfil no banco quando o app volta para
 * a frente e a cada minuto (lib/auth.ts decide se precisa: sempre que entrou
 * sem internet, senao a cada 15 minutos). Se o banco disser que a conta nao
 * vale mais, a sessao cai e a guarda leva para o login.
 */
export function GuardaSessao({ children }: { children: React.ReactNode }) {
  const { logado } = sessao.useValor()
  const [tentou, setTentou] = useState(logado)

  useEffect(() => {
    if (logado || tentou) return
    let ativo = true
    retomarSessao().finally(() => {
      if (ativo) setTentou(true)
    })
    return () => {
      ativo = false
    }
  }, [logado, tentou])

  useEffect(() => {
    if (!logado) return
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') conferirPerfil()
    })
    const relogio = setInterval(conferirPerfil, 60_000)
    return () => {
      assinatura.remove()
      clearInterval(relogio)
    }
  }, [logado])

  if (logado) return children
  if (!tentou) return <View style={{ flex: 1, backgroundColor: color.bg }} />
  return <Redirect href="/login" />
}
