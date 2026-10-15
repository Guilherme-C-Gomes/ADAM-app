-- ADAM · excluir usuario e excluir ficha de crianca (so o ADM).
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), DEPOIS do
-- 20261002120000_estudo_e_fotos.sql. Pode rodar de novo sem estragar nada.


-- ------------------------------------------------------------ usuario excluido
-- Excluir a conta apaga a linha em `usuarios`. O que estava atribuido a
-- pessoa nao some: fica SEM atribuicao (null) — a aula fica sem professor,
-- o treino sem responsavel, a chamada sem "quem abriu". So as listas de
-- quem participou (comissao do treino, quem marcou junto) perdem a pessoa.

-- quem fez o registro deixa de ser obrigatorio, para poder ficar vazio
alter table public.chamadas alter column iniciada_por drop not null;
alter table public.chamada_marcas alter column marcado_por drop not null;
alter table public.chamada_avulsos alter column criado_por drop not null;
alter table public.chamada_correcoes alter column corrigida_por drop not null;
alter table public.emprestimos alter column emprestado_por drop not null;

do $$
declare
  -- tabela, coluna, o que acontece quando a pessoa sai
  ligacao record;
begin
  for ligacao in
    select * from (values
      ('chamadas', 'iniciada_por', 'set null'),
      ('chamadas', 'encerrada_por', 'set null'),
      ('chamada_participantes', 'usuario_id', 'cascade'),
      ('chamada_marcas', 'marcado_por', 'set null'),
      ('chamada_avulsos', 'criado_por', 'set null'),
      ('chamada_correcoes', 'corrigida_por', 'set null'),
      ('treinos', 'responsavel_id', 'set null'),
      ('treino_comissao', 'usuario_id', 'cascade'),
      ('aulas', 'professor_id', 'set null'),
      ('emprestimos', 'emprestado_por', 'set null')
    ) as t (tabela, coluna, acao)
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      ligacao.tabela, ligacao.tabela || '_' || ligacao.coluna || '_fkey'
    );
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.usuarios (id) on delete %s',
      ligacao.tabela, ligacao.tabela || '_' || ligacao.coluna || '_fkey', ligacao.coluna, ligacao.acao
    );
  end loop;
end $$;


-- ------------------------------------------------------------ ficha excluida
-- Excluir a crianca leva junto o que e dela: responsaveis, documentos,
-- presencas e emprestimos (o livro volta a contar na estante).
alter table public.emprestimos drop constraint if exists emprestimos_crianca_id_fkey;
alter table public.emprestimos
  add constraint emprestimos_crianca_id_fkey foreign key (crianca_id)
  references public.criancas (id) on delete cascade;

-- A Secretaria cadastra e edita; EXCLUIR e so do ADM.
drop policy if exists "criancas: dado sensivel" on public.criancas;
drop policy if exists "criancas: ler" on public.criancas;
drop policy if exists "criancas: cadastrar" on public.criancas;
drop policy if exists "criancas: editar" on public.criancas;
drop policy if exists "criancas: so o adm exclui" on public.criancas;

create policy "criancas: ler" on public.criancas
  for select to authenticated using (public.ve_dados_sensiveis());
create policy "criancas: cadastrar" on public.criancas
  for insert to authenticated with check (public.ve_dados_sensiveis());
create policy "criancas: editar" on public.criancas
  for update to authenticated
  using (public.ve_dados_sensiveis()) with check (public.ve_dados_sensiveis());
create policy "criancas: so o adm exclui" on public.criancas
  for delete to authenticated using (public.e_adm());
