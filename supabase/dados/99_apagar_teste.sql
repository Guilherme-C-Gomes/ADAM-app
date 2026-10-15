-- ADAM · apaga os dados de TESTE para comecar a usar de verdade.
--
-- Rodar no SQL Editor do projeto do ADAM (xzpdrqtbyzcczfwxbnjq), depois
-- dos dois SQLs de 02/10 (estudo_e_fotos e exclusao).
--
-- 1. As 12 criancas ficticias (observacao = 'TESTE') e tudo delas:
--    responsaveis, documentos, presencas e emprestimos vao juntos.
--    As unidades (Atibaia, Caiana) e as contas da equipe NAO sao apagadas.

delete from public.criancas where observacao = 'TESTE';

-- 2. OPCIONAL: as chamadas feitas ate hoje, se foram so de teste. Elas
--    entram nos numeros da Secretaria. Para apagar, tire os dois tracos do
--    comeco da linha abaixo e rode de novo.
-- delete from public.chamadas where data <= public.hoje();

-- Confere o que sobrou:
select
  (select count(*) from public.criancas) as criancas,
  (select count(*) from public.chamadas) as chamadas,
  (select count(*) from public.unidades) as unidades,
  (select count(*) from public.usuarios) as usuarios;
