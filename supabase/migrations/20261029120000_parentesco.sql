-- ADAM · parentesco escrito do responsavel.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty). Pode rodar
-- de novo sem estragar nada.
--
-- A ficha deixa de ter "mae" e "pai" fixos: sao o Responsavel 1 e o
-- Responsavel 2, cada um com o parentesco escrito (mae, avo, tia, padrasto...).
-- A coluna `relacao` (enum) fica, preenchida pelo app a partir do parentesco
-- (mae/pai/avo ou outro), para nada que ja le dela quebrar.

alter table public.responsaveis
  add column if not exists parentesco text;

alter table public.responsaveis
  drop constraint if exists responsaveis_parentesco_tamanho;
alter table public.responsaveis
  add constraint responsaveis_parentesco_tamanho
  check (parentesco is null or char_length(parentesco) between 1 and 40);

-- quem ja estava cadastrado ganha o parentesco que tinha
update public.responsaveis
set parentesco = case relacao
  when 'mae' then 'Mãe'
  when 'pai' then 'Pai'
  when 'avo' then 'Avó'
end
where parentesco is null and relacao <> 'outro';

-- o numero principal (o que o professor ve) passa a trazer o parentesco
drop function if exists public.contato_principal(uuid);
create function public.contato_principal(p_crianca uuid)
returns table (nome text, relacao public.relacao, parentesco text, telefone text, whatsapp boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.nome, r.relacao, r.parentesco, r.telefone, r.whatsapp
  from public.responsaveis r
  where r.crianca_id = p_crianca
    and r.principal
    and (
      public.ve_dados_sensiveis()
      or (public.meu_perfil() = 'professor' and exists (
            select 1 from public.emprestimos e
            where e.crianca_id = p_crianca and e.devolvido_em is null))
    )
$$;

revoke execute on function public.contato_principal(uuid) from public, anon;
grant execute on function public.contato_principal(uuid) to authenticated;
