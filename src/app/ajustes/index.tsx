import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { Bloco, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { avisoDeAtraso, cuidaDoBackup, useBackups } from '@/data/backup'
import { useUnidades } from '@/data/chamada'
import { usePerfil } from '@/data/perfis'
import { useUsuarios } from '@/data/usuarios'

/**
 * Tela 10 · Configuracao da ADAM. So o ADM chega aqui (o layout de Ajustes
 * protege a rota; os outros nem veem a linha em Minha conta). A conta de
 * cada um mora em Minha conta, aberta pela foto no topo.
 */
export default function ConfiguracaoDaAdam() {
  const unidades = useUnidades()
  const equipe = useUsuarios()
  const { pessoa } = usePerfil()
  const veCopias = cuidaDoBackup(pessoa.email)
  const copias = useBackups()
  const ultimaBoa = copias.lista.find((b) => b.ok)
  const ultimaFalhou = copias.lista[0] ? !copias.lista[0].ok : false
  const atraso = avisoDeAtraso(copias.lista, copias.lidoEm)
  const recarregar = equipe.recarregar

  useFocusEffect(
    useCallback(() => {
      recarregar()
    }, [recarregar]),
  )

  const nUnidades = unidades.dados.length
  const nPessoas = equipe.lista.length

  return (
    <TelaForm
      titulo="Configuração da ADAM"
      subtitulo="Só a coordenação vê esta área"
      voltarPara="/ajustes/conta">
      <Bloco>
        <Rotulo>Onde e com quem</Rotulo>
        <Grupo>
          <Linha
            titulo="Unidades e turmas"
            legenda="Onde acontecem os treinos e as aulas"
            valor={
              unidades.carregando ? '…' : `${nUnidades} ${nUnidades === 1 ? 'unidade' : 'unidades'}`
            }
            onPress={() => router.push('/ajustes/unidades')}
          />
          <Linha
            titulo="Usuários e permissões"
            legenda="Quem entra no app e o que cada um vê"
            valor={equipe.carregando ? '…' : `${nPessoas} ${nPessoas === 1 ? 'pessoa' : 'pessoas'}`}
            onPress={() => router.push('/ajustes/usuarios')}
          />
        </Grupo>
      </Bloco>

      {veCopias ? (
        <Bloco ordem={1}>
          <Rotulo>Proteção dos dados</Rotulo>
          <Grupo>
            <Linha
              titulo="Cópia de segurança"
              legenda={
                copias.carregando
                  ? '…'
                  : atraso
                    ? atraso
                    : ultimaBoa
                      ? `Automática no Drive · última boa: ${new Date(ultimaBoa.feitoEm).getDate()}/${new Date(ultimaBoa.feitoEm).getMonth() + 1}`
                      : 'Automática no Drive, 3 vezes por dia'
              }
              legendaTom={ultimaFalhou || atraso ? 'ambar' : undefined}
              selo={
                ultimaFalhou
                  ? { rotulo: 'última falhou', tom: 'ambar' }
                  : atraso
                    ? { rotulo: 'atrasada', tom: 'ambar' }
                    : undefined
              }
              onPress={() => router.push('/ajustes/backup')}
            />
          </Grupo>
        </Bloco>
      ) : null}
    </TelaForm>
  )
}
