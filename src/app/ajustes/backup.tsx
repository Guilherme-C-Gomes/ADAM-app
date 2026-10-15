import { useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { Aviso, Bloco, Botao, Grupo, Linha, Rotulo, TelaForm } from '@/components/ui/form'
import { mostrarRecado } from '@/components/ui/recado'
import { baixarCopiaAqui, fazerCopiaAgora, useBackups, type RegistroBackup } from '@/data/backup'
import { color } from '@/theme/tokens'

/**
 * Copia de seguranca (so a conta de suporte, suporte.ti). A automatica vai para a pasta do Google
 * Drive da ADAM tres vezes por dia — e e ela que mantem o Supabase gratuito
 * acordado nas ferias. Aqui o suporte ve se as ultimas deram certo, pede uma
 * agora, ou baixa uma para guardar fora (pendrive).
 */
const dois = (n: number) => String(n).padStart(2, '0')

/** "hoje às 13h02", "ontem às 21h00", "12/10 às 07h05" — sem Intl. */
function quando(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  const dia = mesmoDia(d, hoje)
    ? 'hoje'
    : mesmoDia(d, ontem)
      ? 'ontem'
      : `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`
  return `${dia} às ${dois(d.getHours())}h${dois(d.getMinutes())}`
}

function legenda(b: RegistroBackup) {
  if (!b.ok) return b.erro ?? 'Falhou'
  const partes = [`${b.linhas ?? 0} registros`]
  if (b.arquivosNovos) partes.push(`${b.arquivosNovos} fotos e documentos novos`)
  if (b.arquivosPendentes) partes.push(`${b.arquivosPendentes} na fila`)
  return partes.join(' · ')
}

export default function CopiaDeSeguranca() {
  const { lista, carregando, faltaSql, erro, recarregar } = useBackups()
  const [fazendo, setFazendo] = useState<'drive' | 'aqui' | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  const ultimaBoa = lista.find((b) => b.ok)
  const ultima = lista[0]

  const agora = async () => {
    setFalha(null)
    setFazendo('drive')
    try {
      const r = await fazerCopiaAgora()
      mostrarRecado(
        r.arquivos_pendentes
          ? `Cópia feita. ${r.arquivos_pendentes} fotos e documentos seguem na próxima.`
          : 'Cópia feita no Drive',
      )
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'A cópia não foi feita.')
    } finally {
      setFazendo(null)
      recarregar()
    }
  }

  const aqui = async () => {
    setFalha(null)
    setFazendo('aqui')
    try {
      const nome = await baixarCopiaAqui()
      mostrarRecado(`Cópia pronta: ${nome}`)
    } catch {
      setFalha('Não foi possível montar a cópia neste aparelho.')
    } finally {
      setFazendo(null)
    }
  }

  return (
    <TelaForm
      titulo="Cópia de segurança"
      subtitulo="Automática no Google Drive, 3 vezes por dia"
      voltarPara="/ajustes"
      rodape={
        <>
          <Botao
            rotulo={fazendo === 'drive' ? 'Fazendo a cópia…' : 'Fazer cópia no Drive agora'}
            desabilitado={!!fazendo}
            onPress={agora}
          />
          <Botao
            rotulo={fazendo === 'aqui' ? 'Montando…' : 'Baixar cópia neste aparelho'}
            variante="secundario"
            desabilitado={!!fazendo}
            onPress={aqui}
          />
        </>
      }>
      {faltaSql ? (
        <Bloco>
          <Aviso
            tom="ambar"
            titulo="Falta rodar o SQL da cópia de segurança"
            texto="Sem ele a cópia funciona, mas o app não consegue mostrar o histórico."
          />
        </Bloco>
      ) : null}
      {falha || erro ? (
        <Bloco>
          <Aviso tom="ambar" titulo={falha ?? erro ?? ''} />
        </Bloco>
      ) : null}

      <Bloco>
        {carregando ? (
          <ActivityIndicator color={color.primaryCh} />
        ) : ultimaBoa ? (
          <Aviso
            tom={ultima && !ultima.ok ? 'ambar' : 'roxo'}
            titulo={`Última cópia boa: ${quando(ultimaBoa.feitoEm)}`}
            texto={
              ultima && !ultima.ok
                ? `A tentativa de ${quando(ultima.feitoEm)} falhou: ${ultima.erro ?? 'erro'}`
                : 'Banco inteiro na pasta banco/ do Drive; fotos e documentos em arquivos/.'
            }
          />
        ) : faltaSql ? null : (
          <Aviso
            titulo="Nenhuma cópia ainda"
            texto="A primeira roda no próximo horário (7h, 13h ou 21h) — ou toque em “Fazer cópia no Drive agora”."
          />
        )}
      </Bloco>

      {lista.length ? (
        <Bloco ordem={1}>
          <Rotulo>Últimas cópias</Rotulo>
          <Grupo>
            {lista.map((b) => (
              <Linha
                key={b.id}
                titulo={`${quando(b.feitoEm)} · ${b.origem === 'agendado' ? 'automática' : 'pedida no app'}`}
                legenda={legenda(b)}
                legendaTom={b.ok ? undefined : 'ambar'}
                selo={b.ok ? { rotulo: 'ok', tom: 'verde' } : { rotulo: 'falhou', tom: 'ambar' }}
                semSeta
              />
            ))}
          </Grupo>
        </Bloco>
      ) : null}

      <Bloco ordem={2}>
        <Aviso
          titulo="Por que três vezes por dia"
          texto="Cada cópia também mantém o servidor gratuito acordado: ele pausa depois de 7 dias sem uso, e isso não acontece nem nas férias. Antes das férias, baixe uma cópia e guarde num pendrive."
        />
      </Bloco>
    </TelaForm>
  )
}
