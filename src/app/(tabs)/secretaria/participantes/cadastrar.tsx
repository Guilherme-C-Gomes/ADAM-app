import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { Avatar, Chip } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Icone } from '@/components/ui/icone'
import { Pressionavel } from '@/components/ui/movimento'
import {
  Aviso,
  Bloco,
  Botao,
  Entrada,
  Grupo,
  Linha,
  Rotulo,
  Selo,
  TelaForm,
} from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { useUnidades } from '@/data/chamada'
import { turmaDaIdade } from '@/data/estudo'
import {
  abrirFicha,
  desativarFicha,
  DOCUMENTOS,
  idadeDe,
  MOTIVO_DESATIVADA,
  novaFicha,
  paraBR,
  paraISO,
  reativarFicha,
  salvarFicha,
  useFotoFicha,
  useSituacaoFicha,
} from '@/data/fichas'
import { iniciaisDe } from '@/data/jogo'
import { usePerfil } from '@/data/perfis'
import { rascunhoFicha } from '@/data/rascunhos'
import { color, radius, space, type } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Telas 17 (cadastrar) e 17b (editar ficha): o mesmo formulario, gravando
 * no banco (data/fichas.ts). As telas de foto, responsaveis, documentos e
 * funcao em campo mexem no rascunho; tudo sobe junto no "Salvar ficha".
 *
 * R1: a turma nao se escolhe, sai da idade — por isso aparece como
 * chip calculado, com a regra escrita do lado.
 */
