-- ADAM · excluir e so da administracao do setor.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), depois do
-- 20261023120000_protecao_adm.sql. Pode rodar de novo sem estragar nada.
--
-- Regra da ONG: tudo o que se cria pode ser excluido, mas SO por quem
-- administra aquele setor. Cadastrar e editar continuam como estavam.
--
-- Quem administra (igual a administracaoDe em src/data/perfis.ts), sempre
-- com a conta ATIVA:
--   Jogo        acesso_total, ou coordenar_setor com funcao treinador
--   Estudo      acesso_total, ou coordenar_setor com funcao professor
--   Secretaria  acesso_total, ou coordenar_setor com funcao secretaria
--   Chamada     acesso_total, ou qualquer coordenar_setor
--   Unidades    so o ADM (acesso_total), como ja era
--
-- O que muda:
-- - treinos, exercicios, escala, jogos     -> exclui so public.administra_jogo()
-- - livros, livro_tipos, aulas, emprestimos -> exclui so public.administra_estudo()
-- - criancas                               -> exclui so public.administra_secretaria()
-- - chamadas (antes ninguem excluia)       -> exclui so public.administra_chamada()
-- - unidades                               -> exclui so public.e_adm()
-- Politicas "for all" dessas tabelas viram uma de cadastrar (insert), uma de
-- editar (update), com as MESMAS condicoes de antes, e uma de excluir.
-- A parte de leitura que o "for all" dava ja esta dentro da politica "ler"
-- de cada tabela (que e mais larga), entao nao precisa de outra.
--
-- As tabelas que se mexem DURANTE a edicao (exercicios do treino, comissao,
-- avaliacao, convocados, responsaveis, documentos, marcas e avulsos da
-- chamada...) NAO mudam: quem edita continua tirando e pondo linhas nelas.
--
-- Ligacoes (chaves estrangeiras):
-- - excluir o livro leva junto os emprestimos dele (antes dava erro);
-- - excluir a unidade continua dando erro se ela estiver em uso; a escala,
--   que antes sumia junto com a unidade, agora tambem segura a exclusao;
-- - tipo de livro em uso continua sem poder ser excluido.


begin;


-- ------------------------------------------------------------ quem administra
-- security definer: as politicas chamam estas funcoes, e elas precisam ler
-- usuarios sem cair de novo nas politicas de usuarios.

create or replace function public.administra_jogo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select u.permissao = 'acesso_total'
        or (u.permissao = 'coordenar_setor' and u.funcao = 'treinador')
    from public.usuarios u
    where u.id = auth.uid() and u.ativo
  ), false)
$$;

create or replace function public.administra_estudo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select u.permissao = 'acesso_total'
        or (u.permissao = 'coordenar_setor' and u.funcao = 'professor')
    from public.usuarios u
    where u.id = auth.uid() and u.ativo
  ), false)
$$;

create or replace function public.administra_secretaria()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select u.permissao = 'acesso_total'
        or (u.permissao = 'coordenar_setor' and u.funcao = 'secretaria')
    from public.usuarios u
    where u.id = auth.uid() and u.ativo
  ), false)
$$;

create or replace function public.administra_chamada()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select u.permissao in ('acesso_total', 'coordenar_setor')
    from public.usuarios u
    where u.id = auth.uid() and u.ativo
  ), false)
$$;

revoke execute on function public.administra_jogo() from public, anon;
revoke execute on function public.administra_estudo() from public, anon;
revoke execute on function public.administra_secretaria() from public, anon;
revoke execute on function public.administra_chamada() from public, anon;
grant execute on function public.administra_jogo() to authenticated;
grant execute on function public.administra_estudo() to authenticated;
grant execute on function public.administra_secretaria() to authenticated;
grant execute on function public.administra_chamada() to authenticated;


-- ------------------------------------------------------------ Jogo
-- treinos, exercicios e jogos ja tinham cadastrar e editar separados: so a
-- politica de apagar (antes edita_escala) e trocada.
drop policy if exists "treinos: coordenacao apaga" on public.treinos;
drop policy if exists "treinos: administracao do jogo exclui" on public.treinos;
create policy "treinos: administracao do jogo exclui" on public.treinos
  for delete to authenticated using (public.administra_jogo());

