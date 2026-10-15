-- ADAM · Estudo no banco e foto de cada usuario.
--
-- Rodar UMA vez no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty),
-- depois do esquema inicial. Pode rodar de novo sem estragar nada.


-- ------------------------------------------------------------ tipos de livro
-- O tipo vale para o acervo inteiro (e o filtro da biblioteca). Mora numa
-- tabela para um tipo novo existir mesmo antes de ter livro nele.
create table if not exists public.livro_tipos (
  nome text primary key check (length(trim(nome)) > 0),
  criado_em timestamptz not null default now()
);

insert into public.livro_tipos (nome)
values ('Bíblia infantil'), ('Devocional'), ('História bíblica'), ('Didático'),
       ('Literatura infantil')
on conflict (nome) do nothing;

-- os tipos de livros que ja existam entram na lista antes da chave
insert into public.livro_tipos (nome)
select distinct tipo from public.livros
on conflict (nome) do nothing;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'livros_tipo_fk') then
    alter table public.livros
      add constraint livros_tipo_fk foreign key (tipo)
      references public.livro_tipos (nome) on update cascade;
  end if;
end $$;

alter table public.livro_tipos enable row level security;
drop policy if exists "tipos: ler" on public.livro_tipos;
create policy "tipos: ler" on public.livro_tipos
  for select to authenticated using (public.usuario_ativo());
drop policy if exists "tipos: estudo mantem" on public.livro_tipos;
create policy "tipos: estudo mantem" on public.livro_tipos
  for all to authenticated using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());


-- ------------------------------------------------------------ arquivos do Estudo
-- Material das aulas (PDF, foto): privado, toda a equipe le, so o Estudo
-- (ADM e professor) envia e apaga.
insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', false)
on conflict (id) do nothing;

drop policy if exists "materiais: ler" on storage.objects;
create policy "materiais: ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'materiais' and public.usuario_ativo());
drop policy if exists "materiais: estudo envia" on storage.objects;
create policy "materiais: estudo envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais' and public.cuida_do_estudo());
drop policy if exists "materiais: estudo apaga" on storage.objects;
create policy "materiais: estudo apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais' and public.cuida_do_estudo());

-- capa trocada: a antiga pode sair do armazenamento
drop policy if exists "capas: estudo apaga" on storage.objects;
create policy "capas: estudo apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'capas' and public.cuida_do_estudo());


-- ------------------------------------------------------------ foto do usuario
alter table public.usuarios add column if not exists foto_path text;

-- Cada um envia e apaga SO dentro da propria pasta: perfis/<id da conta>/...
-- Toda a equipe ativa ve as fotos (escala, chamada, aulas).
insert into storage.buckets (id, name, public)
values ('perfis', 'perfis', false)
on conflict (id) do nothing;

drop policy if exists "perfis: ler" on storage.objects;
create policy "perfis: ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'perfis' and public.usuario_ativo());
drop policy if exists "perfis: a propria envia" on storage.objects;
create policy "perfis: a propria envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'perfis'
    and public.usuario_ativo()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "perfis: a propria apaga" on storage.objects;
create policy "perfis: a propria apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = auth.uid()::text);

-- A linha de `usuarios` so o ADM edita (funcao e permissao moram nela).
-- A foto e a excecao: esta funcao troca SO o foto_path da propria conta, e
-- so para um arquivo da propria pasta.
create or replace function public.definir_minha_foto(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_ativo() then
    raise exception 'conta sem acesso';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'a foto precisa estar na sua pasta';
  end if;
  update public.usuarios set foto_path = p_path where id = auth.uid();
end;
$$;

revoke execute on function public.definir_minha_foto(text) from public, anon;
grant execute on function public.definir_minha_foto(text) to authenticated;
