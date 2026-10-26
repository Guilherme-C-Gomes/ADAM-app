-- ADAM · a chamada que ficou aberta fecha sozinha no fim do dia.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), depois do
-- 20261026120000_exclusao_por_setor.sql. Pode rodar de novo sem estragar nada.
--
-- Regra da ONG: as chamadas abrem nos dias de treino (o app le a escala
-- semanal da unidade, nada muda no banco para isso) e fecham sozinhas caso
-- tenham ficado abertas ao fim do dia.
--
-- O que entra:
-- - public.encerrar_chamadas_abertas(): encerra toda chamada de dia anterior
--   (data < public.hoje(), horario de Brasilia) ainda em andamento. Faz o
--   mesmo que public.encerrar_chamada ao encerrar (estado 'encerrada' e
--   encerrada_em = now()), mas com encerrada_por nulo: nulo quer dizer
--   "encerrada automaticamente" (a coluna e nula desde o esquema inicial; o
--   20261002140000_exclusao.sql so trocou a ligacao para "set null"). As
--   marcas ficam como estavam: quem nao foi marcado conta como falta, igual
--   ao encerrar a mao. Devolve quantas fechou.
-- - um job do pg_cron, 'adam-fechar-chamadas', todo dia 00h05 de Brasilia
--   (03h05 UTC; Brasilia nao tem horario de verao desde 2019).
-- - o app tambem chama a funcao ao abrir a aba Chamada (reforco para o dia
--   em que o cron nao rodar). Ela so fecha dias que ja passaram, entao
--   qualquer conta logada pode chamar sem risco.


-- ------------------------------------------------------------ a funcao
create or replace function public.encerrar_chamadas_abertas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fechadas integer;
begin
  update public.chamadas c
  set estado = 'encerrada', encerrada_por = null, encerrada_em = now()
  where c.data < public.hoje()
    and c.estado = 'andamento';

  get diagnostics v_fechadas = row_count;
  return v_fechadas;
end;
$$;

revoke execute on function public.encerrar_chamadas_abertas() from public, anon;
grant execute on function public.encerrar_chamadas_abertas() to authenticated, service_role;


-- ------------------------------------------------------------ o agendamento
-- Em bloco separado: sem o pg_cron (ou sem permissao para liga-lo), a funcao
-- acima continua valendo e o app segue fechando as que sobraram.
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;

  if exists (select 1 from cron.job where jobname = 'adam-fechar-chamadas') then
    perform cron.unschedule('adam-fechar-chamadas');
  end if;

  perform cron.schedule(
    'adam-fechar-chamadas',
    '5 3 * * *',
    'select public.encerrar_chamadas_abertas()'
  );
exception
  when others then
    raise notice 'pg_cron indisponivel (%): a chamada aberta fecha quando alguem abrir o app. Ligue o pg_cron em Database > Extensions e rode este SQL de novo.', sqlerrm;
end;
$$;


-- ------------------------------------------------------------ conferencia
-- Fecha agora as que ja ficaram abertas e mostra quantas foram.
select public.encerrar_chamadas_abertas() as chamadas_fechadas_agora;
