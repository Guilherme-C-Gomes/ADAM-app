-- ADAM · documentos do responsavel (CPF, RG e orgao expedidor).
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty). Pode rodar
-- de novo sem estragar nada.
--
-- O que era a "declaracao do responsavel" da ficha de papel (quem assina:
-- nome, RG, orgao expedidor e CPF) mora no proprio responsavel. Tudo
-- opcional. O RLS de `responsaveis` ja e o de dado sensivel (ADM e
-- Secretaria); o numero principal que o professor ve (contato_principal)
-- nao traz estes campos.

alter table public.responsaveis add column if not exists cpf text;
alter table public.responsaveis add column if not exists rg text;
alter table public.responsaveis add column if not exists rg_orgao text;

alter table public.responsaveis drop constraint if exists responsaveis_cpf_formato;
alter table public.responsaveis add constraint responsaveis_cpf_formato
  check (cpf is null or cpf ~ '^[0-9]{11}$');

alter table public.responsaveis drop constraint if exists responsaveis_rg_tamanho;
alter table public.responsaveis add constraint responsaveis_rg_tamanho
  check ((rg is null or char_length(rg) <= 20) and (rg_orgao is null or char_length(rg_orgao) <= 20));