export default function FichaDaCrianca() {
  // `inscricao`: veio de uma inscricao pelo link, ja posta no rascunho por
  // prepararCadastro (data/inscricoes.ts) — nao comecar do zero
  const { id, inscricao } = useLocalSearchParams<{ id?: string; inscricao?: string }>()
  const ficha = rascunhoFicha.useValor()
  const unidades = useUnidades()
  const fotoGuardada = useFotoFicha(ficha.fotoPath)
  const [abrindo, setAbrindo] = useState(!!id)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // a ficha nao abriu inteira: o formulario NAO aparece (salvar um
  // rascunho pela metade apagaria responsaveis e documentos)
  const [erroAoAbrir, setErroAoAbrir] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  // desativar e reativar: quem edita a ficha (RLS de update em `criancas`:
  // ADM e Secretaria)
  const { perfil, administraSecretaria } = usePerfil()
  const editaFicha = administraSecretaria || perfil === 'secretaria'

  // Ao entrar: ficha existente vem do banco; ficha nova comeca vazia. Voltar
  // das telas de foto e responsaveis nao passa por aqui de novo.
  useEffect(() => {
    let ativo = true
    if (!id) {
      if (!inscricao || rascunhoFicha.ler().inscricaoId !== inscricao) novaFicha()
      return
    }
    abrirFicha(id).then(
      () => {
        if (ativo) setAbrindo(false)
      },
      (e: unknown) => {
        if (ativo) {
          setAbrindo(false)
          setErroAoAbrir(e instanceof Error ? e.message : 'Não foi possível abrir a ficha.')
        }
      },
    )
    return () => {
      ativo = false
    }
  }, [id, inscricao, tentativa])

  const tentarDeNovo = () => {
    setErroAoAbrir(null)
    setAbrindo(true)
    setTentativa((t) => t + 1)
  }

  // a unidade padrao e a primeira, enquanto ninguem escolheu
  const unidadeId = ficha.unidadeId ?? unidades.dados[0]?.id ?? null
  const nascimentoISO = paraISO(ficha.nascimento)
  const idade = nascimentoISO ? idadeDe(nascimentoISO) : null
  const turma = idade === null || idade < 0 ? null : turmaDaIdade(idade)
  const entregues = ficha.documentos.length
  const iniciais = iniciaisDe(ficha.nome || 'AD')
  const foto = ficha.fotoUri ?? fotoGuardada

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      if (!ficha.unidadeId && unidadeId) rascunhoFicha.definir({ unidadeId })
      await salvarFicha()
      novaFicha()
      voltar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a ficha.')
    } finally {
      setSalvando(false)
    }
  }

  if (abrindo) {
    return (
      <TelaForm titulo="Editar ficha" subtitulo="Abrindo…">
        <ActivityIndicator color={color.primaryCh} />
      </TelaForm>
    )
  }

  if (erroAoAbrir) {
    return (
      <TelaForm titulo="Editar ficha" subtitulo="A ficha não abriu">
        <Bloco>
          <Aviso
            tom="ambar"
            titulo={erroAoAbrir}
            texto="Nada foi alterado. Toque para tentar de novo"
            onPress={tentarDeNovo}
          />
        </Bloco>
      </TelaForm>
    )
  }

  return (
    <TelaForm
      titulo={ficha.id ? 'Editar ficha' : 'Cadastrar criança'}
      subtitulo={
        ficha.id
          ? ficha.nome
          : ficha.inscricaoId
            ? 'Veio pelo link: confira e salve'
            : 'A ficha leva 2 minutos'
      }
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : ficha.id ? 'Salvar alterações' : 'Salvar ficha'}
          desabilitado={!ficha.nome.trim() || !nascimentoISO || !unidadeId || salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Pressionavel
          onPress={() => router.push('/secretaria/participantes/foto')}
          escala={0.98}
          style={st.foto}
          accessibilityRole="button"
          accessibilityLabel="Foto da criança">
          {foto ? (
            <Image source={{ uri: foto }} style={st.miniatura} contentFit="cover" />
          ) : (
            <Avatar iniciais={iniciais} size={44} />
          )}
          <View style={st.texto}>
            <Text style={st.titulo}>Foto da criança</Text>
            <Text style={st.legenda}>
              {foto ? 'Toque para trocar' : 'Toque para tirar ou escolher'}
            </Text>
          </View>
          <Icone nome="seta" cor={color.faint} />
        </Pressionavel>
      </Bloco>

      <Bloco ordem={1}>
        <Entrada
          rotulo="Nome completo"
          value={ficha.nome}
          onChangeText={(nome) => rascunhoFicha.definir({ nome })}
          placeholder="Nome da criança"
          autoComplete="off"
          textContentType="none"
        />
      </Bloco>

      <Bloco ordem={2} style={st.dupla}>
        <View style={st.metade}>
          <Entrada
            rotulo="Nascimento"
            value={ficha.nascimento}
            onChangeText={(nascimento) =>
              rascunhoFicha.definir({ nascimento: mascaraData(nascimento) })
            }
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        <View style={st.metade}>
          <Rotulo>Unidade</Rotulo>
          <View style={st.chips}>
            {unidades.dados.map((u) => (
              <Chip
                key={u.id}
                rotulo={u.nome}
                ativo={unidadeId === u.id}
                onPress={() => rascunhoFicha.definir({ unidadeId: u.id })}
              />
            ))}
            {!unidades.carregando && !unidades.dados.length ? (
              <Text style={st.legenda}>
                {unidades.erro ?? 'Nenhuma unidade no banco. O ADM cadastra em Ajustes.'}
              </Text>
            ) : null}
          </View>
        </View>
      </Bloco>

      <Bloco ordem={3}>
        <Rotulo>Turma</Rotulo>
        <View style={st.turma}>
          <Selo rotulo={turma ?? 'a definir'} tom={turma ? 'roxo' : 'ambar'} />
          <Text style={st.legenda}>
            {idade === null
              ? 'A turma sai da data de nascimento'
              : `${idade} anos · 12 ou mais vai para os Maiores`}
          </Text>
        </View>
      </Bloco>

      <Bloco ordem={4}>
        <Grupo>
          <Linha
            titulo="Função em campo"
            legenda="Opcional. Filtra a convocação"
            selo={{ rotulo: ficha.funcao ?? 'sem posição', tom: ficha.funcao ? 'roxo' : 'neutro' }}
            onPress={() => router.push('/secretaria/participantes/funcao-campo')}
          />
          <Linha
            titulo="Responsáveis"
            legenda="Quem a coordenação procura"
            selo={{
              rotulo: `${ficha.contatos.length} de 2`,
              tom: ficha.contatos.length ? 'roxo' : 'ambar',
            }}
            onPress={() => router.push('/secretaria/participantes/responsaveis')}
          />
          <Linha
            titulo="Documentos"
            legenda="O que a família precisa trazer"
            selo={{
              rotulo: `${entregues} de ${DOCUMENTOS.length}`,
              tom: entregues === DOCUMENTOS.length ? 'verde' : 'ambar',
            }}
            onPress={() => router.push('/secretaria/participantes/documentos')}
          />
        </Grupo>
      </Bloco>

      <Bloco ordem={5}>
        <Entrada
          rotulo="Observações da equipe"
          value={ficha.observacao}
          onChangeText={(observacao) => rascunhoFicha.definir({ observacao })}
          placeholder="Opcional. O que a equipe precisa saber"
          multiline
        />
      </Bloco>

      {ficha.id && editaFicha ? (
        <Bloco ordem={6}>
          <Situacao id={ficha.id} nome={ficha.nome} />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

/**
 * Desativar / reativar a crianca. E a mesma saida do perfil (ativa = false,
 * saiu_em = hoje, com o motivo): ela some das listas, da chamada e da
 * convocacao e deixa de contar como ativa a partir de hoje. O historico fica.
 */
function Situacao({ id, nome }: { id: string; nome: string }) {
  const { situacao, carregando, recarregar } = useSituacaoFicha(id)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const primeiro = nome.trim().split(' ')[0] || 'a criança'

  if (carregando) return <ActivityIndicator color={color.primaryCh} />
  if (!situacao) {
    return (
      <Aviso
        tom="ambar"
        titulo="Não foi possível ler se a ficha está ativa"
        texto="Toque para tentar de novo"
        onPress={recarregar}
      />
    )
  }

  const executar = async (acao: () => Promise<void>, recado: string) => {
    setErro(null)
    setSalvando(true)
    try {
      await acao()
      mostrarRecado(recado)
      voltar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
      setSalvando(false)
    }
  }

  const desativar = async () => {
    const certeza = await pedirConfirmacao({
      titulo: `Desativar ${primeiro}?`,
      texto:
        'A criança sai das listas e da chamada e deixa de contar nas métricas a partir de hoje. O histórico fica, e dá para reativar.',
      confirmar: 'Desativar criança',
      perigo: true,
    })
    if (certeza) executar(() => desativarFicha(id, motivo), 'Criança desativada')
  }

  if (!situacao.ativa) {
    return (
      <>
        <Rotulo>Situação</Rotulo>
        <Aviso
          tom="ambar"
          titulo={situacao.saiuEm ? `Desativada desde ${paraBR(situacao.saiuEm)}` : 'Ficha inativa'}
          texto={situacao.motivo ?? 'Sem motivo anotado.'}
        />
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}
        <Botao
          rotulo={salvando ? 'Reativando…' : 'Reativar criança'}
          variante="secundario"
          desabilitado={salvando}
          onPress={() => executar(() => reativarFicha(id), 'Criança reativada')}
        />
      </>
    )
  }

  return (
    <>
      <Rotulo>Situação</Rotulo>
      <Entrada
        rotulo="Motivo para desativar (opcional)"
        value={motivo}
        onChangeText={setMotivo}
        placeholder={MOTIVO_DESATIVADA}
      />
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}
      <Botao
        rotulo={salvando ? 'Desativando…' : 'Desativar criança'}
        variante="perigo"
        desabilitado={salvando}
        onPress={desativar}
      />
    </>
  )
}

/** Coloca as barras sozinho: "05092014" vira "05/09/2014". */
function mascaraData(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

const st = StyleSheet.create({
  foto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  miniatura: { width: 44, height: 44, borderRadius: 22 },
  texto: { flex: 1, gap: 2 },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted, flex: 1 },
  dupla: { flexDirection: 'row', gap: space.md },
  metade: { flex: 1, gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
  turma: { flexDirection: 'row', alignItems: 'center', gap: space.md },
})
