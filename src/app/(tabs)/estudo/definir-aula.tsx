import * as DocumentPicker from 'expo-document-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { Chip } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import {
  Aviso,
  Bloco,
  Botao,
  Calendario,
  Entrada,
  Grupo,
  Linha,
  LinhaValor,
  Opcao,
  Rotulo,
  TelaForm,
} from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { rotuloLongo } from '@/data/calendario'
import { HORARIO, NOME_TURMA, TURMAS, useUnidades, type Turma } from '@/data/chamada'
import {
  carregarAulas,
  excluirAula,
  proximoSabado,
  salvarAula,
  useAulas,
  type ArquivoNovo,
  type Aula,
  type Material,
  type ProgressoAula,
} from '@/data/estudo'
import { deISO, hojeISO, paraISO } from '@/data/metricas'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, space } from '@/theme/tokens'

/**
 * Tela 13d. Marca uma aula nova ou completa uma marcada. Aula sem professor
 * ou sem historia e estado valido e visivel (R7) — aqui e onde ela deixa de
 * ser pendencia.
 */
export default function DefinirAula() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { aulas, carregando } = useAulas()
  const aula = id ? aulas.find((a) => a.id === id) : undefined

  // a aula existente vem do banco antes de o formulario nascer
  if (id && !aula) {
    return (
      <TelaForm
        titulo={carregando ? 'Abrindo a aula…' : 'Aula não encontrada'}
        subtitulo="Devocional"
        voltarPara="/estudo">
        {carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </TelaForm>
    )
  }
  return <Formulario key={aula?.id ?? 'nova'} aula={aula} />
}

/** "08h" -> "08:00" */
const horaDaTurma = (turma: Turma) => `${HORARIO[turma].slice(0, 2)}:00`

/** Coloca os dois pontos sozinho: "0830" vira "08:30". */
function mascaraHora(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}
const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)

