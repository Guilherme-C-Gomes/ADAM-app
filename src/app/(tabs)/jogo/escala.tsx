import { Redirect, router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Avatar, Chip } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Bloco, Botao, Entrada, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { Icone } from '@/components/ui/icone'
import { mostrarRecado } from '@/components/ui/recado'
import { DIAS_CURTOS } from '@/data/calendario'
import { HORARIO, NOME_TURMA, TURMAS, useUnidades, type Turma } from '@/data/chamada'
import {
  adicionarHorario,
  horaCurta,
  nomeNaEquipe,
  removerHorario,
  useJogo,
} from '@/data/jogo-dados'
import { usePerfil } from '@/data/perfis'
import { color, space } from '@/theme/tokens'

/**
 * Editar escala: os horarios de treino da semana e quem cobre cada um.
 * Cada horario abre a tela 11l para escolher o tecnico.
 *
 * R7: "a definir" e estado valido — aparece em ambar e some da lista de
 * pendencias quando alguem assume.
 */
const DIAS = [1, 2, 3, 4, 5, 6, 0]
const horaDaTurma = (t: Turma) => `${HORARIO[t].slice(0, 2)}:00`

function mascaraHora(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}
const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)

export default function EditarEscala() {
  const { escala, equipe } = useJogo()
  const unidades = useUnidades()
  // tirar horario e excluir: so quem administra o Jogo (o banco tambem recusa os outros)
  const { editaEscala, administraJogo } = usePerfil()

  const [dia, setDia] = useState(6)
  const [turma, setTurma] = useState<Turma>('pequenos')
  const [hora, setHora] = useState(horaDaTurma('pequenos'))
  const [unidadeId, setUnidadeId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // O treinador so ve a escala; um link perdido nao pode abrir a edicao.
  if (!editaEscala) return <Redirect href="/jogo" />

  const unidade = unidadeId ?? unidades.dados[0]?.id ?? null
  const varias = unidades.dados.length > 1
  const nomeUnidade = (id: string) => unidades.dados.find((u) => u.id === id)?.nome ?? ''
  const pendentes = escala.filter((l) => !l.tecnicoId).length

  const adicionar = async () => {
    if (!unidade) return
    setErro(null)
    setSalvando(true)
    try {
      await adicionarHorario({ unidadeId: unidade, diaSemana: dia, hora, turma })
      mostrarRecado('Horário adicionado')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.')
    } finally {
      setSalvando(false)
    }
  }

  const tirar = async (id: string, rotulo: string) => {
    const certeza = await pedirConfirmacao({
      titulo: `Tirar ${rotulo} da escala?`,
      texto: 'Os treinos já marcados nesse horário continuam. Só a escala da semana muda.',
      confirmar: 'Tirar horário',
      perigo: true,
    })
    if (!certeza) return
    setErro(null)
    try {
      await removerHorario(id)
      mostrarRecado('Horário retirado')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível tirar.')
    }
  }

  return (
    <TelaForm
      titulo="Editar escala"
      subtitulo={
        !escala.length
          ? 'Monte os horários de treino da semana'
          : pendentes
            ? `${pendentes} ${pendentes === 1 ? 'horário ainda sem técnico' : 'horários ainda sem técnico'}`
            : 'Todos os horários com técnico'
      }
      voltarPara="/jogo">
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      {escala.length ? (
        <Bloco>
          <Rotulo>Toda semana</Rotulo>
          <Grupo>
            {escala.map((l) => {
              const tecnico = nomeNaEquipe(equipe, l.tecnicoId)
              const rotulo = `${DIAS_CURTOS[l.diaSemana]} ${horaCurta(l.hora)}`
              return (
                <Linha
                  key={l.id}
                  titulo={`${rotulo} · ${tecnico ?? 'a definir'}`}
                  legenda={`${NOME_TURMA[l.turma]}${varias ? ` · ${nomeUnidade(l.unidadeId)}` : ''}`}
                  esquerda={
                    tecnico ? (
                      <Avatar
                        iniciais={equipe.find((p) => p.id === l.tecnicoId)?.iniciais ?? '?'}
                        size={30}
                      />
                    ) : undefined
                  }
                  selo={tecnico ? undefined : { rotulo: 'a definir', tom: 'ambar' }}
                  direita={
                    administraJogo ? (
                      <Pressable
                        onPress={() => tirar(l.id, rotulo)}
                        hitSlop={space.md}
                        accessibilityRole="button"
                        accessibilityLabel={`Tirar ${rotulo} da escala`}>
                        <Icone nome="lixeira" cor={color.muted} />
                      </Pressable>
                    ) : undefined
                  }
                  onPress={() =>
                    router.push({ pathname: '/jogo/treinador', params: { linha: l.id } })
                  }
                />
              )
            })}
          </Grupo>
        </Bloco>
      ) : null}

      <Bloco ordem={1}>
        <Rotulo>Novo horário</Rotulo>
        {varias ? (
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
        ) : null}
        <View style={st.chips}>
          {DIAS.map((d) => (
            <Chip key={d} rotulo={DIAS_CURTOS[d]} ativo={dia === d} onPress={() => setDia(d)} />
          ))}
        </View>
        <View style={st.chips}>
          {TURMAS.map((t) => (
            <Chip
              key={t}
              rotulo={NOME_TURMA[t]}
              ativo={turma === t}
              onPress={() => {
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
        <Botao
          rotulo={salvando ? 'Adicionando…' : 'Adicionar à escala'}
          variante="secundario"
          desabilitado={!unidade || !horaValida(hora) || salvando}
          onPress={adicionar}
        />
      </Bloco>

      <Bloco ordem={2}>
        <Aviso
          titulo="Só quem é treinador aparece"
          texto="Para incluir alguém, cadastre em Configuração da ADAM › Usuários."
        />
      </Bloco>
    </TelaForm>
  )
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
})
