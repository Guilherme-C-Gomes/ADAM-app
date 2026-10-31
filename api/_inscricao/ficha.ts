/**
 * A ficha de matricula da ADAM, como o formulario manda: o formato, a
 * limpeza e a conferencia. O PDF (pdf.ts) e o envio (api/inscricao/enviar.ts)
 * passam os dados por `conferirFicha` — assim a ficha que a mae baixa para
 * assinar no gov.br e a que chega no envio dao o mesmo `hash`.
 *
 * O app le o mesmo formato da coluna `inscricoes.dados`
 * (src/data/inscricoes.ts): mudar um nome aqui e mudar la tambem.
 */
import { createHash } from 'node:crypto'

export type SimNao = 'sim' | 'nao'

export type Responsavel = {
  nome: string
  parentesco: string
  /** so os numeros, com DDD: "11987654321" */
  telefone: string
  whatsapp: boolean
}

export type Ficha = {
  crianca: {
    nome: string
    /** "AAAA-MM-DD" */
    nascimento: string
    unidadeId: string
    endereco: string
    cep: string
    bairro: string
    cidade: string
    escola: string
    turno: '' | 'manha' | 'tarde' | 'noite' | 'integral_manha_tarde' | 'integral_tarde_noite'
    serie: string
    aulasPorSemana: '' | '1' | '2' | '3'
    dias: string
  }
  familia: {
    nomeMae: string
    nomePai: string
    moraCom: '' | 'pai_e_mae' | 'mae' | 'pai' | 'outros'
    moraComQuem: string
    irmaos: '' | SimNao
    irmaosQuantos: string
    igreja: '' | SimNao | 'as_vezes'
    igrejaQual: string
    cras: '' | SimNao
    crasUnidade: string
    telResidencial: string
    urgenciaNome: string
    urgenciaTelefone: string
  }
  responsaveis: Responsavel[]
  saude: {
    problemas: SimNao
    descricao: string
    alergias: string
    peso: string
    altura: string
    tipoSanguineo: string
    chuteira: string
    convenio: '' | SimNao
    convenioQual: string
    observacoes: string
  }
  declarante: {
    nome: string
    rg: string
    /** orgao expedidor do RG (SSP/SP...) */
    rgOrgao: string
    /** so os numeros */
    cpf: string
    vinculo: 'pai' | 'mae' | 'responsavel_legal'
    autorizaImagem: boolean
    aceitaTermos: true
  }
}

export const TURNOS: Record<Exclude<Ficha['crianca']['turno'], ''>, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral_manha_tarde: 'Integral (manhã/tarde)',
  integral_tarde_noite: 'Integral (tarde/noite)',
}
export const MORA_COM: Record<Exclude<Ficha['familia']['moraCom'], ''>, string> = {
  pai_e_mae: 'Pai e mãe',
  mae: 'Mãe',
  pai: 'Pai',
  outros: 'Outros responsáveis',
}
export const VINCULOS: Record<Ficha['declarante']['vinculo'], string> = {
  pai: 'Pai',
  mae: 'Mãe',
  responsavel_legal: 'Responsável legal',
}

// ─── limpeza ─────────────────────────────────────────────────────────

type Bruto = Record<string, unknown>

const obj = (v: unknown): Bruto =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Bruto) : {}
/** Texto limpo: sem espacos sobrando, sem caracteres de controle, com teto. */
const txt = (v: unknown, max: number) =>
  typeof v === 'string'
    ? v
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : ''
const digitos = (v: unknown, max: number) => txt(v, 40).replace(/\D/g, '').slice(0, max)
const umDe = <T extends string>(v: unknown, opcoes: readonly T[]): T | '' =>
  opcoes.includes(v as T) ? (v as T) : ''

/** Telefone do Brasil sem o 55 do pais: DDD + 8 ou 9 numeros. */
function telefone(v: unknown) {
  let d = digitos(v, 15)
  // o formulario escreve "+55 (DD) ...": o 55 e do pais, nao do DDD
  if (/^\s*\+55/.test(String(v)) || (d.length > 11 && d.startsWith('55'))) d = d.slice(2)
  return d.slice(0, 11)
}
const telefoneOk = (d: string) => d.length === 10 || d.length === 11