drop policy if exists "exercicios: coordenacao apaga" on public.exercicios;
drop policy if exists "exercicios: administracao do jogo exclui" on public.exercicios;
create policy "exercicios: administracao do jogo exclui" on public.exercicios
  for delete to authenticated using (public.administra_jogo());

drop policy if exists "jogos: coordenacao apaga" on public.jogos;
drop policy if exists "jogos: administracao do jogo exclui" on public.jogos;
create policy "jogos: administracao do jogo exclui" on public.jogos
  for delete to authenticated using (public.administra_jogo());

-- escala: o "for all" da coordenacao vira cadastrar + editar + excluir
drop policy if exists "escala: coordenacao monta" on public.escala;
drop policy if exists "escala: coordenacao cadastra" on public.escala;
drop policy if exists "escala: coordenacao edita" on public.escala;
drop policy if exists "escala: administracao do jogo exclui" on public.escala;
create policy "escala: coordenacao cadastra" on public.escala
  for insert to authenticated with check (public.edita_escala());
create policy "escala: coordenacao edita" on public.escala
  for update to authenticated
  using (public.edita_escala()) with check (public.edita_escala());
create policy "escala: administracao do jogo exclui" on public.escala
  for delete to authenticated using (public.administra_jogo());


-- ------------------------------------------------------------ Estudo
drop policy if exists "livros: estudo mantem" on public.livros;
drop policy if exists "livros: estudo cadastra" on public.livros;
drop policy if exists "livros: estudo edita" on public.livros;
drop policy if exists "livros: administracao do estudo exclui" on public.livros;
create policy "livros: estudo cadastra" on public.livros
  for insert to authenticated with check (public.cuida_do_estudo());
create policy "livros: estudo edita" on public.livros
  for update to authenticated
  using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());
create policy "livros: administracao do estudo exclui" on public.livros
  for delete to authenticated using (public.administra_estudo());

drop policy if exists "tipos: estudo mantem" on public.livro_tipos;
drop policy if exists "tipos: estudo cadastra" on public.livro_tipos;
drop policy if exists "tipos: estudo edita" on public.livro_tipos;
drop policy if exists "tipos: administracao do estudo exclui" on public.livro_tipos;
create policy "tipos: estudo cadastra" on public.livro_tipos
  for insert to authenticated with check (public.cuida_do_estudo());
create policy "tipos: estudo edita" on public.livro_tipos
  for update to authenticated
  using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());
create policy "tipos: administracao do estudo exclui" on public.livro_tipos
  for delete to authenticated using (public.administra_estudo());

drop policy if exists "aulas: estudo mantem" on public.aulas;
drop policy if exists "aulas: estudo cadastra" on public.aulas;
drop policy if exists "aulas: estudo edita" on public.aulas;
drop policy if exists "aulas: administracao do estudo exclui" on public.aulas;
create policy "aulas: estudo cadastra" on public.aulas
  for insert to authenticated with check (public.cuida_do_estudo());
create policy "aulas: estudo edita" on public.aulas
  for update to authenticated
  using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());
create policy "aulas: administracao do estudo exclui" on public.aulas
  for delete to authenticated using (public.administra_estudo());

drop policy if exists "emprestimos: estudo mantem" on public.emprestimos;
drop policy if exists "emprestimos: estudo cadastra" on public.emprestimos;
drop policy if exists "emprestimos: estudo edita" on public.emprestimos;
drop policy if exists "emprestimos: administracao do estudo exclui" on public.emprestimos;
create policy "emprestimos: estudo cadastra" on public.emprestimos
  for insert to authenticated with check (public.cuida_do_estudo());
create policy "emprestimos: estudo edita" on public.emprestimos
  for update to authenticated
  using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());
create policy "emprestimos: administracao do estudo exclui" on public.emprestimos
  for delete to authenticated using (public.administra_estudo());


-- ------------------------------------------------------------ Secretaria
-- ler, cadastrar e editar (ve_dados_sensiveis) ficam como estao.
drop policy if exists "criancas: so o adm exclui" on public.criancas;
drop policy if exists "criancas: administracao da secretaria exclui" on public.criancas;
create policy "criancas: administracao da secretaria exclui" on public.criancas
  for delete to authenticated using (public.administra_secretaria());


