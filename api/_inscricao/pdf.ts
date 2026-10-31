/**
 * O PDF da ficha de matricula, montado no servidor a partir da ficha ja
 * conferida (ficha.ts). Sai de dois jeitos:
 *
 * - sem assinatura, para a mae baixar e assinar no gov.br. A marca
 *   "ADAM-FICHA:<hash>" vai no dicionario de informacoes do PDF, em texto
 *   puro (sem object streams): a assinatura do gov.br acrescenta no fim do
 *   arquivo sem mexer no que ja existe, entao o envio acha a marca no PDF
 *   assinado e sabe que ele e desta ficha, sem nada alterado;
 * - com a assinatura feita na tela (imagem), a data, a hora e o registro do
 *   envio — e o documento que fica guardado nesse caso.
 *
 * Os termos sao os da ficha de papel da ADAM (Ficha de inscricao ADAM1).
 */
import {
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFDict,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'

import { codigoDa, hojeBrasilia, marcaDoPdf, MORA_COM, TURNOS, VINCULOS, type Ficha } from './ficha'

export const TERMOS = [
  'Eximir a ADAM de eventuais acidentes – tais como lesões, machucados, torções etc. – decorrentes da prática do futebol, sejam em treinamentos ou em jogos externos. Se ocorrer, é dever da ADAM prestar os primeiros socorros e comunicar o fato ao responsável, que deverá se dirigir ao local indicado a fim de que seja dada continuidade ao atendimento;',
  'Apresentar atestado médico (carimbado e assinado, com CRM do médico) de que o menor está apto ao esporte (prática de futebol e treinos táticos e técnicos);',
  'É indispensável que o atleta esteja estudando. Deverá ser apresentado atestado de matrícula escolar;',
  'Informar a direção da ADAM sobre eventuais problemas de saúde que o atleta venha a sofrer;',
  'A frequência do atleta nos treinos será controlada pela ADAM. Cabe ao responsável pelo aluno zelar pela frequência nos treinamentos;',
  'Os dias e horários dos treinamentos (turmas) serão divulgados previamente pelos professores da ADAM;',
  'O aluno deverá comparecer com o material de treinamento conforme designado pelo professor (chuteira de futebol com ou sem trava, futsal ou society), bem como com o uniforme: camisa, calção e meião;',
  'Os problemas de ordem disciplinar serão resolvidos pela direção da ADAM e posteriormente comunicados aos responsáveis pelo aluno (atleta);',
  'Os materiais – bem como uniforme para jogos, coletes, bolas, cones etc. – são de uso exclusivo da ADAM e serão disponibilizados aos alunos matriculados;',
  'A camisa de treino disponibilizada ao aluno, sob taxa de 20 reais a unidade, é de responsabilidade do aluno e deve ser utilizada em todos os treinos e nas idas aos jogos;',
  'Em caso de perda ou não devolução do material fornecido pela ADAM, o responsável deverá prestar o ressarcimento;',
  'O cancelamento da matrícula deve ser comunicado à direção da ADAM com no mínimo dez dias de antecedência;',
  'A ADAM se resguarda no direito de advertir verbalmente, suspender e até excluir os alunos que venham a incorrer em atos de indisciplina, tais como: desobediências, mentiras, violência, roubos e furtos, uso de drogas, palavras de baixo calão reincidentes, preguiça, atrasos excessivos, ausências sem justificativa e falta de respeito, principalmente nas palestras (todos esses atos incluem locais externos ao projeto);',
  'Os casos excepcionais serão resolvidos pela direção da ADAM, dando conhecimento aos responsáveis pelos alunos (atletas);',
  'O atleta só poderá participar das atividades da ADAM devidamente matriculado e tendo o seu responsável legal preenchido e assinado esta autorização, bem como o questionário de prontidão para atividade física, isentando a ADAM de qualquer responsabilidade sobre as condições físicas e de saúde do atleta aqui indicado.',
]

export const LGPD =
  'nos termos do Artigo 14, § 1º, da Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709, de 14 de agosto de 2018): “O tratamento de dados pessoais de crianças deverá ser realizado com o consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal.”'

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

const br = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')
const fone = (d: string) =>
  !d
    ? ''
    : d.length === 11
      ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
const cpf = (d: string) => `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
const cep = (d: string) => (d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d)
const simNao = (v: string) =>
  v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : v === 'as_vezes' ? 'Às vezes' : '—'

/**
 * A fonte padrao do PDF (Helvetica) so escreve o alfabeto latino: o resto
 * (emoji, outros alfabetos) vira "?" em vez de derrubar o PDF.
 */
const EXTRAS = '–—‘’“”•…€'
const escrevivel = (t: string) =>
  Array.from(t)
    .map((ch) => (ch.charCodeAt(0) <= 0xff || EXTRAS.includes(ch) ? ch : '?'))
    .join('')

export type Assinatura =
  | { tipo: 'govbr' }
  | {
      tipo: 'tela'
      /** PNG da assinatura feita com o dedo */
      imagem: Uint8Array
      /** quando foi enviada (ISO) */
      quando: string
      /** registro do envio (ip com sal, abreviado) */
      registro: string
    }

const MARGEM = 48
const LARGURA = 595.28 // A4
const ALTURA = 841.89
const ROXO = rgb(0.62, 0.02, 0.82)
const CINZA = rgb(0.35, 0.35, 0.4)

class Escritor {
  private pagina!: PDFPage
  private y = 0
  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private negrito: PDFFont,
    private rodape: string,
  ) {
    this.novaPagina()
  }

  novaPagina() {
    this.pagina = this.doc.addPage([LARGURA, ALTURA])
    this.y = ALTURA - MARGEM
    this.pagina.drawText(escrevivel(this.rodape), {
      x: MARGEM,
      y: 24,
      size: 7.5,
      font: this.normal,
      color: CINZA,
    })
  }

  /** Garante `altura` livre na pagina; senao, vira a pagina. */
  espaco(altura: number) {
    if (this.y - altura < MARGEM) this.novaPagina()
  }

  linhas(texto: string, tamanho: number, fonte: PDFFont, largura: number) {
    const saida: string[] = []
    for (const paragrafo of escrevivel(texto).split('\n')) {
      let atual = ''
      for (const palavra of paragrafo.split(' ')) {
        const tentativa = atual ? `${atual} ${palavra}` : palavra
        if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
          saida.push(atual)
          atual = palavra
        } else atual = tentativa
      }
      saida.push(atual)
    }
    return saida
  }

  texto(
    texto: string,
    o: {
      tamanho?: number
      negrito?: boolean
      cor?: ReturnType<typeof rgb>
      recuo?: number
      depois?: number
    } = {},
  ) {
    const tamanho = o.tamanho ?? 9.5
    const fonte = o.negrito ? this.negrito : this.normal
    const recuo = o.recuo ?? 0
    const altura = tamanho * 1.35
    for (const linha of this.linhas(texto, tamanho, fonte, LARGURA - 2 * MARGEM - recuo)) {
      this.espaco(altura)
      this.y -= altura
      this.pagina.drawText(linha, {
        x: MARGEM + recuo,
        y: this.y,
        size: tamanho,
        font: fonte,
        color: o.cor ?? rgb(0, 0, 0),
      })
    }
    this.y -= o.depois ?? 0
  }

  titulo(texto: string) {
    this.espaco(40)
    this.y -= 10
    this.texto(texto.toUpperCase(), { tamanho: 10.5, negrito: true, cor: ROXO, depois: 4 })
  }

  /** "Rotulo: valor", com o rotulo em negrito. */
  campo(rotulo: string, valor: string) {
    const tamanho = 9.5
    const altura = tamanho * 1.35
    const r = escrevivel(`${rotulo}: `)
    const larguraRotulo = this.negrito.widthOfTextAtSize(r, tamanho)
    const linhas = this.linhas(
      valor || '—',
      tamanho,
      this.normal,
      LARGURA - 2 * MARGEM - larguraRotulo,
    )
    linhas.forEach((linha, i) => {
      this.espaco(altura)
      this.y -= altura
      if (i === 0)
        this.pagina.drawText(r, { x: MARGEM, y: this.y, size: tamanho, font: this.negrito })
      this.pagina.drawText(linha, {
        x: MARGEM + larguraRotulo,
        y: this.y,
        size: tamanho,
        font: this.normal,
      })
    })
  }

  imagem(png: Awaited<ReturnType<PDFDocument['embedPng']>>, largura: number) {
    const escala = largura / png.width
    const altura = png.height * escala
    this.espaco(altura + 4)
    this.y -= altura
    this.pagina.drawImage(png, { x: MARGEM, y: this.y, width: largura, height: altura })
  }

  linhaDeAssinatura() {
    this.espaco(20)
    this.y -= 4
    this.pagina.drawLine({
      start: { x: MARGEM, y: this.y },
      end: { x: MARGEM + 300, y: this.y },
      thickness: 0.6,
      color: CINZA,
    })
  }

  pular(altura: number) {
    this.y -= altura
  }
}

export async function montarPdf(
  ficha: Ficha,
  hash: string,
  unidade: string,
  assinatura: Assinatura | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Ficha de matrícula ADAM – ${ficha.crianca.nome}`)
  doc.setAuthor('ADAM – Associação Desportiva Apoio ao Menor')
  doc.setSubject(marcaDoPdf(hash))
  doc.setCreator('Inscrição online ADAM')
  // a marca tambem em texto puro (PDFString), para achar no arquivo assinado.
  // O setSubject grava em UTF-16 hexadecimal; o getInfoDict e privado na
  // tipagem do pdf-lib, mas e o jeito de por uma chave propria no dicionario.
  ;(doc as unknown as { getInfoDict(): PDFDict })
    .getInfoDict()
    .set(PDFName.of('AdamFicha'), PDFString.of(marcaDoPdf(hash)))

  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold)
  const codigo = codigoDa(hash)
  const e = new Escritor(
    doc,
    normal,
    negrito,
    `ADAM – Associação Desportiva Apoio ao Menor · Av. Industrial, Praça Olímpia, Cerejeiras, Atibaia · Ficha ${codigo}`,
  )
  const { crianca: c, familia: f, saude: s, declarante: d } = ficha
  const rg = d.rgOrgao ? `${d.rg} (${d.rgOrgao})` : d.rg

  e.texto('ADAM – ASSOCIAÇÃO DESPORTIVA APOIO AO MENOR', { tamanho: 13, negrito: true, cor: ROXO })
  e.texto('Ficha de matrícula · inscrição online', { tamanho: 11, negrito: true, depois: 2 })
  e.texto(`Código da ficha: ${codigo}`, { tamanho: 8.5, cor: CINZA })

  e.titulo('Atleta')
  e.campo('Nome do atleta', c.nome)
  e.campo('Nascimento', br(c.nascimento))
  e.campo('Unidade', unidade)
  e.campo('Endereço', `${c.rua}, ${c.numero}`)
  e.campo('CEP', cep(c.cep))
  e.campo('Bairro', c.bairro)
  e.campo('Cidade', c.cidade)
  e.campo(
    'Aulas semanais no projeto',
    c.aulasPorSemana ? `${c.aulasPorSemana} ${c.aulasPorSemana === '1' ? 'vez' : 'vezes'}` : '—',
  )
  e.campo(
    'Dias que vai',
    c.dias
      .split(',')
      .filter(Boolean)
      .map((d) => (d === 'sabado' ? 'Sábado' : 'Quarta'))
      .join(' e '),
  )
  e.campo('Escola em que estuda', c.escola)
  e.campo('Turno', c.turno ? TURNOS[c.turno] : '—')
  e.campo('Série atual', c.serie)

  e.titulo('Família e contatos')
  e.campo('Nome da mãe', f.nomeMae)
  e.campo('Nome do pai', f.nomePai)
  e.campo(
    'Mora com',
    f.moraCom ? MORA_COM[f.moraCom] + (f.moraComQuem ? ` (${f.moraComQuem})` : '') : '—',
  )
  e.campo('Tem irmãos', simNao(f.irmaos) + (f.irmaosQuantos ? ` · ${f.irmaosQuantos}` : ''))
  e.campo('Frequenta igreja', simNao(f.igreja) + (f.igrejaQual ? ` · ${f.igrejaQual}` : ''))
  e.campo(
    'Família atendida pelo CRAS Atibaia',
    simNao(f.cras) + (f.crasUnidade ? ` · ${f.crasUnidade}` : ''),
  )
  ficha.responsaveis.forEach((r, i) => {
    e.campo(
      `Responsável ${i + 1}`,
      `${r.nome} (${r.parentesco}) · celular ${fone(r.telefone)}${r.whatsapp ? ' · WhatsApp' : ''}`,
    )
  })
  e.campo('Em caso de urgência chamar', `${f.urgenciaNome} · ${fone(f.urgenciaTelefone)}`)

  e.titulo('Saúde')
  e.campo('Tem problemas de saúde', s.problemas === 'sim' ? `Sim · ${s.descricao}` : 'Não')
  e.campo('Alergias', s.alergias)
  e.campo('Peso', s.peso)
  e.campo('Altura', s.altura)
  e.campo('Tipo sanguíneo', s.tipoSanguineo)
  e.campo('Tamanho da chuteira', s.chuteira)
  e.campo('Convênio médico', simNao(s.convenio) + (s.convenioQual ? ` · ${s.convenioQual}` : ''))
  e.campo('Observações', s.observacoes)

  e.titulo('Declaração do responsável pelo menor de idade')
  e.texto(
    `Eu, ${d.nome}, portador(a) do RG ${rg} e inscrito(a) no CPF ${cpf(d.cpf)}, ${VINCULOS[d.vinculo].toLowerCase()} do menor (atleta) acima citado, venho solicitar a sua inscrição na Escolinha de Futebol ADAM e CONCORDO com os termos abaixo:`,
    { depois: 4 },
  )
  TERMOS.forEach((t, i) => e.texto(`${i + 1}. ${t}`, { recuo: 8, depois: 2 }))
  e.pular(4)
  e.texto(
    `Nestes termos assino a presente declaração e AUTORIZO o menor ${c.nome} a frequentar as atividades desportivas da ADAM, informando ainda que o mesmo encontra-se matriculado em escola de ensino regular, em plenas condições de saúde para a prática de esporte, consciente e me responsabilizando por todo e qualquer acidente que o menor venha a sofrer praticando esporte nos locais de treino da ADAM.`,
    { depois: 6 },
  )
  e.texto(
    `${d.autorizaImagem ? '[X] AUTORIZO' : '[X] NÃO AUTORIZO'} a divulgação das imagens (fotos e vídeos) dos treinos, jogos e eventos especiais, ${LGPD}`,
    { negrito: false, depois: 6 },
  )
  e.texto(
    'OBS.: A matrícula só terá validade mediante a apresentação desta ficha preenchida e assinada pelo responsável, a entrega dos documentos e os atestados médicos exigidos pela direção da ADAM.',
    { tamanho: 8.5, cor: CINZA },
  )

  e.titulo('Declaração de responsabilidade')
  e.texto(
    `Eu, ${d.nome}, inscrito(a) no CPF nº ${cpf(d.cpf)} e portador(a) do RG nº ${rg}, responsável pelo menor ${c.nome}, estou ciente da proposta, assumindo a veracidade das informações prestadas neste questionário. Também estou ciente de que é necessário consultar um médico antes de aumentar o nível atual de atividade física do meu filho, caso tenha respondido "sim" a uma ou mais perguntas do Questionário de Prontidão para Atividade Física (PAR-Q). Assumo plena responsabilidade por qualquer atividade física praticada sem o atendimento a essa recomendação.`,
    { depois: 8 },
  )

  const hoje = hojeBrasilia(assinatura?.tipo === 'tela' ? new Date(assinatura.quando) : new Date())
  const [ano, mes, dia] = hoje.split('-').map(Number)
  e.texto(`Atibaia, ${dia} de ${MESES[mes - 1]} de ${ano}.`, { depois: 10 })

  e.espaco(110)
  if (assinatura?.tipo === 'tela') {
    const png = await doc.embedPng(assinatura.imagem)
    e.imagem(png, 200)
  } else {
    e.pular(36)
  }
  e.linhaDeAssinatura()
  e.texto(`${d.nome} · ${VINCULOS[d.vinculo]} · CPF ${cpf(d.cpf)} · RG ${rg}`, { tamanho: 9 })
  if (assinatura?.tipo === 'tela') {
    const quando = new Date(new Date(assinatura.quando).getTime() - 3 * 3600_000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 16)
    e.texto(
      `Assinado eletronicamente na tela pelo(a) responsável em ${br(quando.slice(0, 10))} às ${quando.slice(11)} (horário de Brasília), no formulário de inscrição online da ADAM. Registro do envio: ${assinatura.registro}. Código da ficha: ${codigo}.`,
      { tamanho: 8, cor: CINZA },
    )
  } else {
    e.texto('Assinatura digital gov.br do responsável (assinador.iti.br).', {
      tamanho: 8,
      cor: CINZA,
    })
  }

  // sem object streams: a marca fica legivel no arquivo (ver o comentario do topo)
  return doc.save({ useObjectStreams: false })
}
