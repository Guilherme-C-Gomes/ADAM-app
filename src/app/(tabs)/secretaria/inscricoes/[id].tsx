import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native'

import { pedirConfirmacao } from '@/components/ui/confirmacao'
import {
  Aviso,
  Bloco,
  Botao,
  Grupo,
  Linha,
  LinhaValor,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { idadeDe, paraBR } from '@/data/fichas'
import {
  excluirInscricao,
  NOMES_DOS_ARQUIVOS,
  prepararCadastro,
  recusarInscricao,
  urlDoArquivo,
  useInscricao,
  type FichaInscricao,
} from '@/data/inscricoes'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { mascaraTelefone } from '@/lib/telefone'
import { color, space, type } from '@/theme/tokens'

/**
 * Uma inscricao pelo link: tudo o que a familia preencheu, a ficha assinada
 * e os documentos. "Cadastrar crianca" abre o formulario de sempre ja
 * preenchido; salvar la da a baixa aqui.
 */
const TURNOS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral_manha_tarde: 'Integral (manhã/tarde)',
  integral_tarde_noite: 'Integral (tarde/noite)',
}
const MORA_COM: Record<string, string> = {
  pai_e_mae: 'Pai e mãe',
  mae: 'Mãe',
  pai: 'Pai',
  outros: 'Outros responsáveis',
}
const VINCULO: Record<string, string> = {
  mae: 'Mãe',
  pai: 'Pai',
  responsavel_legal: 'Responsável legal',
}
const SIM_NAO: Record<string, string> = { sim: 'Sim', nao: 'Não', as_vezes: 'Às vezes' }

const cpf = (d: string) => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
const cep = (d: string) => d.replace(/^(\d{5})(\d{3})$/, '$1-$2')
const com = (base: string, extra: string) => (extra ? `${base} · ${extra}` : base)

