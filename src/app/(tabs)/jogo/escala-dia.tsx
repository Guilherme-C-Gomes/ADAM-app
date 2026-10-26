import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { horaFalada, lista, primeiroNome } from '@/components/escala/frase'
import { ChipPessoa, horaValida, SeletorHora } from '@/components/escala/pecas'
import { horaPadrao } from '@/components/escala/semana'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Bloco, Botao, Link, Rotulo, Selo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { rotuloCurto, rotuloLongo } from '@/data/calendario'
import { NOME_TURMA, TURMAS, useUnidades, type Turma } from '@/data/chamada'
import {
  abrirPlano,
  adicionarTreinoNaData,
  definirComissaoDoDia,
  definirTecnicoDoDia,
  excluirTreino,
  horariosDoDia,
  nomeNaEquipe,
  rascunhoTreino,
  useJogo,
  useTreinosDoMes,
  type HorarioDoDia,
  type PessoaEquipe,
  type Treino,
} from '@/data/jogo-dados'
import { deISO, hojeISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Um dia do calendario da escala: os treinos daquela data (os da escala da
 * semana e os marcados so nela). Para cada um, quem edita a escala escolhe
 * o tecnico SO DESTA DATA e as pessoas que vao junto; e da para marcar um
 * treino a mais nesta data. A escala da semana nao muda aqui.
 *
 * Horario fixo que ainda nao virou treino vira o treino do dia quando se
 * escolhe alguem (treinos + treino_comissao). Dia que ja passou so se ve.
 */
export default function EscalaDoDia() {
  const { data = hojeISO() } = useLocalSearchParams<{ data?: string }>()
  const d = deISO(data)
  const { escala, equipe, treinos } = useJogo()
  const doMes = useTreinosDoMes(d.getFullYear(), d.getMonth())
  const unidades = useUnidades()
  const { editaEscala } = usePerfil()
  const [erro, setErro] = useState<string | null>(null)

  const passou = data < hojeISO()
  const pode = editaEscala && !passou
  const horarios = horariosDoDia(data, escala, doMes.lista)
  const treinadores = equipe.filter((p) => p.funcao === 'treinador')
  const varias = unidades.dados.length > 1
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''
  const semTecnico = horarios.filter((h) => !h.responsavelId).length

  return (
    <TelaForm
      titulo={rotuloLongo(d)}
      subtitulo={
        passou
          ? 'Dia que já passou'
          : !horarios.length
            ? 'Nenhum treino nesta data'
            : semTecnico
              ? `${semTecnico} ${semTecnico === 1 ? 'treino sem técnico' : 'treinos sem técnico'}`
              : pode
                ? 'Técnico e pessoas de cada treino'
                : 'Quem está escalado'
      }
      voltarPara="/jogo">
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Rotulo extra={doMes.carregando ? undefined : `${horarios.length}`}>Treinos do dia</Rotulo>
        {doMes.carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : horarios.length ? (
          horarios.map((h) => (
            <CartaoTreino
              key={h.chave}
              horario={h}
              treinos={treinos}
              equipe={equipe}
              treinadores={treinadores}
              pode={pode}
              passou={passou}
              unidade={varias ? nomeUnidade(h.unidadeId) : null}
              onErro={setErro}
              recarregar={doMes.recarregar}
            />
          ))
        ) : (
          <Aviso
            titulo="Nenhum treino nesta data"
            texto={
              pode
                ? 'Nem treino marcado, nem horário da escala da semana. Adicione um treino logo abaixo.'
                : 'Nem treino marcado, nem horário da escala da semana.'
            }
          />
        )}
      </Bloco>

      {pode && !doMes.carregando ? (
        <NovoTreino
          data={data}
          horarios={horarios}
          treinadores={treinadores}
          unidades={unidades.dados}
          onErro={setErro}
          recarregar={doMes.recarregar}
        />
      ) : null}

      {pode && !treinadores.length ? (
        <Bloco ordem={2}>
          <Aviso
            tom="ambar"
            titulo="Ninguém com função de treinador"
            texto="Cadastre a equipe em Configuração da ADAM › Usuários."
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

/** Um treino da data: tecnico do dia, pessoas que vao e o plano. */
function CartaoTreino({
  horario: h,
  treinos,
  equipe,
  treinadores,
  pode,
  passou,
  unidade,
  onErro,
  recarregar,
}: {
  horario: HorarioDoDia
  treinos: Treino[]
  equipe: PessoaEquipe[]
  treinadores: PessoaEquipe[]
  pode: boolean
  passou: boolean
  unidade: string | null
  onErro: (e: string | null) => void
  recarregar: () => Promise<void>
}) {
  const { administraJogo } = usePerfil()
  const [pessoas, setPessoas] = useState<string[]>(h.comissao)
  const [salvando, setSalvando] = useState(false)

  const tecnico = nomeNaEquipe(equipe, h.responsavelId)
  const daSemana = nomeNaEquipe(equipe, h.tecnicoDaSemana)
  const trocadoNoDia = !!h.treinoId && h.daSemana && h.responsavelId !== h.tecnicoDaSemana
  const voluntarios = equipe.filter(
    (p) => (p.funcao === 'treinador' || p.funcao === 'professor') && p.id !== h.responsavelId,
  )
  const mudouPessoas =
    pessoas.length !== h.comissao.length || pessoas.some((p) => !h.comissao.includes(p))
  const quem = `${horaFalada(h.hora)} de ${rotuloCurto(deISO(h.data))}`

  const rodar = async (acao: () => Promise<void>, recado: string) => {
    onErro(null)
    setSalvando(true)
    try {
      await acao()
      await recarregar()
      mostrarRecado(recado)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const escolherTecnico = (id: string | null) => {
    if (salvando || id === h.responsavelId) return
    rodar(() => definirTecnicoDoDia(h, id), `${quem}: ${nomeNaEquipe(equipe, id) ?? 'sem técnico'}`)
  }

  const tirar = async () => {
    const certeza = await pedirConfirmacao({
      titulo: `Tirar o treino das ${horaFalada(h.hora)}?`,
      texto:
        'Ele foi marcado só nesta data. Sai junto a lista de exercícios, as pessoas e a avaliação.',
      confirmar: 'Tirar treino',
      perigo: true,
    })
    if (!certeza || !h.treinoId) return
    const id = h.treinoId
    rodar(() => excluirTreino(id), 'Treino retirado')
  }

  const pessoasDoTreino = h.comissao
    .map((id) => nomeNaEquipe(equipe, id))
    .filter((n): n is string => !!n)

  return (
    <View style={[st.cartao, !tecnico && st.cartaoAmbar]}>
      {!tecnico ? <View style={st.acentoAmbar} /> : null}
      <View style={st.topo}>
        <Text style={st.titulo}>
          {horaFalada(h.hora)} · {NOME_TURMA[h.turma]}
          {unidade ? ` · ${unidade}` : ''}
        </Text>
        <Selo
          rotulo={h.daSemana ? 'toda semana' : 'só nesta data'}
          tom={h.daSemana ? 'neutro' : 'roxo'}
        />
      </View>
      <Text style={[st.legenda, !tecnico && st.ambar]}>
        {tecnico ? `Técnico: ${tecnico}` : 'Ainda sem técnico'}
        {trocadoNoDia ? ` · só neste dia (na escala: ${daSemana ?? 'ninguém'})` : ''}
      </Text>

      {pode ? (
        <>
          <Text style={st.rotulo}>Técnico deste dia</Text>
          <View style={st.chips}>
            {treinadores.map((p) => (
              <ChipPessoa
                key={p.id}
                rotulo={primeiroNome(p.nome)}
                iniciais={p.iniciais}
                ativo={h.responsavelId === p.id}
                desabilitado={salvando}
                onPress={() => escolherTecnico(p.id)}
              />
            ))}
            <ChipPessoa
              rotulo="Ninguém ainda"
              tom="ambar"
              ativo={h.responsavelId === null}
              desabilitado={salvando}
              onPress={() => escolherTecnico(null)}
            />
          </View>

          <Text style={st.rotulo}>Quem vai junto</Text>
          {voluntarios.length ? (
            <View style={st.chips}>
              {voluntarios.map((p) => (
                <ChipPessoa
                  key={p.id}
                  rotulo={primeiroNome(p.nome)}
                  iniciais={p.iniciais}
                  ativo={pessoas.includes(p.id)}
                  desabilitado={salvando}
                  onPress={() =>
                    setPessoas((antes) =>
                      antes.includes(p.id) ? antes.filter((x) => x !== p.id) : [...antes, p.id],
                    )
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={st.legenda}>
              Ninguém mais com função de treinador ou professor para escalar.
            </Text>
          )}
          {mudouPessoas ? (
            <Botao
              rotulo={salvando ? 'Salvando…' : 'Salvar quem vai'}
              variante="secundario"
              desabilitado={salvando}
              onPress={() =>
                rodar(
                  () => definirComissaoDoDia(h, pessoas),
                  pessoas.length
                    ? `${quem}: ${pessoas.length} com o técnico`
                    : `${quem}: só o técnico`,
                )
              }
            />
          ) : null}
        </>
      ) : (
        <Text style={st.legenda}>
          {pessoasDoTreino.length
            ? `Vão junto: ${lista(pessoasDoTreino)}`
            : 'Ninguém mais escalado.'}
        </Text>
      )}

      {!passou ? (
        <View style={st.acoes}>
          <Link
            rotulo={h.treinoId ? 'Plano do treino (exercícios e local)' : 'Planejar este treino'}
            onPress={() => {
              const treino = h.treinoId ? treinos.find((t) => t.id === h.treinoId) : undefined
              if (treino) abrirPlano(treino)
              else {
                abrirPlano()
                rascunhoTreino.definir({
                  id: h.treinoId,
                  data: h.data,
                  hora: h.hora,
                  turma: h.turma,
                  unidadeId: h.unidadeId,
                  responsavelId: h.responsavelId,
                  comissao: h.comissao,
                })
              }
              router.push('/jogo/planejar')
            }}
          />
          {h.treinoId && !h.daSemana && administraJogo ? (
            <Link rotulo="Tirar este treino" onPress={tirar} />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/** "Adicionar treino nesta data": turma, horario e (se ja souber) o tecnico. */
function NovoTreino({
  data,
  horarios,
  treinadores,
  unidades,
  onErro,
  recarregar,
}: {
  data: string
  horarios: HorarioDoDia[]
  treinadores: PessoaEquipe[]
  unidades: { id: string; nome: string }[]
  onErro: (e: string | null) => void
  recarregar: () => Promise<void>
}) {
  const [aberto, setAberto] = useState(false)
  const [unidadeId, setUnidadeId] = useState<string | null>(null)
  const [turma, setTurma] = useState<Turma>('pequenos')
  const [hora, setHora] = useState(horaPadrao('pequenos'))
  const [tecnicoId, setTecnicoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const unidade = unidadeId ?? unidades[0]?.id ?? null
  const repetido = horarios.some(
    (h) => h.unidadeId === unidade && h.turma === turma && h.hora === hora,
  )

  const adicionar = async () => {
    if (!unidade) return
    onErro(null)
    setSalvando(true)
    try {
      await adicionarTreinoNaData({
        data,
        hora,
        unidadeId: unidade,
        turma,
        responsavelId: tecnicoId,
      })
      await recarregar()
      setAberto(false)
      mostrarRecado(`Treino de ${NOME_TURMA[turma]} às ${horaFalada(hora)} adicionado`)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não foi possível adicionar o treino.')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <Bloco ordem={1}>
        <Botao
          rotulo="Adicionar treino nesta data"
          variante="secundario"
          onPress={() => setAberto(true)}
        />
      </Bloco>
    )
  }

  return (
    <Bloco ordem={1}>
      <View style={st.cartao}>
        <Text style={st.titulo}>Treino a mais nesta data</Text>
        <Text style={st.legenda}>Só neste dia. A escala da semana não muda.</Text>

        {unidades.length > 1 ? (
          <>
            <Text style={st.rotulo}>Unidade</Text>
            <View style={st.chips}>
              {unidades.map((u) => (
                <ChipPessoa
                  key={u.id}
                  rotulo={u.nome}
                  ativo={unidade === u.id}
                  onPress={() => setUnidadeId(u.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={st.rotulo}>Turma</Text>
        <View style={st.chips}>
          {TURMAS.map((t) => (
            <ChipPessoa
              key={t}
              rotulo={NOME_TURMA[t]}
              ativo={turma === t}
              onPress={() => {
                if (hora === horaPadrao(turma)) setHora(horaPadrao(t))
                setTurma(t)
              }}
            />
          ))}
        </View>

        <Text style={st.rotulo}>Horário</Text>
        <SeletorHora hora={hora} onChange={setHora} />

        <Text style={st.rotulo}>Técnico</Text>
        <View style={st.chips}>
          {treinadores.map((p) => (
            <ChipPessoa
              key={p.id}
              rotulo={primeiroNome(p.nome)}
              iniciais={p.iniciais}
              ativo={tecnicoId === p.id}
              onPress={() => setTecnicoId(p.id)}
            />
          ))}
          <ChipPessoa
            rotulo="Ninguém ainda"
            tom="ambar"
            ativo={tecnicoId === null}
            onPress={() => setTecnicoId(null)}
          />
        </View>

        {repetido ? (
          <Text style={[st.legenda, st.ambar]}>Esse treino já está neste dia.</Text>
        ) : null}
        <Botao
          rotulo={
            salvando
              ? 'Adicionando…'
              : horaValida(hora)
                ? `Adicionar ${NOME_TURMA[turma]} às ${horaFalada(hora)}`
                : 'Escreva o horário'
          }
          desabilitado={!unidade || !horaValida(hora) || repetido || salvando}
          onPress={adicionar}
        />
        <Link rotulo="Cancelar" centro onPress={() => setAberto(false)} />
      </View>
    </Bloco>
  )
}

const st = StyleSheet.create({
  cartao: {
    padding: space.base,
    gap: space.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  cartaoAmbar: { borderColor: 'rgba(245, 165, 36, 0.45)' },
  acentoAmbar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.warn,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text, flexShrink: 1 },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  ambar: { color: color.warn },
  rotulo: {
    ...type.caption,
    fontFamily: 'Inter_600SemiBold',
    color: color.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: space.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm },
})
