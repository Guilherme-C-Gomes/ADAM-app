-- ADAM · o setor Jogo no banco: treinos com exercicios e avaliacao, a
-- biblioteca de exercicios, a escala semanal dos tecnicos e os jogos com
-- convocacao, comissao, tatica e placar.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), depois dos
-- SQLs de 02/10. Pode rodar de novo sem estragar nada.
--
-- Quem faz o que (perfis do app):
-- - treinador, coordenacao tecnica e ADM ("cuida do jogo"): planejam treino,
--   marcam exercicio feito, avaliam, cadastram exercicio e jogo, convocam;
-- - so coordenacao tecnica e ADM ("edita escala"): escala dos tecnicos e
--   comissao (do treino e do jogo), e apagar treino, jogo e exercicio;
-- - toda conta ativa le (a Secretaria usa nos relatorios).


-- ------------------------------------------------------------ quem cuida do jogo
create or replace function public.cuida_do_jogo()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.meu_perfil() in ('adm', 'coordenador', 'treinador'), false) $$;


-- ------------------------------------------------------------ treinos
alter table public.treinos add column if not exists encerrado_em timestamptz;
alter table public.treinos
  add column if not exists criado_por uuid default auth.uid()
  references public.usuarios (id) on delete set null;

drop policy if exists "treinos: coordenacao monta" on public.treinos;
drop policy if exists "treinos: jogo planeja" on public.treinos;
drop policy if exists "treinos: jogo atualiza" on public.treinos;
drop policy if exists "treinos: coordenacao apaga" on public.treinos;
create policy "treinos: jogo planeja" on public.treinos
  for insert to authenticated with check (public.cuida_do_jogo());
create policy "treinos: jogo atualiza" on public.treinos
  for update to authenticated
  using (public.cuida_do_jogo()) with check (public.cuida_do_jogo());
create policy "treinos: coordenacao apaga" on public.treinos
  for delete to authenticated using (public.edita_escala());


-- ------------------------------------------------------------ biblioteca de exercicios
-- E da ADAM, nao de quem cadastrou (R18): todos usam.
create table if not exists public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 1),
  categoria text not null
    check (categoria in ('Aquecimento', 'Fundamentos', 'Físico', 'Tático')),
  duracao_min integer not null default 10 check (duracao_min between 1 and 240),
  material text,
  descricao text,
  video text,
  criado_por uuid default auth.uid() references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table public.exercicios enable row level security;
drop policy if exists "exercicios: ler" on public.exercicios;
drop policy if exists "exercicios: jogo cadastra" on public.exercicios;
drop policy if exists "exercicios: jogo edita" on public.exercicios;
drop policy if exists "exercicios: coordenacao apaga" on public.exercicios;
create policy "exercicios: ler" on public.exercicios
  for select to authenticated using (public.usuario_ativo());
create policy "exercicios: jogo cadastra" on public.exercicios
  for insert to authenticated with check (public.cuida_do_jogo());
create policy "exercicios: jogo edita" on public.exercicios
  for update to authenticated
  using (public.cuida_do_jogo()) with check (public.cuida_do_jogo());
create policy "exercicios: coordenacao apaga" on public.exercicios
  for delete to authenticated using (public.edita_escala());


-- ------------------------------------------------------------ exercicios do treino
-- A lista planejada e a mesma que vai para o campo (R19).
create table if not exists public.treino_exercicios (
  treino_id uuid not null references public.treinos (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id) on delete cascade,
  ordem integer not null default 0,
  duracao_min integer not null check (duracao_min between 1 and 240),
  feito boolean not null default false,
  primary key (treino_id, exercicio_id)
);

alter table public.treino_exercicios enable row level security;
drop policy if exists "treino_exercicios: ler" on public.treino_exercicios;
drop policy if exists "treino_exercicios: jogo mantem" on public.treino_exercicios;
create policy "treino_exercicios: ler" on public.treino_exercicios
  for select to authenticated using (public.usuario_ativo());
create policy "treino_exercicios: jogo mantem" on public.treino_exercicios
  for all to authenticated using (public.cuida_do_jogo()) with check (public.cuida_do_jogo());


-- ------------------------------------------------------------ avaliacao do treino
-- Nada obrigatorio (R8): nota vazia e "nao respondeu", nao zero.
create table if not exists public.treino_avaliacoes (
  treino_id uuid primary key references public.treinos (id) on delete cascade,
  nota_treino smallint check (nota_treino between 0 and 5),
  entenderam smallint check (entenderam between 0 and 5),
  dificuldade smallint check (dificuldade between 0 and 5),
  observacoes text,
  avaliado_por uuid default auth.uid() references public.usuarios (id) on delete set null,
  avaliado_em timestamptz not null default now()
);

