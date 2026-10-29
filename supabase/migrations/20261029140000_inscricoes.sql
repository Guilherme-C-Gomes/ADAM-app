-- ADAM · inscricao pelo link (o formulario publico em inscricao/).
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), depois do
-- 20261029120000_parentesco.sql. Pode rodar de novo sem estragar nada.
--
-- A mae preenche a ficha de matricula pelo celular e assina (gov.br ou com o
-- dedo na tela). A inscricao NAO vira crianca sozinha: fica "pendente" ate a
-- Secretaria conferir e cadastrar pelo app. Quem grava aqui e so o servidor
-- do formulario (chave secreta, passa o RLS); pelo app, so ADM e Secretaria
-- leem, e o anonimo nao ve nem grava nada.

create table if not exists public.inscricoes (
  id uuid primary key,
  criado_em timestamptz not null default now(),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'recusada')),
  crianca_nome text not null,
  nascimento date not null,
  unidade_id uuid references public.unidades (id) on delete set null,
  -- a ficha inteira, como a mae preencheu (formato em api/_inscricao/ficha.ts)
  dados jsonb not null,
  -- sha-256 da ficha: e o que vai dentro do PDF e liga o PDF assinado a ela
  hash text not null,
  assinatura_tipo text not null check (assinatura_tipo in ('govbr', 'tela')),
  -- gov.br: o PDF tem assinatura digital de certificado do gov.br/ICP-Brasil
  -- (conferencia completa em validar.iti.gov.br)
  assinatura_reconhecida boolean not null default false,
  ficha_path text not null,
  -- { "rg_certidao": "<id>/rg_certidao.jpg", ... } no bucket `inscricoes`
  arquivos jsonb not null default '{}',
  ip_hash text,
  decidido_em timestamptz,
  decidido_por uuid references public.usuarios (id) on delete set null,
  motivo_recusa text,
  crianca_id uuid references public.criancas (id) on delete set null
);
create index if not exists inscricoes_status_idx on public.inscricoes (status, criado_em desc);
create index if not exists inscricoes_crianca_idx on public.inscricoes (crianca_id);

-- Cada envio comeca pedindo os enderecos de upload: anotado aqui para limitar
-- tentativas por aparelho (ip com sal, nunca o ip puro) e por dia.
create table if not exists public.inscricao_tentativas (
  id uuid primary key,
  ip_hash text not null,
  criado_em timestamptz not null default now()
);
create index if not exists inscricao_tentativas_ip_idx
  on public.inscricao_tentativas (ip_hash, criado_em desc);

alter table public.inscricoes enable row level security;
alter table public.inscricao_tentativas enable row level security;
-- tentativas: nenhuma policy = so o servidor (chave secreta) le e grava

drop policy if exists "inscricoes: ler" on public.inscricoes;
create policy "inscricoes: ler" on public.inscricoes
  for select to authenticated using (public.ve_dados_sensiveis());

drop policy if exists "inscricoes: decidir" on public.inscricoes;
create policy "inscricoes: decidir" on public.inscricoes
  for update to authenticated
  using (public.ve_dados_sensiveis())
  with check (public.ve_dados_sensiveis());

drop policy if exists "inscricoes: excluir" on public.inscricoes;
create policy "inscricoes: excluir" on public.inscricoes
  for delete to authenticated using (public.administra_secretaria());

revoke all on public.inscricoes from anon;
revoke all on public.inscricao_tentativas from anon, authenticated;


-- ------------------------------------------------------------ arquivos
-- Bucket privado. O formulario envia por endereco assinado (gerado pelo
-- servidor), entao nao ha policy de envio: pelo app, so ler e apagar.
insert into storage.buckets (id, name, public)
values ('inscricoes', 'inscricoes', false)
on conflict (id) do nothing;

drop policy if exists "inscricoes: ler arquivos" on storage.objects;
create policy "inscricoes: ler arquivos" on storage.objects
  for select to authenticated
  using (bucket_id = 'inscricoes' and public.ve_dados_sensiveis());

drop policy if exists "inscricoes: apagar arquivos" on storage.objects;
create policy "inscricoes: apagar arquivos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'inscricoes' and public.administra_secretaria());
