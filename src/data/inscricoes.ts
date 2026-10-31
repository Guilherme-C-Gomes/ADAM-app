import { useCallback, useEffect, useState } from 'react'

import { DOCUMENTOS, paraBR } from '@/data/fichas'
import { deInscricao } from '@/data/ficha-matricula'
import { sessao } from '@/data/perfis'
import { FICHA_VAZIA, rascunhoFicha, type Anexo, type Contato } from '@/data/rascunhos'
import { criarRascunho } from '@/hooks/use-rascunho'
import { supabase } from '@/lib/supabase'
import { mascaraTelefone } from '@/lib/telefone'

/**
 * Inscricoes pelo link: a ficha de matricula que a familia preenche e
 * assina no formulario publico (pagina em `inscricao/`, funcoes em `api/inscricao/`). Chegam
 * "pendentes"; a Secretaria confere e cadastra a crianca pelo formulario de
 * sempre, ja preenchido — ou recusa.
 *
 * So ADM e Secretaria leem (RLS); excluir, so quem administra a Secretaria.
 * Os arquivos ficam no bucket privado `inscricoes`.
 */

/** O endereco que a Secretaria manda para as familias. */
export const LINK_INSCRICAO = 'https://adam-inscricao.vercel.app'

/** O formato de `inscricoes.dados` (api/_inscricao/ficha.ts e a fonte). */
export type FichaInscricao = {
  crianca: {
    nome: string
    nascimento: string
    unidadeId: string
    rua?: string
    numero?: string
    /** inscricoes antigas: rua e numero juntos */
    endereco?: string
    cep: string
    bairro: string
    cidade: string
    escola: string
    turno: string
    serie: string
    aulasPorSemana: string
    dias: string
  }
  familia: {
    nomeMae: string
    nomePai: string
    moraCom: string
    moraComQuem: string
    irmaos: string
    irmaosQuantos: string
    igreja: string
    igrejaQual: string
    cras: string
    crasUnidade: string
    urgenciaNome: string
    urgenciaTelefone: string
  }
  responsaveis: { nome: string; parentesco: string; telefone: string; whatsapp: boolean }[]
  saude: {
    problemas: 'sim' | 'nao'
    descricao: string
    alergias: string
    peso: string
    altura: string
    tipoSanguineo: string
    chuteira: string
    convenio: string
    convenioQual: string
    observacoes: string
  }
  declarante: {
    nome: string
    rg: string
    rgOrgao?: string
    cpf: string
    vinculo: 'pai' | 'mae' | 'responsavel_legal'
    autorizaImagem: boolean
  }
}

export type StatusInscricao = 'pendente' | 'aprovada' | 'recusada'

export type Inscricao = {
  id: string
  criadoEm: string
  status: StatusInscricao
  criancaNome: string
  nascimento: string
  unidade: string
  dados: FichaInscricao
  codigo: string
  assinaturaTipo: 'govbr' | 'tela'
  assinaturaReconhecida: boolean
  fichaPath: string
  /** campo -> caminho no bucket: foto, rg_certidao, comprovante_residencia... */
  arquivos: Record<string, string>
  decididoEm: string | null
  criancaId: string | null
}

export const NOMES_DOS_ARQUIVOS: Record<string, string> = {
  foto: 'Foto da criança',
  rg_certidao: 'RG ou certidão de nascimento',
  comprovante_residencia: 'Comprovante de residência',
  atestado_medico: 'Atestado médico',
  matricula_escolar: 'Atestado de matrícula escolar',
}

type Linha = {
  id: string
  criado_em: string
  status: StatusInscricao
  crianca_nome: string
  nascimento: string
  dados: FichaInscricao
  hash: string
  assinatura_tipo: 'govbr' | 'tela'
  assinatura_reconhecida: boolean
  ficha_path: string
  arquivos: Record<string, string> | null
  decidido_em: string | null
  crianca_id: string | null
  unidades: { nome: string } | null
}

const CAMPOS =
  'id, criado_em, status, crianca_nome, nascimento, dados, hash, assinatura_tipo, assinatura_reconhecida, ficha_path, arquivos, decidido_em, crianca_id, unidades(nome)'