function Formulario({ aula }: { aula?: Aula }) {
  const { professores } = useAulas()
  const unidades = useUnidades()

  const [data, setData] = useState(aula?.data ?? proximoSabado())
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [mes, setMes] = useState(() => {
    const d = deISO(aula?.data ?? proximoSabado())
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })
  const [unidadeId, setUnidadeId] = useState<string | null>(aula?.unidadeId ?? null)
  const [turma, setTurma] = useState<Turma>(aula?.turma ?? 'pequenos')
  const [hora, setHora] = useState(aula?.hora ?? horaDaTurma('pequenos'))
  const [professorId, setProfessorId] = useState<string | null>(aula?.professorId ?? null)
  const [escolhendo, setEscolhendo] = useState(false)
  const [historia, setHistoria] = useState(aula?.historia ?? '')
  const [levar, setLevar] = useState((aula?.levar ?? []).join('\n'))
  const [material, setMaterial] = useState<Material[]>(aula?.material ?? [])
  const [novos, setNovos] = useState<ArquivoNovo[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { administraEstudo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  // o que uma tentativa que falhou ja gravou: a proxima continua dali
  const progresso = useRef<ProgressoAula>({ enviados: {} })

  // a unidade padrao e a primeira, enquanto ninguem escolheu
  const unidade = unidadeId ?? unidades.dados[0]?.id ?? null
  const professor = professores.find((p) => p.id === professorId)
  const passou = data < hojeISO()

  const anexar = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] })
    const arquivo = r.assets?.[0]
    if (!arquivo) return
    const tamanho = arquivo.size
      ? `${(arquivo.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
      : undefined
    setNovos((atual) => [
      ...atual,
      { nome: arquivo.name, uri: arquivo.uri, tipo: arquivo.mimeType, tamanho },
    ])
  }

  const salvar = async () => {
    if (!unidade) return
    setErro(null)
    setSalvando(true)
    try {
      await salvarAula({
        id: aula?.id,
        data,
        hora,
        unidadeId: unidade,
        turma,
        professorId,
        historia,
        levar: levar
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        material,
        materialAntes: aula?.material ?? [],
        novos,
        progresso: progresso.current,
      })
      mostrarRecado(aula ? 'Aula salva' : 'Aula marcada')
      voltar('/estudo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a aula.')
    } finally {
      setSalvando(false)
    }
  }

  // aula sem professor abre direto aqui (nao na 13b): o excluir mora nas duas
  const excluir = async (marcada: Aula) => {
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir esta aula?',
      texto: `A aula dos ${NOME_TURMA[marcada.turma]} de ${rotuloLongo(deISO(marcada.data))} sai da escala${marcada.material.length ? ' e o material anexado é apagado' : ''}. Não dá para desfazer.`,
      confirmar: 'Excluir aula',
      perigo: true,
    })
    if (!certeza) return
    setErro(null)
    setExcluindo(true)
    try {
      await excluirAula(marcada)
      mostrarRecado('Aula excluída')
      // a 13b desta aula (se veio dela) nao existe mais: volta ao Estudo
      router.dismissTo({ pathname: '/estudo', params: { aba: 'Devocional' } })
      carregarAulas()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a aula.')
      setExcluindo(false)
    }
  }

  return (
    <TelaForm
      titulo={aula ? 'Definir aula' : 'Marcar aula'}
      subtitulo={`Aula dos ${NOME_TURMA[turma]} · ${rotuloLongo(deISO(data))}`}
      voltarPara="/estudo"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : aula ? 'Salvar aula' : 'Marcar aula'}
          desabilitado={!unidade || !horaValida(hora) || passou || salvando}
          onPress={salvar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Grupo>
          <LinhaValor
            rotulo="Data"
            valor={rotuloLongo(deISO(data))}
            onPress={() => setCalendarioAberto((v) => !v)}
          />
        </Grupo>
        {calendarioAberto ? (
          <Calendario
            ano={mes.ano}
            mes={mes.mes}
            selecionado={
              deISO(data).getFullYear() === mes.ano && deISO(data).getMonth() === mes.mes
                ? deISO(data).getDate()
                : undefined
            }
            onEscolher={(dia) => {
              setData(paraISO(new Date(mes.ano, mes.mes, dia)))
              setCalendarioAberto(false)
            }}
            onMudarMes={(d) => {
              const novo = new Date(mes.ano, mes.mes + d, 1)
              setMes({ ano: novo.getFullYear(), mes: novo.getMonth() })
            }}
          />
        ) : null}
        {passou ? <Aviso tom="ambar" titulo="Escolha hoje ou um dia que ainda vem" /> : null}
      </Bloco>

      <Bloco ordem={1}>
        {unidades.dados.length > 1 ? (
          <>
            <Rotulo>Unidade</Rotulo>
            <View style={st.chips}>
              {unidades.dados.map((u) => (
                <Chip
                  key={u.id}
                  rotulo={u.nome}
                  ativo={unidade === u.id}
                  onPress={() => setUnidadeId(u.id)}
                />
              ))}
            </View>
          </>
        ) : null}
        <Rotulo>Turma</Rotulo>
        <View style={st.chips}>
          {TURMAS.map((t) => (
            <Chip
              key={t}
              rotulo={NOME_TURMA[t]}
              ativo={turma === t}
              onPress={() => {
                // o horario acompanha a turma enquanto ninguem mexeu nele
                if (hora === horaDaTurma(turma)) setHora(horaDaTurma(t))
                setTurma(t)
              }}
            />
          ))}
        </View>
        <Entrada
          rotulo="Horário"
          value={hora}
          onChangeText={(t) => setHora(mascaraHora(t))}
          placeholder="08:00"
          keyboardType="number-pad"
          maxLength={5}
        />
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo>Professor responsável</Rotulo>
        <Grupo>
          {escolhendo
            ? [
                ...professores.map((p) => (
                  <Opcao
                    key={p.id}
                    titulo={p.nome}
                    iniciais={p.iniciais}
                    ativa={professorId === p.id}
                    onPress={() => {
                      setProfessorId(p.id)
                      setEscolhendo(false)
                    }}
                  />
                )),
                <Opcao
                  key="definir"
                  titulo="A definir"
                  legenda="A aula fica marcada como pendência"
                  ativa={professorId === null}
                  onPress={() => {
                    setProfessorId(null)
                    setEscolhendo(false)
                  }}
                />,
              ]
            : [
                <Linha
                  key="atual"
                  titulo={professor?.nome ?? 'a definir'}
                  legenda={
                    professores.length
                      ? 'Quem dá a aula neste dia'
                      : 'Nenhum professor com acesso ao app ainda'
                  }
                  legendaTom={professores.length ? undefined : 'ambar'}
                  onPress={() => setEscolhendo(true)}
                />,
              ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={3}>
        <Entrada
          rotulo="História do devocional"
          value={historia}
          onChangeText={setHistoria}
          placeholder="Ex.: Davi e Golias"
        />
        <Entrada
          rotulo="O que levar"
          value={levar}
          onChangeText={setLevar}
          placeholder={'Um item por linha\nEx.: Bíblia\nLápis de cor'}
          multiline
        />
      </Bloco>

      <Bloco ordem={4}>
        <Rotulo>Material de apoio</Rotulo>
        <Grupo>
          {[
            ...material.map((m) => (
              <Linha
                key={m.path}
                titulo={m.nome}
                legenda={m.tamanho ?? 'no banco'}
                esquerda={<Icone nome="documento" cor={color.primaryCh} />}
                direita={
                  <Remover
                    nome={m.nome}
                    onPress={() => setMaterial((l) => l.filter((x) => x.path !== m.path))}
                  />
                }
                semSeta
              />
            )),
            ...novos.map((m) => (
              <Linha
                key={m.uri}
                titulo={m.nome}
                legenda={`${m.tamanho ? `${m.tamanho} · ` : ''}sobe ao salvar`}
                esquerda={<Icone nome="documento" cor={color.primaryCh} />}
                direita={
                  <Remover
                    nome={m.nome}
                    onPress={() => setNovos((l) => l.filter((x) => x.uri !== m.uri))}
                  />
                }
                semSeta
              />
            )),
            <Linha
              key="anexar"
              titulo="Anexar arquivo"
              legenda="PDF ou foto"
              esquerda={<Icone nome="mais" cor={color.primaryCh} />}
              onPress={anexar}
            />,
          ]}
        </Grupo>
      </Bloco>

      {/* so a coordenacao do Estudo ve (e o banco so deixa ela) */}
      {aula && administraEstudo ? (
        <Bloco ordem={5} style={{ marginTop: space.lg }}>
          <Botao
            rotulo={excluindo ? 'Excluindo…' : 'Excluir aula'}
            variante="perigo"
            desabilitado={excluindo || salvando}
            onPress={() => excluir(aula)}
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

function Remover({ nome, onPress }: { nome: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.md}
      accessibilityRole="button"
      accessibilityLabel={`Tirar ${nome}`}>
      <Icone nome="fechar" cor={color.muted} />
    </Pressable>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
