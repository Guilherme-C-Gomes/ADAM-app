-- ADAM · registro das copias de seguranca e a saida da crianca.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty), depois do
-- SQL do Jogo. Pode rodar de novo sem estragar nada.


-- ------------------------------------------------------------ copias de seguranca
-- Cada copia (3 por dia, agendadas na Vercel, ou a pedido do ADM) deixa uma
-- linha aqui. E o que a tela "Copia de seguranca" mostra: quando foi a
-- ultima e se deu certo. Quem grava e a funcao da Vercel, com a chave
-- secreta (passa por cima do RLS); no app, so o ADM le.
create table if not exists public.backups (
  id bigint generated always as identity primary key,
  feito_em timestamptz not null default now(),
  origem text not null check (origem in ('agendado', 'manual')),
  ok boolean not null,
  tabelas integer,
  linhas integer,
  arquivos_novos integer,
  arquivos_pendentes integer,
  arquivo text,
  erro text
);
create index if not exists backups_feito_em_idx on public.backups (feito_em desc);

alter table public.backups enable row level security;
drop policy if exists "backups: so o adm le" on public.backups;
create policy "backups: so o adm le" on public.backups
  for select to authenticated using (public.e_adm());


-- ------------------------------------------------------------ saida da crianca
-- Crianca que deixou a ADAM nao some: a ficha fica inativa com a data e o
-- motivo, e o historico (presencas, emprestimos) continua contando no
-- periodo em que ela estava. Excluir de vez continua so para o ADM.
alter table public.criancas add column if not exists saiu_em date;
alter table public.criancas add column if not exists motivo_saida text;