export function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const dv = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10])
}

/** Hoje em Brasilia, "AAAA-MM-DD". */
export function hojeBrasilia(agora = new Date()) {
  return new Date(agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10)
}

function idadeEm(nascimento: string, hoje: string) {
  const [a, m, d] = nascimento.split('-').map(Number)
  const [ha, hm, hd] = hoje.split('-').map(Number)
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type Conferida = { ok: true; ficha: Ficha; hash: string } | { ok: false; erros: string[] }

/**
 * Limpa e confere a ficha que veio do navegador. Devolve a ficha no
 * formato certo (so os campos conhecidos) e o hash dela, ou a lista do que
 * falta, em frases para a mae ler.
 */
export function conferirFicha(entrada: unknown): Conferida {
  const e = obj(entrada)
  const c = obj(e.crianca)
  const f = obj(e.familia)
  const s = obj(e.saude)
  const d = obj(e.declarante)
  const erros: string[] = []

  const crianca: Ficha['crianca'] = {
    nome: txt(c.nome, 120),
    nascimento: /^\d{4}-\d{2}-\d{2}$/.test(String(c.nascimento)) ? String(c.nascimento) : '',
    unidadeId: UUID.test(String(c.unidadeId)) ? String(c.unidadeId).toLowerCase() : '',
    endereco: txt(c.endereco, 200),
    cep: digitos(c.cep, 8),
    bairro: txt(c.bairro, 80),
    cidade: txt(c.cidade, 80),
    escola: txt(c.escola, 120),
    turno: umDe(c.turno, Object.keys(TURNOS) as (keyof typeof TURNOS)[]),
    serie: txt(c.serie, 40),
    aulasPorSemana: umDe(c.aulasPorSemana, ['1', '2', '3'] as const),
    dias: txt(c.dias, 120),
  }
  if (crianca.nome.split(' ').length < 2) erros.push('Escreva o nome completo da criança.')
  if (!crianca.nascimento) erros.push('Falta a data de nascimento da criança.')
  else {
    const idade = idadeEm(crianca.nascimento, hojeBrasilia())
    if (Number.isNaN(idade) || idade < 3 || idade > 18) {
      erros.push('Confira a data de nascimento: a ADAM atende crianças de 3 a 18 anos.')
    }
  }
  if (!crianca.unidadeId) erros.push('Escolha a unidade onde a criança vai treinar.')
  if (!crianca.endereco) erros.push('Falta o endereço.')
  if (!crianca.cidade) erros.push('Falta a cidade.')
  if (!crianca.escola) erros.push('Falta a escola em que a criança estuda.')

  const familia: Ficha['familia'] = {
    nomeMae: txt(f.nomeMae, 120),
    nomePai: txt(f.nomePai, 120),
    moraCom: umDe(f.moraCom, Object.keys(MORA_COM) as (keyof typeof MORA_COM)[]),
    moraComQuem: txt(f.moraComQuem, 120),
    irmaos: umDe(f.irmaos, ['sim', 'nao'] as const),
    irmaosQuantos: digitos(f.irmaosQuantos, 2),
    igreja: umDe(f.igreja, ['sim', 'nao', 'as_vezes'] as const),
    igrejaQual: txt(f.igrejaQual, 120),
    cras: umDe(f.cras, ['sim', 'nao'] as const),
    crasUnidade: txt(f.crasUnidade, 120),
    telResidencial: telefone(f.telResidencial),
    urgenciaNome: txt(f.urgenciaNome, 120),
    urgenciaTelefone: telefone(f.urgenciaTelefone),
  }
  if (familia.moraCom !== 'outros') familia.moraComQuem = ''
  if (familia.irmaos !== 'sim') familia.irmaosQuantos = ''
  if (familia.igreja === 'nao' || !familia.igreja) familia.igrejaQual = ''
  if (familia.cras !== 'sim') familia.crasUnidade = ''
  if (familia.telResidencial && !telefoneOk(familia.telResidencial)) {
    erros.push('Confira o telefone residencial (DDD + número).')
  }
  if (!familia.urgenciaNome || !telefoneOk(familia.urgenciaTelefone)) {
    erros.push('Diga quem chamar em caso de urgência, com telefone (DDD + número).')
  }

  const responsaveis: Responsavel[] = (Array.isArray(e.responsaveis) ? e.responsaveis : [])
    .slice(0, 2)
    .map((r) => {
      const o = obj(r)
      return {
        nome: txt(o.nome, 120),
        parentesco: txt(o.parentesco, 40),
        telefone: telefone(o.telefone),
        whatsapp: o.whatsapp !== false,
      }
    })
    // o segundo e opcional: vazio, sai
    .filter((r, i) => i === 0 || r.nome || r.telefone)
  if (!responsaveis.length) erros.push('Falta o responsável 1.')
  responsaveis.forEach((r, i) => {
    if (!r.nome || !r.parentesco || !telefoneOk(r.telefone)) {
      erros.push(`Responsável ${i + 1}: preencha nome, parentesco e celular com DDD.`)
    }
  })

  const saude: Ficha['saude'] = {
    problemas: s.problemas === 'sim' ? 'sim' : 'nao',
    descricao: txt(s.descricao, 600),
    alergias: txt(s.alergias, 300),
    peso: txt(s.peso, 10),
    altura: txt(s.altura, 10),
    tipoSanguineo: txt(s.tipoSanguineo, 12),
    chuteira: txt(s.chuteira, 6),
    convenio: umDe(s.convenio, ['sim', 'nao'] as const),
    convenioQual: txt(s.convenioQual, 120),
    observacoes: txt(s.observacoes, 600),
  }
  if (s.problemas !== 'sim' && s.problemas !== 'nao') {
    erros.push('Diga se a criança tem algum problema de saúde.')
  }
  if (saude.problemas === 'sim' && !saude.descricao) {
    erros.push('Descreva o problema de saúde da criança.')
  }
  if (saude.problemas === 'nao') saude.descricao = ''
  if (saude.convenio !== 'sim') saude.convenioQual = ''

  const declarante: Ficha['declarante'] = {
    nome: txt(d.nome, 120),
    rg: txt(d.rg, 20),
    rgOrgao: txt(d.rgOrgao, 20),
    cpf: digitos(d.cpf, 11),
    vinculo: umDe(d.vinculo, Object.keys(VINCULOS) as (keyof typeof VINCULOS)[]) || 'mae',
    autorizaImagem: d.autorizaImagem === true,
    aceitaTermos: true,
  }
  if (declarante.nome.split(' ').length < 2)
    erros.push('Escreva o seu nome completo na declaração.')
  if (!declarante.rg) erros.push('Falta o seu RG na declaração.')
  if (!cpfValido(declarante.cpf)) erros.push('Confira o seu CPF: o número não confere.')
  if (!umDe(d.vinculo, Object.keys(VINCULOS) as (keyof typeof VINCULOS)[])) {
    erros.push('Diga se você é o pai, a mãe ou o responsável legal.')
  }
  if (d.autorizaImagem !== true && d.autorizaImagem !== false) {
    erros.push('Diga se autoriza ou não o uso de imagem.')
  }
  if (d.aceitaTermos !== true) erros.push('É preciso concordar com os termos da ficha.')

  if (erros.length) return { ok: false, erros }
  const ficha: Ficha = { crianca, familia, responsaveis, saude, declarante }
  return { ok: true, ficha, hash: hashDaFicha(ficha) }
}

/** JSON com as chaves em ordem: o mesmo dado da sempre o mesmo texto. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico((v as Bruto)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v)
}

export function hashDaFicha(ficha: Ficha) {
  return createHash('sha256').update(canonico(ficha)).digest('hex')
}

/** O que vai escrito no PDF e procurado no PDF assinado. */
export const marcaDoPdf = (hash: string) => `ADAM-FICHA:${hash}`
/** Os 8 primeiros do hash, em maiusculas: o codigo que a mae ve. */
export const codigoDa = (hash: string) => hash.slice(0, 8).toUpperCase()
