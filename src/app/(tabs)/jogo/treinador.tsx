import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { Aviso, Bloco, Botao, Busca, Grupo, Opcao, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { DIAS_CURTOS } from '@/data/calendario'
import { NOME_TURMA } from '@/data/chamada'
import { definirTecnico, horaCurta, useJogo } from '@/data/jogo-dados'
import { voltar } from '@/lib/navegacao'

/**
 * Tela 11l. R6: so quem tem funcao de treinador entra. Quando a pessoa nao
 * esta aqui, o caminho e cadastrar em Usuarios — nao digitar nome livre.
 * "Deixar a definir" continua valendo (R7).
 */
export default function EscolherTreinador() {
  const { linha } = useLocalSearchParams<{ linha?: string }>()
  const { escala, equipe } = useJogo()
  const horario = escala.find((l) => l.id === linha)

  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState<string | null>(horario?.tecnicoId ?? null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const termo = busca.trim().toLowerCase()
  const treinadores = equipe
    .filter((u) => u.funcao === 'treinador')
    .filter((u) => (termo ? u.nome.toLowerCase().includes(termo) : true))

  const confirmar = async () => {
    if (!linha) return
    setErro(null)
    setSalvando(true)
    try {
      await definirTecnico(linha, escolhido)
      mostrarRecado('Escala atualizada')
      voltar('/jogo/escala')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <TelaForm
      titulo="Técnico do horário"
      subtitulo={
        horario
          ? `${DIAS_CURTOS[horario.diaSemana]} ${horaCurta(horario.hora)} · ${NOME_TURMA[horario.turma]}`
          : 'Só quem tem função de treinador'
      }
      voltarPara="/jogo/escala"
      rodape={
        <Botao
          rotulo={salvando ? 'Salvando…' : 'Confirmar técnico'}
          desabilitado={!horario || salvando}
          onPress={confirmar}
        />
      }>
      {erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={erro} />
        </Bloco>
      ) : null}

      <Busca valor={busca} onChange={setBusca} placeholder="Buscar treinador" />

      <Bloco>
        <Grupo>
          {[
            ...treinadores.map((u) => (
              <Opcao
                key={u.id}
                titulo={u.nome}
                iniciais={u.iniciais}
                ativa={escolhido === u.id}
                onPress={() => setEscolhido(u.id)}
              />
            )),
            <Opcao
              key="definir"
              titulo="Deixar a definir"
              legenda="Fica em âmbar na escala até alguém assumir"
              ativa={escolhido === null}
              onPress={() => setEscolhido(null)}
            />,
          ]}
        </Grupo>
      </Bloco>

      <Bloco ordem={1}>
        <Aviso
          titulo="Não achou a pessoa?"
          texto="Só aparece quem tem função de treinador. Cadastre em Configuração da ADAM › Usuários."
          onPress={() => router.push('/ajustes/usuarios')}
        />
      </Bloco>
    </TelaForm>
  )
}
