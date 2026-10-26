import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Aviso, Bloco, SeletorPeriodo, TelaForm } from '@/components/ui/form'
import { entrada, NumeroAnimado } from '@/components/ui/movimento'
import { MESES, rotuloCurto } from '@/data/calendario'
import { NOME_TURMA } from '@/data/chamada'
import { LIMITE_COMPREENSAO } from '@/data/jogo'
import { lerAvaliacoesDoMes } from '@/data/jogo-dados'
import { deISO } from '@/data/metricas'
import { color, onDark, radius, space, type } from '@/theme/tokens'

/**
 * Telas 11s, 11s2 e 11s3. O que os treinadores deram ao encerrar cada
 * treino, mes a mes. A media fica no topo em roxo; so "entenderam" abaixo
 * de 3 ganha ambar (R9) — dificuldade alta nao e nota ruim. Nota vazia
 * (R8) nao entra na media.
 */
type Linha = Awaited<ReturnType<typeof lerAvaliacoesDoMes>>[number]

export default function Avaliacoes() {
  const hoje = new Date()
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  const chave = `${mes.ano}-${mes.mes}`
  const [estado, setEstado] = useState<{ linhas: Linha[]; erro: string | null; de: string }>({
    linhas: [],
    erro: null,
    de: '',
  })

  useEffect(() => {
    let ativo = true
    lerAvaliacoesDoMes(mes.ano, mes.mes).then(
      (linhas) => {
        if (ativo) setEstado({ linhas, erro: null, de: chave })
      },
      (e) => {
        if (ativo)
          setEstado({ linhas: [], erro: e instanceof Error ? e.message : 'Erro', de: chave })
      },
    )
    return () => {
      ativo = false
    }
  }, [mes.ano, mes.mes, chave])

  const carregando = estado.de !== chave
  const linhas = estado.linhas
  const media = (campo: 'treino' | 'entenderam' | 'dificuldade') => {
    const notas = linhas.map((l) => l[campo]).filter((n): n is number => n !== null)
    return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null
  }
  const ehAtual = mes.ano === hoje.getFullYear() && mes.mes === hoje.getMonth()
  const andar = (d: number) => {
    const novo = new Date(mes.ano, mes.mes + d, 1)
    setMes({ ano: novo.getFullYear(), mes: novo.getMonth() })
  }

  return (
    <TelaForm titulo="Avaliações" subtitulo="O que o treinador deu ao encerrar" voltarPara="/jogo">
      <SeletorPeriodo
        rotulo={`${MESES[mes.mes]} de ${mes.ano}`}
        onAnterior={() => andar(-1)}
        onProximo={() => {
          if (!ehAtual) andar(1)
        }}
      />

      {estado.erro && !carregando ? (
        <Bloco>
          <Aviso tom="ambar" titulo={estado.erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <View style={st.tabela}>
          <View style={st.cabecalho}>
            <Text style={[st.colQuando, st.titCol]}>QUANDO</Text>
            <Text style={[st.col, st.titCol]}>treino</Text>
            <Text style={[st.col, st.titCol]}>entenderam</Text>
            <Text style={[st.col, st.titCol]}>dificuldade</Text>
          </View>

          {carregando ? (
            <ActivityIndicator color={color.primaryCh} />
          ) : linhas.length ? (
            <>
              <Animated.View entering={entrada(0)} style={[st.linha, st.divisoria]}>
                <View style={st.colQuando}>
                  <Text style={st.quando}>Média</Text>
                  <View style={st.contagem}>
                    <NumeroAnimado valor={linhas.length} style={st.turma} />
                    <Text style={st.turma}>{linhas.length === 1 ? ' treino' : ' treinos'}</Text>
                  </View>
                </View>
                <Nota valor={media('treino')} media />
                <Nota valor={media('entenderam')} media />
                <Nota valor={media('dificuldade')} media />
              </Animated.View>

              {linhas.map((l, i) => (
                <Animated.View
                  key={l.id}
                  entering={entrada(i + 1)}
                  style={[st.linha, i < linhas.length - 1 && st.divisoria]}>
                  <View style={st.colQuando}>
                    <Text style={st.quando}>{rotuloCurto(deISO(l.data))}</Text>
                    <Text style={st.turma}>{NOME_TURMA[l.turma]}</Text>
                  </View>
                  <Nota valor={l.treino} />
                  <Nota
                    valor={l.entenderam}
                    alerta={l.entenderam !== null && l.entenderam < LIMITE_COMPREENSAO}
                  />
                  <Nota valor={l.dificuldade} />
                </Animated.View>
              ))}
            </>
          ) : (
            <Text style={st.vazio}>Nenhum treino avaliado neste mês.</Text>
          )}
        </View>
      </Bloco>
    </TelaForm>
  )
}

function Nota({
  valor,
  media,
  alerta,
}: {
  valor: number | null
  media?: boolean
  alerta?: boolean
}) {
  const estilo = [st.col, st.nota, media && st.notaMedia, alerta && st.notaAlerta]
  // a media e o numero que importa: conta ate o valor e acende quando muda
  if (media && valor !== null) {
    return <NumeroAnimado valor={valor} formato={formatoNota} style={estilo} />
  }
  return <Text style={estilo}>{valor === null ? '—' : formatoNota(valor)}</Text>
}

function formatoNota(n: number) {
  return n.toFixed(1).replace('.', ',')
}

const st = StyleSheet.create({
  tabela: {
    paddingHorizontal: space.base,
    paddingVertical: space.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  titCol: { ...type.caption, fontFamily: 'Inter_600SemiBold', color: color.faint },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  divisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  colQuando: { flex: 1.3 },
  contagem: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, textAlign: 'center' },
  quando: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },
  turma: { ...type.caption, fontFamily: 'Inter_400Regular', color: color.muted },
  nota: { ...type.small, fontFamily: 'Inter_400Regular', color: color.text },
  notaMedia: { fontFamily: 'Inter_700Bold', color: onDark.text },
  notaAlerta: { color: color.warn, fontFamily: 'Inter_600SemiBold' },
  vazio: {
    ...type.small,
    fontFamily: 'Inter_400Regular',
    color: color.muted,
    paddingVertical: space.lg,
    textAlign: 'center',
  },
})