alter table public.treino_avaliacoes enable row level security;
drop policy if exists "avaliacoes: ler" on public.treino_avaliacoes;
drop policy if exists "avaliacoes: jogo mantem" on public.treino_avaliacoes;
create policy "avaliacoes: ler" on public.treino_avaliacoes
  for select to authenticated using (public.usuario_ativo());
create policy "avaliacoes: jogo mantem" on public.treino_avaliacoes
  for all to authenticated using (public.cuida_do_jogo()) with check (public.cuida_do_jogo());


-- ------------------------------------------------------------ escala semanal
-- Quem cobre cada horario da semana. Tecnico vazio e "a definir" (R7).
create table if not exists public.escala (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades (id) on delete cascade,
  -- 0 = domingo ... 6 = sabado
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora time not null,
  turma public.turma not null,
  tecnico_id uuid references public.usuarios (id) on delete set null,
  unique (unidade_id, dia_semana, hora, turma)
);

alter table public.escala enable row level security;
drop policy if exists "escala: ler" on public.escala;
drop policy if exists "escala: coordenacao monta" on public.escala;
create policy "escala: ler" on public.escala
  for select to authenticated using (public.usuario_ativo());
create policy "escala: coordenacao monta" on public.escala
  for all to authenticated using (public.edita_escala()) with check (public.edita_escala());


-- ------------------------------------------------------------ jogos
-- Categoria (Sub-14) decide quem pode ser convocado (R2); modalidade
-- (campo, society) decide quantos entram em campo (R3).
create table if not exists public.jogos (
  id uuid primary key default gen_random_uuid(),
  campeonato text,
  adversario text not null check (length(trim(adversario)) > 0),
  categoria text not null check (categoria ~ '^Sub-[0-9]+$'),
  modalidade text not null check (modalidade in ('campo', 'society')),
  data date not null,
  hora time not null,
  local text not null,
  formacao text,
  gols_adam smallint check (gols_adam >= 0),
  gols_adversario smallint check (gols_adversario >= 0),
  criado_por uuid default auth.uid() references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists jogos_data_idx on public.jogos (data);

alter table public.jogos enable row level security;
drop policy if exists "jogos: ler" on public.jogos;
drop policy if exists "jogos: jogo cadastra" on public.jogos;
drop policy if exists "jogos: jogo edita" on public.jogos;
drop policy if exists "jogos: coordenacao apaga" on public.jogos;
create policy "jogos: ler" on public.jogos
  for select to authenticated using (public.usuario_ativo());
create policy "jogos: jogo cadastra" on public.jogos
  for insert to authenticated with check (public.cuida_do_jogo());
create policy "jogos: jogo edita" on public.jogos
  for update to authenticated
  using (public.cuida_do_jogo()) with check (public.cuida_do_jogo());
create policy "jogos: coordenacao apaga" on public.jogos
  for delete to authenticated using (public.edita_escala());

create table if not exists public.jogo_convocados (
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  crianca_id uuid not null references public.criancas (id) on delete cascade,
  situacao text not null default 'banco' check (situacao in ('campo', 'banco')),
  primary key (jogo_id, crianca_id)
);

alter table public.jogo_convocados enable row level security;
drop policy if exists "convocados: ler" on public.jogo_convocados;
drop policy if exists "convocados: jogo convoca" on public.jogo_convocados;
create policy "convocados: ler" on public.jogo_convocados
  for select to authenticated using (public.usuario_ativo());
create policy "convocados: jogo convoca" on public.jogo_convocados
  for all to authenticated using (public.cuida_do_jogo()) with check (public.cuida_do_jogo());

create table if not exists public.jogo_comissao (
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  primary key (jogo_id, usuario_id)
);

alter table public.jogo_comissao enable row level security;
drop policy if exists "jogo_comissao: ler" on public.jogo_comissao;
drop policy if exists "jogo_comissao: coordenacao monta" on public.jogo_comissao;
create policy "jogo_comissao: ler" on public.jogo_comissao
  for select to authenticated using (public.usuario_ativo());
create policy "jogo_comissao: coordenacao monta" on public.jogo_comissao
  for all to authenticated using (public.edita_escala()) with check (public.edita_escala());
