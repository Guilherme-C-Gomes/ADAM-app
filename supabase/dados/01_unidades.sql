-- ADAM · as unidades onde acontecem treino, aula e chamada.
-- Rodar uma vez no SQL Editor do projeto do ADAM. Rodar de novo nao duplica.
insert into public.unidades (nome)
values ('Atibaia'), ('Caiana')
on conflict (nome) do nothing;

select nome from public.unidades order by nome;
