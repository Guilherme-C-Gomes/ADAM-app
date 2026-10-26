import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Contador } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
import { Aviso, Botao, Entrada, Link } from '@/components/ui/form'
import { entrada } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import { Esqueleto, SkeletonCard } from '@/components/ui/skeleton'
import { HeroPerfil } from '@/components/ui/setor'
import {
  DOCUMENTOS,
  emQueda,
  excluirFicha,
  hojeISO,
  LIMITE_BAIXA_FREQUENCIA,
  marcarSaida,
  paraBR,
  paraISO,
  reativarFicha,
  useParticipantes,
  type Participante,
} from '@/data/fichas'
import { usePerfil } from '@/data/perfis'
import { color, onDark, radius, space, target, type, ESPACO_FIM_DA_TELA } from '@/theme/tokens'
import { voltar } from '@/lib/navegacao'

/**
 * Perfil da crianca (Secretaria e ADM): frequencia das chamadas encerradas
 * e o estado da ficha. O lapis abre a mesma ficha do cadastro, ja
 * preenchida.
 */
export default function PerfilParticipante() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { lista, carregando, erro, recarregar } = useParticipantes(id)
  const p = lista[0]
  // excluir a ficha e so de quem administra a Secretaria (o banco tambem
  // recusa os outros)
  const { administraSecretaria } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  // voltar da edicao traz a ficha salva
  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  if (carregando && !p) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <HeroPerfil iniciais="" nome="Abrindo a ficha…" meta="" />
        <View style={st.conteudo}>
          <Esqueleto>
            <SkeletonCard altura={208} />
            <SkeletonCard altura={200} />
            <SkeletonCard altura={100} />
          </Esqueleto>
        </View>
      </SafeAreaView>
    )
  }

  if (!p) {
    return (
      <SafeAreaView style={st.screen} edges={['top']}>
        <View style={st.ausente}>
          <Text style={st.ausenteTitulo}>
            {erro ? 'Não foi possível abrir a ficha' : 'Participante não encontrado'}
          </Text>
          {erro ? (
            <Pressable onPress={recarregar} accessibilityRole="button">
              <Text style={st.link}>Tentar de novo</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => voltar()} accessibilityRole="button">
            <Text style={st.link}>Voltar para a lista</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const semChamada = p.frequencia === null
  const baixa = emQueda(p)
  const faltamDocs = DOCUMENTOS.length - p.documentosEntregues
  const pendencias = faltamDocs + (p.temResponsavel ? 0 : 1)
  const situacaoCadastro = pendencias
    ? `${pendencias} ${pendencias === 1 ? 'pendência' : 'pendências'}`
    : 'Cadastro completo'

  const dados = [
    { rotulo: 'Unidade', valor: p.unidade },
    { rotulo: 'Turma', valor: p.turma },
    { rotulo: 'Idade', valor: `${p.idade} anos` },
    { rotulo: 'Participa desde', valor: p.desde },
    { rotulo: 'Responsável', valor: p.temResponsavel ? 'cadastrado' : 'falta cadastrar' },
    { rotulo: 'Documentos', valor: `${p.documentosEntregues} de ${DOCUMENTOS.length}` },
  ]

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <HeroPerfil
        iniciais={p.iniciais}
        nome={p.nome}
        meta={`${p.idade} anos · ${p.unidade} · desde ${p.desde}`}
        foto={p.fotoUrl}
        acao={{
          icone: 'lapis',
          rotulo: 'Editar ficha',
          onPress: () =>
            router.push({ pathname: '/secretaria/participantes/cadastrar', params: { id: p.id } }),
        }}
      />

      <ScrollView contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
        <Animated.View entering={entrada(0)}>
          <Card>
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Frequência</Text>
              <View
                style={[st.selo, semChamada ? st.seloNeutro : baixa ? st.seloBaixa : st.seloOk]}>
                <Text
                  style={[
                    st.seloRotulo,
                    semChamada ? st.corNeutra : baixa ? st.corBaixa : st.corOk,
                  ]}>
                  {semChamada ? 'Sem chamada' : baixa ? 'Em atenção' : 'Saudável'}
                </Text>
              </View>
            </View>
            <Text style={st.legenda}>Últimas 8 semanas</Text>

            <View style={st.valorLinha}>
              {p.frequencia === null ? (
                <Text style={st.valor}>—</Text>
              ) : (
                <Contador valor={p.frequencia} sufixo="%" style={st.valor} />
              )}
              <Text style={st.legenda}>
                {p.presencas} de {p.chamadas} {p.chamadas === 1 ? 'chamada' : 'chamadas'}
              </Text>
            </View>

            <View style={st.semanas}>
              {p.semanas.map((presente, i) => (
                <View
                  key={i}
                  style={[
                    st.semana,
                    presente === null
                      ? st.semanaVazia
                      : { backgroundColor: presente ? color.success : color.surface2 },
                  ]}
                  accessibilityLabel={`Semana ${i + 1}: ${
                    presente === null ? 'sem chamada' : presente ? 'presente' : 'ausente'
                  }`}
                />
              ))}
            </View>
            <Text style={st.legenda}>
              {semChamada
                ? 'A frequência aparece depois da primeira chamada encerrada da turma'
                : baixa
                  ? `Abaixo do limite de ${LIMITE_BAIXA_FREQUENCIA}% — vale contato da equipe`
                  : 'Dentro do esperado para o período'}
            </Text>
          </Card>
        </Animated.View>

        <Animated.View entering={entrada(1)}>
          <Card style={st.cardLista}>
            <View style={st.linhaTopo}>
              <Text style={st.cardTitulo}>Cadastro</Text>
              <View style={[st.selo, pendencias ? st.seloBaixa : st.seloOk]}>
                <Text style={[st.seloRotulo, pendencias ? st.corBaixa : st.corOk]}>
                  {situacaoCadastro}
                </Text>
              </View>
            </View>
            {dados.map((d, i) => (
              <View key={d.rotulo} style={[st.linha, i < dados.length - 1 && st.linhaDivisoria]}>
                <Text style={st.linhaRotulo}>{d.rotulo}</Text>
                <Text style={st.linhaValor}>{d.valor}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={entrada(2)}>
          <Card>
            <Text style={st.cardTitulo}>Observações da equipe</Text>
            <Text style={st.legenda}>{p.observacao || 'Nenhuma observação.'}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={entrada(3)}>
          <Saida key={`${p.id}-${p.ativa}`} p={p} aoMudar={recarregar} />
        </Animated.View>

        {administraSecretaria ? (
          <Animated.View entering={entrada(4)} style={st.excluir}>
            {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
            <Botao
              rotulo={excluindo ? 'Excluindo…' : 'Excluir ficha'}
              variante="perigo"
              desabilitado={excluindo}
              onPress={async () => {
                const certeza = await pedirConfirmacao({
                  titulo: `Excluir a ficha de ${p.nome.split(' ')[0]}?`,
                  texto:
                    'Some a ficha inteira: responsáveis, documentos, fotos, presenças nas chamadas, livros emprestados e convocações. Os números da Secretaria deixam de contar esta criança. Não dá para desfazer.',
                  confirmar: 'Excluir ficha',
                  perigo: true,
                })
                if (!certeza) return
                setErroExcluir(null)
                setExcluindo(true)
                try {
                  await excluirFicha(p.id)
                  mostrarRecado('Ficha excluída')
                  voltar('/secretaria/participantes')
                } catch (e) {
                  setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir.')
                  setExcluindo(false)
                }
              }}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

/** "05092026" vira "05/09/2026". */
function mascaraData(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/**
 * Saida da ADAM (ADM e Secretaria). A ficha nao some: fica inativa, com a
 * data e o motivo, e sai da chamada, da convocacao e do emprestimo. O
 * historico continua contando no periodo em que a crianca estava.
 */
function Saida({ p, aoMudar }: { p: Participante; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(paraBR(hojeISO()))
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const dataISO = paraISO(data)

  const executar = async (acao: () => Promise<void>, recado: string) => {
    setErro(null)
    setSalvando(true)
    try {
      await acao()
      mostrarRecado(recado)
      aoMudar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
      setSalvando(false)
    }
  }

  if (!p.ativa) {
    return (
      <View style={st.excluir}>
        <Aviso
          tom="ambar"
          titulo={p.saiuEm ? `Saiu da ADAM em ${paraBR(p.saiuEm)}` : 'Ficha inativa'}
          texto={p.motivoSaida ?? 'Sem motivo anotado.'}
        />
        {erro ? <Aviso tom="ambar" titulo={erro} /> : null}
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Voltou para a ADAM'}
          variante="secundario"
          desabilitado={salvando}
          onPress={() =>
            executar(() => reativarFicha(p.id), `${p.nome.split(' ')[0]} voltou para a ADAM`)
          }
        />
      </View>
    )
  }

  if (!aberto) {
    return (
      <View style={st.excluir}>
        <Botao
          rotulo="Marcar que saiu da ADAM"
          variante="secundario"
          onPress={() => setAberto(true)}
        />
      </View>
    )
  }

  return (
    <View style={st.excluir}>
      <Entrada
        rotulo="Saiu em"
        value={data}
        onChangeText={(t) => setData(mascaraData(t))}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        maxLength={10}
      />
      <Entrada
        rotulo="Motivo (opcional)"
        value={motivo}
        onChangeText={setMotivo}
        placeholder="Ex.: mudou de cidade"
      />
      {erro ? <Aviso tom="ambar" titulo={erro} /> : null}
      <Botao
        rotulo={salvando ? 'Salvando…' : 'Confirmar saída'}
        desabilitado={!dataISO || dataISO > hojeISO() || salvando}
        onPress={() =>
          dataISO &&
          executar(
            () => marcarSaida(p.id, dataISO, motivo),
            `Saída de ${p.nome.split(' ')[0]} registrada`,
          )
        }
      />
      <Link centro rotulo="Cancelar" onPress={() => setAberto(false)} />
      <Aviso
        titulo="A ficha não é apagada"
        texto="Ela sai da chamada e das listas, mas as presenças e os empréstimos continuam no histórico. Se a criança voltar, é só reativar."
      />
    </View>
  )
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  conteudo: { padding: space.lg, gap: space.base, paddingBottom: ESPACO_FIM_DA_TELA },
  excluir: { gap: space.sm, marginTop: space.lg },

  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  cardTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  valorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  valor: { ...type.display, fontFamily: 'Inter_700Bold', color: color.text },

  semanas: { flexDirection: 'row', gap: space.sm },
  semana: { flex: 1, height: 34, borderRadius: 8, borderCurve: 'continuous' },
  semanaVazia: { borderWidth: 1, borderColor: color.border, borderStyle: 'dashed' },

  selo: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  seloOk: { backgroundColor: 'rgba(61, 214, 140, 0.12)' },
  seloBaixa: { backgroundColor: 'rgba(245, 165, 36, 0.14)' },
  seloNeutro: { backgroundColor: color.surface2 },
  seloRotulo: { ...type.caption, fontFamily: 'Inter_600SemiBold' },
  corOk: { color: color.success },
  corBaixa: { color: color.warn },
  corNeutra: { color: color.muted },

  cardLista: { gap: 0 },
  linha: {
    minHeight: target.minimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
  },
  linhaDivisoria: { borderBottomWidth: 1, borderBottomColor: color.divider },
  linhaRotulo: { ...type.body, fontFamily: 'Inter_400Regular', color: color.muted },
  linhaValor: { ...type.small, fontFamily: 'Inter_600SemiBold', color: color.text },

  ausente: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  ausenteTitulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  link: { ...type.body, fontFamily: 'Inter_600SemiBold', color: onDark.text },
})
