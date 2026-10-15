-- =============================================================================
-- ADAM · esquema inicial
--
-- Como aplicar: Supabase do ADAM > SQL Editor > New query > colar este arquivo
-- inteiro > Run. Roda uma vez so. (Com a CLI: `npx supabase db push`.)
--
-- Tres regras atravessam o arquivo inteiro:
--
-- 1. O PERFIL sai de funcao + permissao, como em Ajustes:
--      acesso_total                  -> adm          (ve e faz tudo)
--      secretaria                    -> secretaria   (cadastros e dados)
--      treinador + coordenar_setor   -> coordenador  (Jogo; monta escala)
--      treinador                     -> treinador    (Jogo; so ve a escala)
--      professor                     -> professor    (Estudo)
--
-- 2. DADO SENSIVEL (ficha, responsaveis, documentos, fotos) e so de ADM e
--    Secretaria, e a regra mora AQUI, no banco (Row Level Security). A chave
--    publishable vai dentro do app e qualquer um pode extrai-la; sem RLS ela
--    leria o banco inteiro. Treinador e professor veem nome e idade por uma
--    funcao propria (criancas_basico). A unica excecao e o numero PRINCIPAL
--    do responsavel, que o professor ve so de quem esta com livro emprestado.
--
-- 3. A CHAMADA e uma por turma, unidade e dia, feita a varias maos. Cada marca
--    guarda quem marcou; qualquer um que esteja marcando encerra, e so a
--    chamada encerrada conta nos numeros. Encerrada, ela se corrige ate o fim
--    do dia (horario de Brasilia), e fica registrado quem corrigiu.
-- =============================================================================


-- ----------------------------------------------------------------- tipos
create type public.funcao as enum ('treinador', 'professor', 'secretaria');
create type public.permissao as enum ('ver_registrar', 'coordenar_setor', 'acesso_total');
create type public.turma as enum ('pequenos', 'maiores');
create type public.relacao as enum ('mae', 'pai', 'avo', 'outro');
create type public.posicao as enum ('goleiro', 'defesa', 'meio', 'ataque');
create type public.estado_chamada as enum ('andamento', 'encerrada');


-- ----------------------------------------------------------------- base
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

-- Quem usa o app. Uma linha por conta do Supabase Auth.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  -- null = so administra (a Coordenacao nao precisa de funcao de campo)
  funcao public.funcao,
  permissao public.permissao not null default 'ver_registrar',
  -- conta nova nasce INATIVA: quem libera o acesso e o ADM
  ativo boolean not null default false,
  criado_em timestamptz not null default now()
);


-- ----------------------------------------------------------------- ajudantes
-- "Hoje" no horario de Brasilia. O servidor roda em UTC: sem isto, a chamada
-- das 21h de quarta cairia na quinta.
create function public.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- R1: a turma sai da idade. 12 anos ou mais vai para os Maiores.
create function public.turma_da_idade(nascimento date)
returns public.turma
language sql
stable
set search_path = ''
as $$
  select case
    when extract(year from age(public.hoje(), nascimento)) >= 12 then 'maiores'::public.turma
    else 'pequenos'::public.turma
  end
$$;

-- O perfil de quem esta logado; null se a conta nao existe ou esta inativa.
-- security definer: as politicas abaixo chamam esta funcao, e ela precisa ler
-- usuarios sem cair de novo nas politicas de usuarios.
create function public.meu_perfil()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.permissao = 'acesso_total' then 'adm'
    when u.funcao = 'secretaria' then 'secretaria'
    when u.funcao = 'treinador' and u.permissao = 'coordenar_setor' then 'coordenador'
    when u.funcao = 'treinador' then 'treinador'
    when u.funcao = 'professor' then 'professor'
  end
  from public.usuarios u
  where u.id = auth.uid() and u.ativo
$$;

create function public.usuario_ativo()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.meu_perfil() is not null $$;

create function public.e_adm()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.meu_perfil() = 'adm', false) $$;

-- Ficha, responsaveis, documentos, fotos, estatistica.
create function public.ve_dados_sensiveis()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.meu_perfil() in ('adm', 'secretaria'), false) $$;

-- Escala dos tecnicos e comissao. O treinador so ve.
create function public.edita_escala()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.meu_perfil() in ('adm', 'coordenador'), false) $$;

-- Biblioteca e devocional.
create function public.cuida_do_estudo()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.meu_perfil() in ('adm', 'professor'), false) $$;


-- ----------------------------------------------------------------- criancas
create table public.criancas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nascimento date not null,
  unidade_id uuid not null references public.unidades (id),
  -- R4: opcional de proposito; crianca que acabou de chegar nao tem posicao
  posicao public.posicao,
  foto_path text,
  observacao text,
  desde date not null default public.hoje(),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
