-- ADAM · limites dos arquivos da inscricao pelo link.
--
-- Rodar no SQL Editor do projeto do ADAM (jmaztlceuandkyraazty). Pode rodar
-- de novo sem estragar nada.
--
-- O formulario publico sobe os arquivos direto para o bucket `inscricoes`
-- por endereco assinado. O proprio Storage passa a recusar arquivo acima de
-- 10 MB e qualquer coisa que nao seja foto (JPG, PNG, WEBP) ou PDF — antes
-- so o servidor conferia, depois de o arquivo ja estar guardado.

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'inscricoes';
