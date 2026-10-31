import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'

/**
 * Tirar foto ou escolher da galeria, no app e na versao web.
 *
 * No app: o ImagePicker de sempre. Na web, um seletor proprio: o do
 * expo-image-picker monta o filtro de tipo como ",image/*" (com a virgula
 * na frente), e o Android nao reconhece como "fotos" — abria o gerenciador
 * de ARQUIVOS em vez da galeria. Aqui o filtro e "image/*" exato (galeria)
 * e, na camera, com capture. A foto ja sai reduzida (ate 1600px, JPEG): de
 * uns 5 MB para uns 300 KB, cabe no rascunho guardado no aparelho e sobe
 * rapido.
 */
export type ImagemEscolhida = { uri: string; nome: string; tipo: string }

const LADO_MAXIMO = 1600

export async function tirarFoto(
  opcoes: { editar?: boolean } = {},
): Promise<ImagemEscolhida | null> {
  if (Platform.OS === 'web') return seletorWeb(true)
  const permissao = await ImagePicker.requestCameraPermissionsAsync()
  if (!permissao.granted) return null
  const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: opcoes.editar })
  const a = !r.canceled ? r.assets[0] : undefined
  return a ? { uri: a.uri, nome: a.fileName ?? 'foto.jpg', tipo: a.mimeType ?? 'image/jpeg' } : null
}

export async function escolherDaGaleria(
  opcoes: { editar?: boolean } = {},
): Promise<ImagemEscolhida | null> {
  if (Platform.OS === 'web') return seletorWeb(false)
  const r = await ImagePicker.launchImageLibraryAsync({
    quality: 0.7,
    allowsEditing: opcoes.editar,
  })
  const a = !r.canceled ? r.assets[0] : undefined
  return a ? { uri: a.uri, nome: a.fileName ?? 'foto.jpg', tipo: a.mimeType ?? 'image/jpeg' } : null
}

function seletorWeb(camera: boolean): Promise<ImagemEscolhida | null> {
  return new Promise((resolver) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (camera) input.setAttribute('capture', 'environment')
    input.style.display = 'none'
    let pronto = false
    const fim = (r: ImagemEscolhida | null) => {
      if (pronto) return
      pronto = true
      input.remove()
      resolver(r)
    }
    input.addEventListener('change', async () => {
      const arquivo = input.files?.[0]
      if (!arquivo) return fim(null)
      try {
        fim({
          uri: await reduzida(arquivo),
          nome: arquivo.name.replace(/\.\w+$/, '') + '.jpg',
          tipo: 'image/jpeg',
        })
      } catch {
        // nao deu para abrir a imagem (formato estranho): vai como veio
        fim({
          uri: await comoDataUrl(arquivo),
          nome: arquivo.name,
          tipo: arquivo.type || 'image/jpeg',
        })
      }
    })
    input.addEventListener('cancel', () => fim(null))
    document.body.appendChild(input)
    input.click()
  })
}

/** A foto em JPEG de ate 1600px, como "data:" (sobrevive a recarga da pagina). */
async function reduzida(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function comoDataUrl(arquivo: File): Promise<string> {
  return new Promise((ok, falhou) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(String(leitor.result))
    leitor.onerror = () => falhou(leitor.error)
    leitor.readAsDataURL(arquivo)
  })
}