create index criancas_unidade_idx on public.criancas (unidade_id);

-- Mae, pai, avo... e UM numero principal por crianca (quase sempre o da mae):
-- dele saem a convocacao e a cobranca de livro.
create table public.responsaveis (
  id uuid primary key default gen_random_uuid(),
  crianca_id uuid not null references public.criancas (id) on delete cascade,
  nome text not null,
  relacao public.relacao not null,
  telefone text not null,
  whatsapp boolean not null default true,
  principal boolean not null default false,
  criado_em timestamptz not null default now()
);
create index responsaveis_crianca_idx on public.responsaveis (crianca_id);
create unique index responsaveis_um_principal on public.responsaveis (crianca_id) where principal;

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  crianca_id uuid not null references public.criancas (id) on delete cascade,
  tipo text not null,
  arquivo_path text,
  entregue_em date,
  criado_em timestamptz not null default now(),
  unique (crianca_id, tipo)
);

-- Nome e idade de todas as criancas ativas, para a chamada e a escalacao.
-- E a porta de treinador e professor: a tabela criancas inteira eles nao leem.
create function public.criancas_basico()
returns table (
  id uuid,
  nome text,
  idade integer,
  turma public.turma,
  unidade_id uuid,
  posicao public.posicao
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         c.nome,
         extract(year from age(public.hoje(), c.nascimento))::integer,
         public.turma_da_idade(c.nascimento),
         c.unidade_id,
         c.posicao
  from public.criancas c
  where c.ativa and public.usuario_ativo()
  order by c.nome
$$;


-- ----------------------------------------------------------------- chamada
create table public.chamadas (
  id uuid primary key default gen_random_uuid(),
  data date not null default public.hoje(),
  unidade_id uuid not null references public.unidades (id),
  turma public.turma not null,
  estado public.estado_chamada not null default 'andamento',
  iniciada_por uuid not null references public.usuarios (id),
  iniciada_em timestamptz not null default now(),
  encerrada_por uuid references public.usuarios (id),
  encerrada_em timestamptz,
  -- uma so por turma, unidade e dia: e isto que impede duas verdades
  unique (data, unidade_id, turma)
);

-- Quem esta marcando (ou marcou) aquela chamada.
create table public.chamada_participantes (
  chamada_id uuid not null references public.chamadas (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id),
  entrou_em timestamptz not null default now(),
  primary key (chamada_id, usuario_id)
);

-- A presenca e a linha existir. Sem linha = nao marcado = falta ao encerrar.
create table public.chamada_marcas (
  chamada_id uuid not null references public.chamadas (id) on delete cascade,
  crianca_id uuid not null references public.criancas (id) on delete cascade,
  marcado_por uuid not null default auth.uid() references public.usuarios (id),
  marcado_em timestamptz not null default now(),
  primary key (chamada_id, crianca_id)
);
create index chamada_marcas_crianca_idx on public.chamada_marcas (crianca_id);

-- Crianca que veio e ainda nao tem ficha: o nome conta no mes, a Secretaria
-- cadastra depois.
create table public.chamada_avulsos (
  id uuid primary key default gen_random_uuid(),
  chamada_id uuid not null references public.chamadas (id) on delete cascade,
  nome text not null,
  criado_por uuid not null default auth.uid() references public.usuarios (id),
  criado_em timestamptz not null default now()
);

create table public.chamada_correcoes (
  id uuid primary key default gen_random_uuid(),
  chamada_id uuid not null references public.chamadas (id) on delete cascade,
  corrigida_por uuid not null default auth.uid() references public.usuarios (id),
  corrigida_em timestamptz not null default now()
);

-- Pode mexer nas marcas? Marcando junto, ou corrigindo a encerrada de hoje.
create function public.pode_marcar(p_chamada uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.usuario_ativo() and exists (
    select 1
    from public.chamadas c
    where c.id = p_chamada
      and (
        (c.estado = 'andamento' and exists (
           select 1 from public.chamada_participantes p
           where p.chamada_id = c.id and p.usuario_id = auth.uid()))
        or (c.estado = 'encerrada' and c.data = public.hoje())
      )
  )
$$;

-- Comecar a chamada (se ninguem comecou) ou entrar numa em andamento.
-- Devolve o id. Encerrada, so devolve o id: entrar nela e para corrigir.
create function public.entrar_na_chamada(p_unidade uuid, p_turma public.turma)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_estado text;
begin
  if not public.usuario_ativo() then
    raise exception 'acesso inativo';
  end if;

  insert into public.chamadas (unidade_id, turma, iniciada_por)
  values (p_unidade, p_turma, auth.uid())
  on conflict (data, unidade_id, turma) do nothing;

  select c.id, c.estado::text into v_id, v_estado
  from public.chamadas c
  where c.data = public.hoje() and c.unidade_id = p_unidade and c.turma = p_turma;

  if v_estado = 'andamento' then
    insert into public.chamada_participantes (chamada_id, usuario_id)
    values (v_id, auth.uid())
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

-- Qualquer um que esteja marcando encerra. E aqui que a chamada "sobe".
create function public.encerrar_chamada(p_chamada uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chamadas c
  set estado = 'encerrada', encerrada_por = auth.uid(), encerrada_em = now()
  where c.id = p_chamada
    and c.estado = 'andamento'
    and public.usuario_ativo()
    and exists (
      select 1 from public.chamada_participantes p
      where p.chamada_id = c.id and p.usuario_id = auth.uid()
    );

  if not found then
    raise exception 'so quem esta marcando encerra uma chamada em andamento';
  end if;
end;
$$;

-- A correcao do dia fica registrada com o nome de quem corrigiu.
create function public.registrar_correcao(p_chamada uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.chamadas c
    where c.id = p_chamada and c.estado = 'encerrada' and c.data = public.hoje()
  ) or not public.usuario_ativo() then
    raise exception 'so a chamada encerrada de hoje pode ser corrigida';
  end if;

  insert into public.chamada_correcoes (chamada_id) values (p_chamada);
end;
$$;


-- ----------------------------------------------------------------- jogo
-- Escala dos tecnicos: responsavel null e o "a definir" (R7).
create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora time not null,
  unidade_id uuid not null references public.unidades (id),
  turma public.turma not null,
  local text,
  responsavel_id uuid references public.usuarios (id),
  criado_em timestamptz not null default now()
);
create index treinos_data_idx on public.treinos (data);

create table public.treino_comissao (
  treino_id uuid not null references public.treinos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id),
  primary key (treino_id, usuario_id)
);


-- ----------------------------------------------------------------- estudo
create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora time not null,
  unidade_id uuid not null references public.unidades (id),
  turma public.turma not null default 'pequenos',
  professor_id uuid references public.usuarios (id),
  historia text,
  -- [{ "nome": "...pdf", "path": "..." }]
  material jsonb not null default '[]',
  levar text[] not null default '{}',
  criado_em timestamptz not null default now()
);

