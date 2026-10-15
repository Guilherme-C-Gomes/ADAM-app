import { sessao } from '@/data/perfis'
import { enderecoDaFoto } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * A foto de quem esta logado. Mora no bucket privado `perfis`, na pasta da
 * propria conta (`<id>/...`): o banco so deixa cada um mexer na sua. A
 * coluna `usuarios.foto_path` so muda pela funcao `definir_minha_foto`,
 * porque o resto da linha (funcao, permissao) e do ADM.
 */

const FALTA_SQL = 'Falta rodar o SQL novo no Supabase (foto do usuário).'

export async function trocarMinhaFoto(uri: string) {
  const { usuarioId, pessoa } = sessao.ler()
  if (!usuarioId || !pessoa) throw new Error('Entre de novo para trocar a foto.')

  // nome novo a cada troca: assim nada fica preso em cache com a foto antiga
  const caminho = `${usuarioId}/${Date.now()}.jpg`
  const dados = await (await fetch(uri)).arrayBuffer()
  const envio = await supabase.storage
    .from('perfis')
    .upload(caminho, dados, { contentType: 'image/jpeg' })
  if (envio.error) {
    throw new Error(
      /bucket/i.test(envio.error.message) ? FALTA_SQL : 'Não foi possível enviar a foto.',
    )
  }

  const { error } = await supabase.rpc('definir_minha_foto', { p_path: caminho })
  if (error) {
    await supabase.storage.from('perfis').remove([caminho])
    throw new Error(error.code === 'PGRST202' ? FALTA_SQL : 'Não foi possível salvar a foto.')
  }

  if (pessoa.fotoPath) await supabase.storage.from('perfis').remove([pessoa.fotoPath])
  sessao.definir({
    pessoa: { ...pessoa, fotoPath: caminho, foto: await enderecoDaFoto(caminho) },
  })
}

export async function removerMinhaFoto() {
  const { pessoa } = sessao.ler()
  if (!pessoa?.fotoPath) return
  const { error } = await supabase.rpc('definir_minha_foto', { p_path: null })
  if (error) throw new Error('Não foi possível tirar a foto.')
  await supabase.storage.from('perfis').remove([pessoa.fotoPath])
  sessao.definir({ pessoa: { ...pessoa, fotoPath: null, foto: null } })
}
