-- Genero do livro opcional (09/11/2026).
-- Na tela o "tipo do livro" passou a se chamar "Gênero" e nao e mais
-- obrigatorio: livro sem genero fica com tipo vazio (null). A chave para
-- livro_tipos continua valendo para quem tem genero (null passa na chave).
alter table public.livros alter column tipo drop not null;

-- quem gravou texto vazio antes vira "sem genero" de verdade
update public.livros set tipo = null where tipo is not null and btrim(tipo) = '';