create table public.livros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null,
  exemplares integer not null default 1 check (exemplares > 0),
  capa_path text,
  criado_em timestamptz not null default now()
);

create table public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  livro_id uuid not null references public.livros (id),
  crianca_id uuid not null references public.criancas (id),
  emprestado_por uuid not null default auth.uid() references public.usuarios (id),
  emprestado_em date not null default public.hoje(),
  entrega date not null,
  devolvido_em date,
  criado_em timestamptz not null default now()
);
create index emprestimos_crianca_idx on public.emprestimos (crianca_id);
create index emprestimos_abertos_idx on public.emprestimos (livro_id) where devolvido_em is null;

-- O numero principal da familia, para cobrar livro atrasado. ADM e Secretaria
-- veem de qualquer crianca; o professor, SO de quem esta com livro emprestado.
create function public.contato_principal(p_crianca uuid)
returns table (nome text, relacao public.relacao, telefone text, whatsapp boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.nome, r.relacao, r.telefone, r.whatsapp
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


-- ----------------------------------------------------------------- conta nova
-- Toda conta criada no Auth ganha a sua linha em usuarios, INATIVA e sem
-- funcao: o ADM define a funcao e a permissao e libera. Metadado enviado por
-- quem se cadastra nao e confiavel, entao so o nome e aproveitado.
create function public.criar_usuario_da_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_conta
  after insert on auth.users
  for each row execute function public.criar_usuario_da_conta();


-- ----------------------------------------------------------------- RLS
alter table public.unidades enable row level security;
alter table public.usuarios enable row level security;
alter table public.criancas enable row level security;
alter table public.responsaveis enable row level security;
alter table public.documentos enable row level security;
alter table public.chamadas enable row level security;
alter table public.chamada_participantes enable row level security;
alter table public.chamada_marcas enable row level security;
alter table public.chamada_avulsos enable row level security;
alter table public.chamada_correcoes enable row level security;
alter table public.treinos enable row level security;
alter table public.treino_comissao enable row level security;
alter table public.aulas enable row level security;
alter table public.livros enable row level security;
alter table public.emprestimos enable row level security;

-- unidades: todos leem, o ADM mantem
create policy "unidades: ler" on public.unidades
  for select to authenticated using (public.usuario_ativo());
create policy "unidades: adm mantem" on public.unidades
  for all to authenticated using (public.e_adm()) with check (public.e_adm());

-- usuarios: cada um ve a propria linha; ativos veem a equipe (escala,
-- comissao, "Rafael esta marcando"); so o ADM cria, muda permissao e desativa
create policy "usuarios: ver a propria conta" on public.usuarios
  for select to authenticated using (id = auth.uid());
create policy "usuarios: ver a equipe" on public.usuarios
  for select to authenticated using (public.usuario_ativo());
create policy "usuarios: adm mantem" on public.usuarios
  for all to authenticated using (public.e_adm()) with check (public.e_adm());

-- ficha da crianca: so ADM e Secretaria, para ler e para escrever
create policy "criancas: dado sensivel" on public.criancas
  for all to authenticated
  using (public.ve_dados_sensiveis()) with check (public.ve_dados_sensiveis());
create policy "responsaveis: dado sensivel" on public.responsaveis
  for all to authenticated
  using (public.ve_dados_sensiveis()) with check (public.ve_dados_sensiveis());
create policy "documentos: dado sensivel" on public.documentos
  for all to authenticated
  using (public.ve_dados_sensiveis()) with check (public.ve_dados_sensiveis());

-- chamada: todos os perfis leem; comecar, entrar, encerrar e corrigir passam
-- pelas funcoes acima; marcas e avulsos, so quem pode marcar
create policy "chamadas: ler" on public.chamadas
  for select to authenticated using (public.usuario_ativo());
create policy "participantes: ler" on public.chamada_participantes
  for select to authenticated using (public.usuario_ativo());
create policy "marcas: ler" on public.chamada_marcas
  for select to authenticated using (public.usuario_ativo());
create policy "marcas: marcar" on public.chamada_marcas
  for insert to authenticated
  with check (marcado_por = auth.uid() and public.pode_marcar(chamada_id));
create policy "marcas: desmarcar" on public.chamada_marcas
  for delete to authenticated using (public.pode_marcar(chamada_id));
create policy "avulsos: ler" on public.chamada_avulsos
  for select to authenticated using (public.usuario_ativo());
create policy "avulsos: digitar" on public.chamada_avulsos
  for insert to authenticated
  with check (criado_por = auth.uid() and public.pode_marcar(chamada_id));
create policy "avulsos: apagar" on public.chamada_avulsos
  for delete to authenticated using (public.pode_marcar(chamada_id));
create policy "correcoes: ler" on public.chamada_correcoes
  for select to authenticated using (public.usuario_ativo());

-- jogo: todos leem a escala; quem monta e o ADM e a coordenacao tecnica
create policy "treinos: ler" on public.treinos
  for select to authenticated using (public.usuario_ativo());
create policy "treinos: coordenacao monta" on public.treinos
  for all to authenticated using (public.edita_escala()) with check (public.edita_escala());
create policy "comissao: ler" on public.treino_comissao
  for select to authenticated using (public.usuario_ativo());
create policy "comissao: coordenacao monta" on public.treino_comissao
  for all to authenticated using (public.edita_escala()) with check (public.edita_escala());

-- estudo: todos leem; ADM e professor mantem
create policy "aulas: ler" on public.aulas
  for select to authenticated using (public.usuario_ativo());
create policy "aulas: estudo mantem" on public.aulas
  for all to authenticated using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());
