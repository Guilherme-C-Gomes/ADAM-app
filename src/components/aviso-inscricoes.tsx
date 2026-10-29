import { router, usePathname } from 'expo-router'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { haConfirmacaoAberta, pedirConfirmacao } from '@/components/ui/confirmacao'
import { contarPendentes, esquecerPendentes } from '@/data/inscricoes'
import { usePerfil } from '@/data/perfis'

/** De quanto em quanto tempo, com o app aberto, olha se chegou inscricao. */
const INTERVALO = 2 * 60_000

/**
 * Avisa ADM e Secretaria das inscricoes pelo link esperando cadastro: ao
 * abrir o app, ao voltar para ele e, com ele aberto, a cada 2 minutos.
 * Mostra um pop-up quando o numero de novas SOBE desde o ultimo aviso (ou
 * na primeira olhada do app aberto, se ja tinha alguma) — nao a cada vez.
 * O numero tambem fica na barra de menu, no icone da Secretaria.
 *
 * E o aviso de dentro do app. A notificacao com o app fechado (push) pede
 * um build novo do app e entra depois da aprovacao da Apple.
 */
export function AvisoInscricoes() {
  const { veDadosSensiveis, setores } = usePerfil()
  const ativo = veDadosSensiveis && setores.includes('secretaria')
  const caminho = usePathname()
  const naTela = useRef(false)
  const ultimoAviso = useRef(0)

  useEffect(() => {
    naTela.current = caminho.startsWith('/secretaria/inscricoes')
  }, [caminho])

  useEffect(() => {
    if (!ativo) {
      esquecerPendentes()
      return
    }
    let vivo = true

    const olhar = async () => {
      const total = await contarPendentes()
      if (!vivo || total === null) return
      // cadastrou ou recusou: o proximo aviso conta a partir do que sobrou
      if (total < ultimoAviso.current) ultimoAviso.current = total
      if (total === 0 || total <= ultimoAviso.current) return
      // ja esta olhando a lista, ou tem outro "tem certeza?" na tela: nao interrompe
      if (naTela.current || haConfirmacaoAberta()) return
      ultimoAviso.current = total
      const umaSo = total === 1
      const ver = await pedirConfirmacao({
        titulo: umaSo ? '1 inscrição nova para aceitar' : `${total} inscrições novas para aceitar`,
        texto: umaSo
          ? 'Uma família enviou a ficha pelo link. Confira os dados e cadastre a criança.'
          : 'Famílias enviaram a ficha pelo link. Confira os dados e cadastre as crianças.',
        confirmar: 'Ver inscrições',
        cancelar: 'Depois',
      })
      if (ver && vivo) router.push('/secretaria/inscricoes')
    }

    olhar()
    const relogio = setInterval(() => {
      if (AppState.currentState === 'active') olhar()
    }, INTERVALO)
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') olhar()
    })
    return () => {
      vivo = false
      clearInterval(relogio)
      assinatura.remove()
      esquecerPendentes()
    }
  }, [ativo])

  return null
}
