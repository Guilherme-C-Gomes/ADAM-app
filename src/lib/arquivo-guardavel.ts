import { Platform } from 'react-native'

/**
 * Na versao web, o arquivo escolhido chega como "blob:...", um endereco que
 * so vale enquanto a pagina esta aberta. O celular recarrega a pagina ao sair
 * para a camera ou os arquivos, e o rascunho (guardado no aparelho) ficaria
 * apontando para nada. Aqui o arquivo vira "data:..." — o proprio conteudo —
 * que sobrevive a recarga. Fora da web (ou se ja e data:/https:), volta igual.
 */
export async function arquivoGuardavel(uri: string): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('blob:')) return uri
  try {
    const blob = await (await fetch(uri)).blob()
    return await new Promise<string>((ok, falhou) => {
      const leitor = new FileReader()
      leitor.onload = () => ok(String(leitor.result))
      leitor.onerror = () => falhou(leitor.error)
      leitor.readAsDataURL(blob)
    })
  } catch {
    return uri
  }
}
