import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, Opcao, Rotulo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { useUnidades } from '@/data/chamada'
import {
  rascunhoTreino,
  responsavelDoPlano,
  salvarComissaoDoJogo,
  useDetalheJogo,
  useJogo,
  type PessoaEquipe,
} from '@/data/jogo-dados'
import { usePerfil } from '@/data/perfis'
import { voltar } from '@/lib/navegacao'
import { color } from '@/theme/tokens'

/**
 * Tela 11y. Serve ao treino e ao jogo: `alvo` e "treino" ou o id do jogo.
 * So aparece quem tem funcao de treinador ou professor no cadastro de
 * usuario (R6) — por isso o aviso explica a ausencia.
 *
 * Quem monta a comissao e a coordenacao tecnica (e o ADM). O treinador ve
 * quem esta escalado, sem marcar. No treino, o primeiro escolhido e o
 * responsavel.
 */
const FUNCAO: Record<string, string> = { treinador: 'Treinador', professor: 'Professor' }

export default function Comissao() {
  const { alvo = 'treino' } = useLocalSearchParams<{ alvo?: string }>()
  const { equipe, escala, carregando } = useJogo()
  const plano = rascunhoTreino.useValor()
  const unidades = useUnidades()
  const jogo = useDetalheJogo(alvo === 'treino' ? undefined : alvo)

  const voluntarios = equipe.filter((p) => p.funcao === 'treinador' || p.funcao === 'professor')
  // a mesma unidade que o "Planejar treino" usa quando nenhuma foi escolhida
  const esperaUnidade = alvo === 'treino' && !plano.unidadeId && unidades.carregando
  if (carregando || esperaUnidade || (alvo !== 'treino' && jogo.carregando)) {
    return (
      <TelaForm titulo="Comissão técnica" subtitulo="Carregando…">
        <ActivityIndicator color={color.primaryCh} />
      </TelaForm>
    )
  }

  // no treino novo, o tecnico da escala ja vem marcado como responsavel
  // (o mesmo que o "Planejar treino" mostra)
  const responsavelId = responsavelDoPlano(
    plano,
    escala,
    plano.unidadeId ?? unidades.dados[0]?.id ?? null,
  )
  const inicial =
    alvo === 'treino'
      ? [responsavelId, ...plano.comissao].filter(
          (x, i, todos): x is string => !!x && todos.indexOf(x) === i,
        )
      : (jogo.dados?.comissao ?? [])
  return (
    <Escolha
      key={alvo}
      alvo={alvo}
      voluntarios={voluntarios}
      inicial={inicial}
      subtitulo={
        jogo.dados ? `ADAM × ${jogo.dados.jogo.adversario}` : 'Quem está escalado neste treino'
      }
    />
  )
}

function Escolha({
  alvo,
  voluntarios,
  inicial,
  subtitulo,
}: {
  alvo: string
  voluntarios: PessoaEquipe[]
  inicial: string[]
  subtitulo: string
}) {
  const { editaEscala } = usePerfil()
  const [escolhidos, setEscolhidos] = useState<string[]>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const noTreino = alvo === 'treino'

  const alternar = (id: string) =>
    setEscolhidos((atual) => (atual.includes(id) ? atual.filter((n) => n !== id) : [...atual, id]))

  const confirmar = async () => {
    if (noTreino) {
      const [responsavelId = null, ...resto] = escolhidos
      rascunhoTreino.definir({ responsavelId, comissao: resto })
      voltar()
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await salvarComissaoDoJogo(alvo, escolhidos)
      mostrarRecado('Comissão salva')
      voltar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo="Comissão técnica"
      subtitulo={subtitulo}
      rodape={
        editaEscala ? (
          <Botao
            rotulo={salvando ? 'Salvando…' : 'Confirmar comissão'}
            desabilitado={salvando}
            onPress={confirmar}
          />
        ) : undefined
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Bloco>
        <Rotulo extra={`${escolhidos.length} escalados`}>Equipe</Rotulo>
        {voluntarios.length ? (
          <Grupo>
            {voluntarios.map((v) => {
              const posicao = escolhidos.indexOf(v.id)
              const papel =
                posicao < 0 ? undefined : noTreino && posicao === 0 ? 'responsável' : 'escalado'
              return editaEscala ? (
                <Opcao
                  key={v.id}
                  tipo="check"
                  titulo={v.nome}
                  iniciais={v.iniciais}
                  valor={papel ?? FUNCAO[v.funcao ?? ''] ?? ''}
                  ativa={posicao >= 0}
                  onPress={() => alternar(v.id)}
                />
              ) : (
                <Linha
                  key={v.id}
                  titulo={v.nome}
                  legenda={FUNCAO[v.funcao ?? ''] ?? ''}
                  selo={papel ? { rotulo: papel, tom: 'verde' } : undefined}
                  semSeta
                />
              )
            })}
          </Grupo>
        ) : (
          <Aviso
            tom="ambar"
            titulo="Ninguém com função de treinador ou professor"
            texto="Cadastre a equipe em Configuração da ADAM › Usuários."
          />
        )}
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo={
            editaEscala
              ? noTreino
                ? 'O primeiro marcado é o responsável'
                : 'A função vem do cadastro do usuário'
              : 'Quem monta é a coordenação técnica'
          }
          texto={
            editaEscala
              ? 'Só aparece quem tem função de treinador ou professor em Usuários.'
              : 'Você vê quem está escalado. Para mudar, fale com a coordenação técnica.'
          }
        />
      </Bloco>
    </TelaForm>
  )
}