create policy "livros: ler" on public.livros
  for select to authenticated using (public.usuario_ativo());
create policy "livros: estudo mantem" on public.livros
  for all to authenticated using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());
create policy "emprestimos: ler" on public.emprestimos
  for select to authenticated
  using (public.cuida_do_estudo() or public.ve_dados_sensiveis());
create policy "emprestimos: estudo mantem" on public.emprestimos
  for all to authenticated using (public.cuida_do_estudo()) with check (public.cuida_do_estudo());


-- ----------------------------------------------------------------- funcoes
-- Por padrao o Postgres deixa qualquer um executar funcao nova. Aqui so quem
-- esta logado executa; cada funcao ainda confere se a conta esta ativa.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;


-- ----------------------------------------------------------------- tempo real
-- As marcas de quem esta marcando junto chegam na hora aos outros aparelhos.
-- O Realtime respeita as politicas acima.
alter table public.chamada_marcas replica identity full;
alter publication supabase_realtime
  add table public.chamadas, public.chamada_participantes, public.chamada_marcas;


-- ----------------------------------------------------------------- arquivos
-- Fotos e documentos das criancas: bucket privado, so ADM e Secretaria.
insert into storage.buckets (id, name, public)
values ('fichas', 'fichas', false), ('capas', 'capas', false)
on conflict (id) do nothing;

create policy "fichas: dado sensivel" on storage.objects
  for all to authenticated
  using (bucket_id = 'fichas' and public.ve_dados_sensiveis())
  with check (bucket_id = 'fichas' and public.ve_dados_sensiveis());

create policy "capas: ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'capas' and public.usuario_ativo());
create policy "capas: estudo mantem" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'capas' and public.cuida_do_estudo());
