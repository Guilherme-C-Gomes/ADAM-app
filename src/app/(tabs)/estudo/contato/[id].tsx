import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Avatar } from '@/components/ui'
import { pedirConfirmacao } from '@/components/ui/confirmacao'
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
import { Icone } from '@/components/ui/icone'
import { entrada } from '@/components/ui/movimento'
import { mostrarRecado } from '@/components/ui/recado'
import {
  carregarBiblioteca,
  diaMes,
  excluirEmprestimo,
  lerContatos,
  useBiblioteca,
  type Contato,
} from '@/data/estudo'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color, radius, space, type } from '@/theme/tokens'

/**
 * Tela 13n. Cobrar livro atrasado e conversa, nao notificacao: a
 * mensagem ja vem escrita e da para editar antes de mandar.
 *
 * O ADM ve todos os responsaveis. O professor ve SO o numero principal: para
 * cobrar o livro basta ele, e o resto da familia e dado sensivel. Quem
 * garante isso e o banco (`contato_principal`), nao a tela.
 */

/** So os digitos, com o 55 do Brasil na frente quando faltar. */
function numeroWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, '')
  return digitos.length <= 11 ? `55${digitos}` : digitos
}

export default function ContatoDoLivro() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { livros, emprestimos, criancas, carregando } = useBiblioteca()
  const { veDadosSensiveis, administraEstudo } = usePerfil()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  const emprestimo = emprestimos.find((e) => e.id === id)
  const livro = livros.find((l) => l.id === emprestimo?.livroId)
  const crianca = emprestimo ? criancas[emprestimo.criancaId] : undefined

  const [contatos, setContatos] = useState<{
    lista: Contato[]
    erro: string | null
    de: string | null
  }>({ lista: [], erro: null, de: null })
  const criancaId = emprestimo?.criancaId ?? null
  useEffect(() => {
    if (!criancaId) return
    let ativo = true
    lerContatos(criancaId, veDadosSensiveis).then(
      (lista) => {
        if (ativo) setContatos({ lista, erro: null, de: criancaId })
      },
      () => {
        if (ativo)
          setContatos({ lista: [], erro: 'Não foi possível ler o contato.', de: criancaId })
      },
    )
    return () => {
      ativo = false
    }
  }, [criancaId, veDadosSensiveis])
  const lendoContatos = contatos.de !== criancaId

  const padrao =
    crianca && livro && emprestimo
      ? `Oi! Aqui é da ADAM. O livro “${livro.titulo}” que ${crianca.nome.split(' ')[0]} pegou ${emprestimo.atrasado ? 'estava para voltar' : 'volta'} dia ${diaMes(emprestimo.entrega)}. Pode trazer no próximo treino?`
      : ''
  const [editada, setEditada] = useState<string | null>(null)
  const mensagem = editada ?? padrao

  if (!emprestimo || !livro) {
    return (
      <TelaForm
        titulo={carregando ? 'Abrindo…' : 'Empréstimo não encontrado'}
        subtitulo={carregando ? 'Biblioteca da ADAM' : 'O livro já pode ter voltado'}
        voltarPara="/estudo">
        {carregando ? <ActivityIndicator color={color.primaryCh} /> : null}
      </TelaForm>
    )
  }

  const principal = contatos.lista.find((c) => c.principal) ?? contatos.lista[0]

  // emprestimo registrado por engano: some de vez (devolver guarda a volta)
  const excluir = async () => {
    const certeza = await pedirConfirmacao({
      titulo: 'Excluir este empréstimo?',
      texto: `Use só se ele foi registrado por engano: “${livro.titulo}” volta para a estante e o empréstimo some, sem contar nos números. Se o livro voltou, use a devolução. Não dá para desfazer.`,
      confirmar: 'Excluir empréstimo',
      perigo: true,
    })
    if (!certeza) return
    setErroExcluir(null)
    setExcluindo(true)
    try {
      await excluirEmprestimo(emprestimo.id)
      mostrarRecado('Empréstimo excluído')
      voltar('/estudo')
      carregarBiblioteca()
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Não foi possível excluir o empréstimo.')
      setExcluindo(false)
    }
  }

  const abrirWhatsApp = (telefone: string) =>
    Linking.openURL(
      `https://wa.me/${numeroWhatsApp(telefone)}?text=${encodeURIComponent(mensagem)}`,
    )

  return (
    <TelaForm
      titulo="Contato"
      subtitulo={`${crianca?.nome ?? 'Criança'} · livro ${emprestimo.atrasado ? 'atrasado' : 'emprestado'}`}
      voltarPara="/estudo"
      rodape={
        <Botao
          rotulo="Abrir no WhatsApp"
          desabilitado={!principal}
          onPress={() => principal && abrirWhatsApp(principal.telefone)}
        />
      }>
      <Bloco>
        <View style={[st.livro, emprestimo.atrasado && st.livroAtrasado]}>
          {emprestimo.atrasado ? <View style={st.acento} /> : null}
          {livro.capaUrl ? (
            <Image source={{ uri: livro.capaUrl }} style={st.capa} contentFit="cover" />
          ) : (
            <View style={[st.capa, { backgroundColor: livro.cor }]}>
              <Text style={st.capaLetra}>{livro.titulo.charAt(0)}</Text>
            </View>
          )}
          <View style={st.texto}>
            <Text style={st.titulo}>{livro.titulo}</Text>
            <Text style={st.legenda}>
              entrega {diaMes(emprestimo.entrega)}
              {emprestimo.diasAtraso
                ? ` · ${emprestimo.diasAtraso} ${emprestimo.diasAtraso === 1 ? 'dia' : 'dias'} de atraso`
                : ''}
            </Text>
          </View>
        </View>
      </Bloco>

      <Bloco ordem={1}>
        <Rotulo
          extra={`${contatos.lista.length} ${contatos.lista.length === 1 ? 'contato' : 'contatos'}`}>
          {veDadosSensiveis ? 'Responsáveis' : 'Número principal'}
        </Rotulo>
        {lendoContatos ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : contatos.erro ? (
          <Aviso tom="ambar" titulo={contatos.erro} />
        ) : contatos.lista.length ? (
          <Grupo>
            {contatos.lista.map((c, i) => (
              <Animated.View key={`${c.nome}-${c.telefone}`} entering={entrada(i, { base: 40 })}>
                <Linha
                  titulo={c.nome}
                  legenda={`${c.relacao} · ${c.telefone}`}
                  esquerda={<Avatar iniciais={c.nome.charAt(0)} size={30} />}
                  selo={c.principal ? { rotulo: 'principal', tom: 'ambar' } : undefined}
                  direita={
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${c.telefone.replace(/\D/g, '')}`)}
                      hitSlop={space.md}
                      accessibilityRole="button"
                      accessibilityLabel={`Ligar para ${c.nome}`}>
                      <Icone nome="telefone" cor={color.primaryCh} />
                    </Pressable>
                  }
                  onPress={() => abrirWhatsApp(c.telefone)}
                />
              </Animated.View>
            ))}
          </Grupo>
        ) : (
          <Aviso
            tom="ambar"
            titulo="A ficha não tem responsável"
            texto="Peça à Secretaria para completar o contato da família."
          />
        )}
      </Bloco>

      <Bloco ordem={2}>
        <Rotulo extra="toque para editar">Mensagem pronta</Rotulo>
        <Entrada value={mensagem} onChangeText={setEditada} multiline />
        <Selo rotulo="Some da lista quando o livro voltar" tom="neutro" />
      </Bloco>

      {administraEstudo ? (
        <Bloco ordem={3} style={st.excluir}>
          {erroExcluir ? <Aviso tom="ambar" titulo={erroExcluir} /> : null}
          <Botao
            rotulo={excluindo ? 'Excluindo…' : 'Excluir empréstimo'}
            variante="perigo"
            desabilitado={excluindo}
            onPress={excluir}
          />
        </Bloco>
      ) : null}
    </TelaForm>
  )
}

const st = StyleSheet.create({
  livro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  livroAtrasado: { paddingLeft: space.lg },
  acento: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.danger,
  },
  capa: {
    width: 34,
    height: 44,
    borderRadius: 6,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capaLetra: { ...type.body, fontFamily: 'Inter_700Bold', color: color.text },
  texto: { flex: 1, gap: 2 },
  titulo: { ...type.body, fontFamily: 'Inter_600SemiBold', color: color.text },
  legenda: { ...type.small, fontFamily: 'Inter_400Regular', color: color.muted },
  excluir: { gap: space.sm, marginTop: space.lg },
})