const daLinha = (l: Linha): Inscricao => ({
  id: l.id,
  criadoEm: l.criado_em,
  status: l.status,
  criancaNome: l.crianca_nome,
  nascimento: l.nascimento,
  unidade: l.unidades?.nome ?? '',
  dados: l.dados,
  codigo: l.hash.slice(0, 8).toUpperCase(),
  assinaturaTipo: l.assinatura_tipo,
  assinaturaReconhecida: l.assinatura_reconhecida,
  fichaPath: l.ficha_path,
  arquivos: l.arquivos ?? {},
  decididoEm: l.decidido_em,
  criancaId: l.crianca_id,
})

const SEM_TABELA = 'Falta rodar o SQL das inscrições no Supabase.'

function mensagemDe(e: { code?: string; message?: string } | null) {
  return e?.code === '42P01' || e?.code === 'PGRST205'
    ? SEM_TABELA
    : 'Não foi possível ler as inscrições.'
}

/** As inscricoes de um status, da mais nova para a mais antiga. */
export function useInscricoes(status: StatusInscricao) {
  const [estado, setEstado] = useState({
    lista: [] as Inscricao[],
    carregando: true,
    erro: null as string | null,
  })
  const [vez, setVez] = useState(0)
  const recarregar = useCallback(() => setVez((v) => v + 1), [])

  useEffect(() => {
    let ativo = true
    supabase
      .from('inscricoes')
      .select(CAMPOS)
      .eq('status', status)
      .order('criado_em', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setEstado({ lista: [], carregando: false, erro: mensagemDe(error) })
        else {
          setEstado({
            lista: (data as unknown as Linha[]).map(daLinha),
            carregando: false,
            erro: null,
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [status, vez])

  return { ...estado, recarregar }
}

/**
 * Quantas estao esperando a Secretaria (null: nao deu para contar). Um valor
 * so para o app todo: o numero na barra de menu, a linha da Secretaria e o
 * aviso ao abrir o app (components/aviso-inscricoes.tsx) leem daqui.
 */
const pendentes = criarRascunho({ total: null as number | null })

export async function contarPendentes() {
  const { count, error } = await supabase
    .from('inscricoes')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendente')
  const total = error ? null : (count ?? 0)
  pendentes.definir({ total })
  return total
}

/** Quem sai da conta (ou nao ve fichas) nao fica com o numero de outra conta. */
export const esquecerPendentes = () => pendentes.definir({ total: null })

export function usePendentes() {
  const { total } = pendentes.useValor()
  const recarregar = useCallback(() => {
    contarPendentes()
  }, [])
  return { total, recarregar }
}

export function useInscricao(id: string | undefined) {
  const [estado, setEstado] = useState({
    inscricao: null as Inscricao | null,
    carregando: true,
    erro: null as string | null,
  })
  const [vez, setVez] = useState(0)
  const recarregar = useCallback(() => setVez((v) => v + 1), [])

  useEffect(() => {
    let ativo = true
    if (!id) return
    supabase
      .from('inscricoes')
      .select(CAMPOS)
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setEstado({ inscricao: null, carregando: false, erro: mensagemDe(error) })
        else {
          setEstado({
            inscricao: data ? daLinha(data as unknown as Linha) : null,
            carregando: false,
            erro: data ? null : 'Inscrição não encontrada.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [id, vez])

  return { ...estado, recarregar }
}

/** Endereco temporario de um arquivo da inscricao (o bucket e privado). */
export async function urlDoArquivo(caminho: string, segundos = 3600) {
  const { data, error } = await supabase.storage
    .from('inscricoes')
    .createSignedUrl(caminho, segundos)
  if (error || !data) throw new Error('Não foi possível abrir o arquivo.')
  return data.signedUrl
}

const tipoDo = (caminho: string) =>
  caminho.endsWith('.pdf')
    ? 'application/pdf'
    : caminho.endsWith('.png')
      ? 'image/png'
      : caminho.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg'

/**
 * Poe a inscricao no rascunho da ficha, para a Secretaria conferir e salvar
 * no formulario de sempre (cadastrar.tsx). Os arquivos entram como anexos
 * por endereco temporario: o "Salvar ficha" baixa e grava no bucket `fichas`.
 * A ficha assinada vale como isencao de responsabilidade e, se a familia
 * autorizou, como direito de imagem.
 */
export async function prepararCadastro(i: Inscricao) {
  const d = i.dados
  // 6 horas: da tempo de conferir com calma antes de salvar
  const url = (caminho: string) => urlDoArquivo(caminho, 6 * 3600)
  const anexos: Record<number, Anexo> = {}
  const documentos: number[] = []
  const anexar = async (tipo: string, caminho: string | undefined) => {
    const indice = DOCUMENTOS.findIndex((doc) => doc.tipo === tipo)
    if (indice < 0 || !caminho) return
    documentos.push(indice)
    anexos[indice] = {
      nome: caminho.split('/').pop() ?? 'arquivo',
      uri: await url(caminho),
      tipo: tipoDo(caminho),
    }
  }
  await anexar('rg_certidao', i.arquivos.rg_certidao)
  await anexar('comprovante_residencia', i.arquivos.comprovante_residencia)
  await anexar('isencao_responsabilidade', i.fichaPath)
  if (d.declarante.autorizaImagem) await anexar('direito_imagem', i.fichaPath)

  const s = d.saude
  const observacao = [
    s.problemas === 'sim' ? `Saúde: ${s.descricao}` : '',
    s.alergias ? `Alergias: ${s.alergias}` : '',
    s.tipoSanguineo ? `Tipo sanguíneo: ${s.tipoSanguineo}` : '',
    s.convenio === 'sim' ? `Convênio: ${s.convenioQual || 'sim'}` : '',
    s.observacoes ? `Obs.: ${s.observacoes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // quem assinou a ficha (declarante) e um dos responsaveis: o de mesmo
  // nome; sem nome igual, o responsavel 1
  const simples = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ')
  const doDeclarante = Math.max(
    0,
    d.responsaveis.findIndex((r) => simples(r.nome) === simples(d.declarante.nome)),
  )
  const contatos: Contato[] = d.responsaveis.map((r, n) => ({
    nome: r.nome,
    parentesco: r.parentesco,
    telefone: mascaraTelefone(r.telefone),
    whatsapp: r.whatsapp,
    principal: n === 0,
    ...(n === doDeclarante
      ? { cpf: d.declarante.cpf, rg: d.declarante.rg, rgOrgao: d.declarante.rgOrgao ?? '' }
      : {}),
  }))

  rascunhoFicha.definir({
    ...FICHA_VAZIA,
    inscricaoId: i.id,
    nome: d.crianca.nome,
    nascimento: paraBR(d.crianca.nascimento),
    unidadeId: d.crianca.unidadeId,
    fotoUri: i.arquivos.foto ? await url(i.arquivos.foto) : undefined,
    observacao,
    contatos,
    documentos: documentos.sort(),
    anexos,
    matricula: deInscricao(d as unknown as Parameters<typeof deInscricao>[0]),
  })
}

// cadastrar: o "Salvar ficha" (salvarFicha, em data/fichas.ts) marca a
// inscricao como "aprovada" quando o rascunho tem `inscricaoId`

export async function recusarInscricao(id: string) {
  const { error, count } = await supabase
    .from('inscricoes')
    .update(
      {
        status: 'recusada',
        decidido_em: new Date().toISOString(),
        decidido_por: sessao.ler().usuarioId ?? null,
      },
      { count: 'exact' },
    )
    .eq('id', id)
  if (error || !count) throw new Error('Não foi possível recusar a inscrição.')
}

/** Apaga a inscricao e os arquivos dela. So quem administra a Secretaria. */
export async function excluirInscricao(i: Inscricao) {
  const caminhos = [i.fichaPath, ...Object.values(i.arquivos)]
  const { error, count } = await supabase
    .from('inscricoes')
    .delete({ count: 'exact' })
    .eq('id', i.id)
  if (error || !count) {
    throw new Error('Não foi possível excluir. Só quem coordena a Secretaria pode excluir.')
  }
  // a linha ja foi; arquivo que nao sair fica orfao, sem ninguem ver
  await supabase.storage.from('inscricoes').remove(caminhos)
}