-- ------------------------------------------------------------ Chamada
-- Comecar, encerrar e corrigir continuam pelas funcoes do esquema inicial.
-- Excluir a chamada leva junto participantes, marcas, avulsos e correcoes.
drop policy if exists "chamadas: coordenacao exclui" on public.chamadas;
create policy "chamadas: coordenacao exclui" on public.chamadas
  for delete to authenticated using (public.administra_chamada());


-- ------------------------------------------------------------ unidades
drop policy if exists "unidades: adm mantem" on public.unidades;
drop policy if exists "unidades: adm cadastra" on public.unidades;
drop policy if exists "unidades: adm edita" on public.unidades;
drop policy if exists "unidades: so o adm exclui" on public.unidades;
create policy "unidades: adm cadastra" on public.unidades
  for insert to authenticated with check (public.e_adm());
create policy "unidades: adm edita" on public.unidades
  for update to authenticated
  using (public.e_adm()) with check (public.e_adm());
create policy "unidades: so o adm exclui" on public.unidades
  for delete to authenticated using (public.e_adm());


-- ------------------------------------------------------------ ligacoes
-- Cada ligacao e refeita com o nome padrao do Postgres (<tabela>_<coluna>_fkey).
-- Antes de criar, sai qualquer chave da mesma tabela para o mesmo pai, seja
-- qual for o nome, para rodar de novo sem duplicar.
--   emprestimos.livro_id -> livros:   excluir o livro leva os emprestimos
--   escala.unidade_id    -> unidades: unidade com escala nao pode ser excluida
--                                     (antes a escala sumia junto)
do $$
declare
  ligacao record;
  antiga record;
begin
  for ligacao in
    select * from (values
      ('emprestimos', 'livro_id', 'livros', 'on delete cascade'),
      ('escala', 'unidade_id', 'unidades', 'on delete no action')
    ) as t (tabela, coluna, pai, acao)
  loop
    for antiga in
      select c.conname
      from pg_catalog.pg_constraint c
      where c.contype = 'f'
        and c.conrelid = format('public.%I', ligacao.tabela)::regclass
        and c.confrelid = format('public.%I', ligacao.pai)::regclass
    loop
      execute format('alter table public.%I drop constraint %I', ligacao.tabela, antiga.conname);
    end loop;

    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I (id) %s',
      ligacao.tabela, ligacao.tabela || '_' || ligacao.coluna || '_fkey',
      ligacao.coluna, ligacao.pai, ligacao.acao
    );
  end loop;
end $$;

-- Ja estavam certas e ficam como estao:
-- - criancas, chamadas, treinos e aulas -> unidades: sem acao (unidade em uso
--   nao sai);
-- - livros.tipo -> livro_tipos: so atualiza em cascata (tipo em uso nao sai);
-- - tudo o que aponta para criancas, treinos, exercicios, jogos e chamadas ja
--   sai junto (on delete cascade).


-- ------------------------------------------------------------ arquivos
-- Capa do livro (capas), material da aula (materiais) e ficha da crianca
-- (fichas) sao apagados pelo app ao excluir. As politicas de apagar ja
-- cobrem quem administra cada setor e nao mudam:
--   capas e materiais: cuida_do_estudo()     (inclui administra_estudo())
--   fichas:            ve_dados_sensiveis()  (inclui administra_secretaria())


commit;


-- ------------------------------------------------------------ conferencia
-- Lista o que ficou valendo nas tabelas que tem exclusao restrita.
select tablename as tabela, cmd as acao, policyname as politica,
       coalesce(qual, with_check) as condicao
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('treinos', 'exercicios', 'escala', 'jogos',
                    'livros', 'livro_tipos', 'aulas', 'emprestimos',
                    'criancas', 'chamadas', 'unidades')
order by tablename,
         case cmd when 'SELECT' then 1 when 'INSERT' then 2 when 'UPDATE' then 3
                  when 'DELETE' then 4 else 5 end,
         policyname;