export default function InscricaoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { inscricao: i, carregando, erro, recarregar } = useInscricao(id)
  const { administraSecretaria } = usePerfil()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  // voltar do cadastro (salvo) mostra a inscricao ja como cadastrada
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  if (carregando || !i) {
    return (
      <TelaForm titulo="Inscrição" subtitulo={erro ? 'Não abriu' : 'Abrindo…'}>
        {erro ? (
          <Aviso tom="ambar" titulo={erro} texto="Toque para tentar de novo" onPress={recarregar} />
        ) : (
          <ActivityIndicator color={color.primaryCh} />
        )}
      </TelaForm>
    )
  }

  const d: FichaInscricao = i.dados
  const primeiro = i.criancaNome.split(' ')[0]

  const abrir = async (caminho: string) => {
    setFalha(null)
    try {
      await Linking.openURL(await urlDoArquivo(caminho))
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.')
    }
  }

  const cadastrar = async () => {
    setFalha(null)
    setOcupado('cadastrar')
    try {
      await prepararCadastro(i)
      router.push({ pathname: '/secretaria/participantes/cadastrar', params: { inscricao: i.id } })
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível preparar o cadastro.')
    } finally {
      setOcupado(null)
    }
  }

  const recusar = async () => {
    const certeza = await pedirConfirmacao({
      titulo: `Recusar a inscrição de ${primeiro}?`,
      texto:
        'Ela sai das novas e fica em "Recusadas", com a ficha e os documentos guardados. A criança não entra na ADAM. Avise a família pelo telefone da ficha.',
      confirmar: 'Recusar inscrição',
      perigo: true,
    })
    if (!certeza) return
    setOcupado('recusar')
    try {
      await recusarInscricao(i.id)
      mostrarRecado('Inscrição recusada')
      voltar('/secretaria/inscricoes')
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível recusar.')
      setOcupado(null)
    }
  }

  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: `Excluir a inscrição de ${primeiro}?`,
      texto:
        'Some a inscrição, a ficha assinada e os documentos enviados. Se a criança já foi cadastrada, a ficha dela continua. Não dá para desfazer.',
      confirmar: 'Excluir inscrição',
      perigo: true,
    })
    if (!certeza) return
    setOcupado('excluir')
    try {
      await excluirInscricao(i)
      mostrarRecado('Inscrição excluída')
      voltar('/secretaria/inscricoes')
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível excluir.')
      setOcupado(null)
    }
  }

  const rodape =
    i.status === 'pendente' ? (
      <Botao
        rotulo={ocupado === 'cadastrar' ? 'Preparando…' : 'Cadastrar criança'}
        desabilitado={!!ocupado}
        onPress={cadastrar}
      />
    ) : i.status === 'aprovada' && i.criancaId ? (
      <Botao
        rotulo="Abrir ficha da criança"
        onPress={() => router.push(`/secretaria/participantes/${i.criancaId}`)}
      />
    ) : undefined

  const arquivos = Object.entries(i.arquivos).filter(([campo]) => NOMES_DOS_ARQUIVOS[campo])

  return (
    <TelaForm
      titulo={i.criancaNome}
      subtitulo={`Enviada em ${paraBR(i.criadoEm.slice(0, 10))} · código ${i.codigo}`}
      rodape={rodape}>
      {falha ? (
        <Bloco>
          <Aviso tom="ambar" titulo={falha} />
        </Bloco>
      ) : null}
      {i.status !== 'pendente' ? (
        <Bloco>
          <Aviso
            tom={i.status === 'aprovada' ? 'roxo' : 'ambar'}
            titulo={
              i.status === 'aprovada'
                ? `Cadastrada${i.decididoEm ? ` em ${paraBR(i.decididoEm.slice(0, 10))}` : ''}`
                : `Recusada${i.decididoEm ? ` em ${paraBR(i.decididoEm.slice(0, 10))}` : ''}`
            }
          />
        </Bloco>
      ) : null}

      <Bloco ordem={1}>
        <Rotulo>Assinatura</Rotulo>
        <Grupo>
          <Linha
            titulo={i.assinaturaTipo === 'govbr' ? 'Assinada no gov.br' : 'Assinada na tela'}
            legenda={
              i.assinaturaTipo === 'govbr'
                ? i.assinaturaReconhecida
                  ? 'Certificado do gov.br / ICP-Brasil reconhecido'
                  : 'Assinatura digital sem certificado do gov.br reconhecido: confira no ITI'
                : 'Com o dedo, com data, hora e registro do envio'
            }
            legendaTom={
              i.assinaturaTipo === 'govbr' && !i.assinaturaReconhecida ? 'ambar' : undefined
            }
            semSeta
          />
          <Linha titulo="Ver ficha assinada (PDF)" onPress={() => abrir(i.fichaPath)} />
          {i.assinaturaTipo === 'govbr' ? (
            <Linha
              titulo="Validar a assinatura no ITI"
              legenda="Baixe a ficha e envie em validar.iti.gov.br"
              onPress={() => Linking.openURL('https://validar.iti.gov.br')}
            />
          ) : null}
        </Grupo>
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Criança</Rotulo>
        <Grupo>
          <LinhaValor
            rotulo="Nascimento"
            valor={`${paraBR(i.nascimento)} · ${idadeDe(i.nascimento)} anos`}
          />
          <LinhaValor rotulo="Unidade" valor={i.unidade || '—'} />
          <Linha
            titulo="Endereço"
            legenda={[d.crianca.endereco, d.crianca.bairro, d.crianca.cidade, cep(d.crianca.cep)]
              .filter(Boolean)
              .join(' · ')}
            semSeta
          />
          <Linha
            titulo="Escola"
            legenda={[d.crianca.escola, TURNOS[d.crianca.turno], d.crianca.serie]
              .filter(Boolean)
              .join(' · ')}
            semSeta
          />
          <LinhaValor
            rotulo="Treinos"
            valor={
              [
                d.crianca.aulasPorSemana && `${d.crianca.aulasPorSemana}x por semana`,
                d.crianca.dias,
              ]
                .filter(Boolean)
                .join(' · ') || '—'
            }
          />
        </Grupo>
      </Bloco>

      <Bloco ordem={3}>
        <Rotulo>Responsáveis</Rotulo>
        <Grupo>
          {d.responsaveis.map((r, n) => (
            <Linha
              key={n}
              titulo={r.nome}
              legenda={`Responsável ${n + 1} · ${mascaraTelefone(r.telefone)}${r.whatsapp ? ' · WhatsApp' : ''}`}
              selo={{ rotulo: r.parentesco.toLowerCase() }}
              semSeta
            />
          ))}
          <Linha
            titulo="Em caso de urgência"
            legenda={`${d.familia.urgenciaNome} · ${mascaraTelefone(d.familia.urgenciaTelefone)}`}
            semSeta
          />
          {d.familia.telResidencial ? (
            <LinhaValor
              rotulo="Telefone residencial"
              valor={mascaraTelefone(d.familia.telResidencial)}
            />
          ) : null}
        </Grupo>
      </Bloco>

      <Bloco ordem={4}>
        <Rotulo>Família</Rotulo>
        <Grupo>
          <LinhaValor rotulo="Mãe" valor={d.familia.nomeMae || '—'} />
          <LinhaValor rotulo="Pai" valor={d.familia.nomePai || '—'} />
          <LinhaValor
            rotulo="Mora com"
            valor={com(MORA_COM[d.familia.moraCom] ?? '—', d.familia.moraComQuem)}
          />
          <LinhaValor
            rotulo="Irmãos"
            valor={com(SIM_NAO[d.familia.irmaos] ?? '—', d.familia.irmaosQuantos)}
          />
          <LinhaValor
            rotulo="Igreja"
            valor={com(SIM_NAO[d.familia.igreja] ?? '—', d.familia.igrejaQual)}
          />
          <LinhaValor
            rotulo="CRAS"
            valor={com(SIM_NAO[d.familia.cras] ?? '—', d.familia.crasUnidade)}
          />
        </Grupo>
      </Bloco>

      <Bloco ordem={5}>
        <Rotulo>Saúde</Rotulo>
        <Grupo>
          <Linha
            titulo={d.saude.problemas === 'sim' ? 'Tem problema de saúde' : 'Sem problema de saúde'}
            legenda={d.saude.problemas === 'sim' ? d.saude.descricao : undefined}
            legendaTom={d.saude.problemas === 'sim' ? 'ambar' : undefined}
            semSeta
          />
          <LinhaValor rotulo="Alergias" valor={d.saude.alergias || 'Nenhuma informada'} />
          <LinhaValor
            rotulo="Peso · altura"
            valor={
              [d.saude.peso && `${d.saude.peso} kg`, d.saude.altura && `${d.saude.altura} m`]
                .filter(Boolean)
                .join(' · ') || '—'
            }
          />
          <LinhaValor rotulo="Tipo sanguíneo" valor={d.saude.tipoSanguineo || 'Não sabe'} />
          <LinhaValor rotulo="Chuteira" valor={d.saude.chuteira || '—'} />
          <LinhaValor
            rotulo="Convênio"
            valor={com(SIM_NAO[d.saude.convenio] ?? '—', d.saude.convenioQual)}
          />
          {d.saude.observacoes ? (
            <Linha titulo="Observações" legenda={d.saude.observacoes} semSeta />
          ) : null}
        </Grupo>
      </Bloco>

      <Bloco ordem={6}>
        <Rotulo>Quem assinou</Rotulo>
        <Grupo>
          <Linha
            titulo={d.declarante.nome}
            legenda={`${VINCULO[d.declarante.vinculo]} · CPF ${cpf(d.declarante.cpf)} · RG ${d.declarante.rg}${d.declarante.rgOrgao ? ` (${d.declarante.rgOrgao})` : ''}`}
            semSeta
          />
          <LinhaValor
            rotulo="Uso de imagem"
            valor={d.declarante.autorizaImagem ? 'Autoriza' : 'Não autoriza'}
          />
        </Grupo>
      </Bloco>

      <Bloco ordem={7}>
        <Rotulo>Documentos enviados</Rotulo>
        {arquivos.length ? (
          <Grupo>
            {arquivos.map(([campo, caminho]) => (
              <Linha
                key={campo}
                titulo={NOMES_DOS_ARQUIVOS[campo]}
                onPress={() => abrir(caminho)}
              />
            ))}
          </Grupo>
        ) : (
          <Text style={st.nada}>Nenhum. A família entrega na ADAM.</Text>
        )}
      </Bloco>

      {i.status === 'pendente' || administraSecretaria ? (
        <Bloco ordem={8}>
          <Grupo>
            {i.status === 'pendente' ? (
              <Linha
                titulo={ocupado === 'recusar' ? 'Recusando…' : 'Recusar inscrição'}
                legenda="A criança não entra; a ficha fica guardada"
                perigo
                onPress={ocupado ? undefined : recusar}
              />
            ) : null}
            {administraSecretaria ? (
              <Linha
                titulo={ocupado === 'excluir' ? 'Excluindo…' : 'Excluir inscrição'}
                legenda="Apaga a inscrição e os arquivos enviados"
                perigo
                onPress={ocupado ? undefined : excluir}
              />
            ) : null}
          </Grupo>
        </Bloco>
      ) : null}
      <View style={st.fim} />
    </TelaForm>
  )
}

const st = StyleSheet.create({
  nada: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  fim: { height: space.base },
})
