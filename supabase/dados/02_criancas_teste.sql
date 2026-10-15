-- ADAM · criancas FICTICIAS para testar a chamada antes da Secretaria
-- cadastrar as de verdade. Nenhum nome real de crianca entra aqui.
--
-- Todas ficam marcadas com observacao = 'TESTE'. Para apagar depois:
--
--   delete from public.criancas where observacao = 'TESTE';
--
-- A idade sai de hoje: 7 a 11 anos caem nos Pequenos, 12 a 16 nos Maiores
-- (regra R1, a mesma do app e do banco).
insert into public.criancas (nome, nascimento, unidade_id, observacao)
select t.nome,
       (public.hoje() - make_interval(years => t.idade, months => 3))::date,
       u.id,
       'TESTE'
from (values
  ('Sophia Almeida', 8), ('Helena Ribeiro', 9), ('Davi Nascimento', 11),
  ('Laura Mendes', 7), ('Theo Carvalho', 9), ('Ana Beatriz Lopes', 10),
  ('Enzo Gabriel Rocha', 14), ('Miguel Tavares', 15), ('Lucas Ferreira', 13),
  ('Pedro Henrique Silva', 12), ('Gustavo Lima', 16), ('Rafael Souza', 13)
) as t (nome, idade)
cross join (select id from public.unidades where nome = 'Atibaia') as u
where not exists (
  select 1 from public.criancas c where c.nome = t.nome and c.observacao = 'TESTE'
);

select nome, public.turma_da_idade(nascimento) as turma
from public.criancas
where observacao = 'TESTE'
order by 2, 1;
