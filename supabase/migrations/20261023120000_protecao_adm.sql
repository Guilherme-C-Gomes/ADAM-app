-- ADAM · protecao das contas de coordenacao e da conta de suporte.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), depois do
-- 20261015120000_backup_e_saidas.sql. Pode rodar de novo sem estragar nada.
--
-- Tres regras, conferidas no banco a cada UPDATE ou DELETE em `usuarios`
-- (valem pelo app, pela API e pela funcao criar-usuario):
--
-- 1. O ADAM nunca fica sem coordenacao: e recusada qualquer mudanca que
--    deixaria zero contas ATIVAS com acesso total (rebaixar, desativar ou
--    excluir a ultima). Vale para todo mundo, ate para o SQL Editor.
--    Codigo AD001, hint 'ultimo_adm'.
--
-- 2. Quem esta logado nao muda a propria permissao, funcao ou acesso (ativo)
--    nem apaga a propria linha. Nome, e-mail e foto da propria conta seguem
--    livres. Codigo AD002, hint 'propria_conta'.
--
-- 3. A conta de suporte (public.conta_protegida) so e alterada por ela mesma:
--    nenhuma OUTRA conta logada muda a permissao, funcao, acesso ou e-mail
--    dela, nem a exclui. Codigo AD003, hint 'conta_suporte'.
--
-- Chamadas SEM usuario logado (auth.uid() nulo: a chave secreta usada pela
-- funcao criar-usuario, o SQL Editor, o Auth apagando a conta) passam pelas
-- regras 2 e 3; a regra 1 vale sempre. Por isso a funcao criar-usuario confere
-- a conta de suporte por conta propria antes de excluir ou trocar senha.


-- ------------------------------------------------------------ conta de suporte
-- O e-mail da conta de suporte mora SO aqui. Confere a linha de `usuarios` e
-- tambem o e-mail de login (auth.users), para a protecao nao cair se um dos
-- dois for trocado.
create or replace function public.conta_protegida(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = p_id and lower(u.email) = 'suporte.ti@adam.ong.br'
  ) or exists (
    select 1 from auth.users a
    where a.id = p_id and lower(a.email) = 'suporte.ti@adam.ong.br'
  )
$$;

revoke execute on function public.conta_protegida(uuid) from public, anon, authenticated;
grant execute on function public.conta_protegida(uuid) to service_role;


-- ------------------------------------------------------------ o gatilho
create or replace function public.proteger_usuarios()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := auth.uid();
  era_adm boolean := old.ativo and old.permissao = 'acesso_total';
  segue_adm boolean := false;
  -- DELETE conta como mexer em tudo
  mexe_no_acesso boolean := true;
  mexe_no_email boolean := true;
begin
  if tg_op = 'UPDATE' then
    segue_adm := new.ativo and new.permissao = 'acesso_total' and new.id = old.id;
    mexe_no_acesso := new.permissao is distinct from old.permissao
      or new.funcao is distinct from old.funcao
      or new.ativo is distinct from old.ativo
      or new.id is distinct from old.id;
    mexe_no_email := new.email is distinct from old.email;
  end if;

  -- regra 2: a propria conta, logada, nao mexe no proprio acesso
  if quem is not null and quem = old.id and mexe_no_acesso then
    raise exception using
      errcode = 'AD002',
      message = case when tg_op = 'DELETE'
        then 'Você não pode excluir a própria conta.'
        else 'Você não pode mudar a sua própria permissão, função ou acesso.'
      end,
      hint = 'propria_conta';
  end if;

  -- regra 3: a conta de suporte so e alterada por ela mesma
  if quem is not null and quem <> old.id
     and (mexe_no_acesso or mexe_no_email)
     and public.conta_protegida(old.id) then
    raise exception using
      errcode = 'AD003',
      message = 'A conta de suporte só pode ser alterada por ela mesma.',
      hint = 'conta_suporte';
  end if;

  -- regra 1: nunca ficar sem coordenacao ativa
  if era_adm and not segue_adm then
    -- Uma trava por vez: dois rebaixamentos ao mesmo tempo (A tira B e B tira
    -- A) nao passam os dois. O segundo espera o primeiro terminar e, como
    -- cada consulta aqui le o que ja foi gravado (read committed), ve que a
    -- outra conta ja nao e mais coordenacao. A trava e "advisory" (e nao
    -- LOCK TABLE ou FOR UPDATE nas linhas) para nao dar deadlock com a linha
    -- que cada um ja tem presa, e so e pedida quando um adm ativo deixa de ser.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.usuarios:ultimo_adm'));

    if not exists (
      select 1 from public.usuarios u
      where u.ativo and u.permissao = 'acesso_total' and u.id <> old.id
    ) then
      raise exception using
        errcode = 'AD001',
        message = 'Esta é a única conta de coordenação ativa. Dê acesso total a outra pessoa antes.',
        hint = 'ultimo_adm';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.proteger_usuarios() from public, anon, authenticated;

drop trigger if exists proteger_usuarios on public.usuarios;
create trigger proteger_usuarios
  before update or delete on public.usuarios
  for each row execute function public.proteger_usuarios();
