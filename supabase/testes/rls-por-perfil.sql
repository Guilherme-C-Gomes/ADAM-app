-- =============================================================================
-- ADAM · prova do RLS por perfil (quem le e quem escreve o que)
--
-- Como usar: Supabase do ADAM > SQL Editor > New query > colar este arquivo
-- inteiro > Run. Roda como postgres. O resultado e UMA tabela:
--
--   perfil | item | esperado | obtido | resultado | obs
--
-- resultado = 'ok' quando o banco fez o que o app PROMETE (perfis.ts,
-- usuarios.ts e a secao 6 da politica de privacidade); 'FALHOU' quando nao.
-- O "esperado" vem da regra pretendida, NAO das politicas: se uma politica
-- discordar da regra, a linha aparece como FALHOU de proposito.
--
-- NAO ALTERA NADA. Tudo o que o teste cria (contas, unidade, crianca,
-- responsavel, documento, livro, emprestimo, treino, escala, chamada,
-- backup, arquivo) fica dentro de um bloco que termina com um erro
-- proposital: o Postgres desfaz tudo. Cada verificacao de escrita tambem e
-- desfeita na hora (outro erro proposital). Nem a sequencia de backups anda
-- (o registro de teste usa id fixo). So sobra a tabela temporaria do
-- resultado, que some quando a sessao do SQL Editor fecha.
--
-- Como um perfil e "vestido": dentro do bloco, o papel vira authenticated
-- e o JWT de mentira leva o id da conta de teste, exatamente como o app
-- chega pela API (auth.uid() le request.jwt.claims ->> 'sub'; versoes
-- antigas leem request.jwt.claim.sub, entao as duas sao preenchidas).
--
-- Perfis de teste (contas rls.teste.<perfil>@exemplo.invalid):
--   adm            funcao null        permissao acesso_total
--   secretaria     funcao secretaria  permissao ver_registrar
--   treinador      funcao treinador   permissao ver_registrar
--   coord_tecnico  funcao treinador   permissao coordenar_setor
--   professor      funcao professor   permissao ver_registrar
--   inativo        funcao treinador   permissao ver_registrar  ativo = false
--
-- Como ler 'obtido':
--   permitido  leu a linha / a escrita pegou / a funcao rodou
--   negado     0 linhas, ou o RLS barrou, ou a funcao recusou
--   erro       outro erro (a coluna obs diz qual); conta como FALHOU
--   pulado     nao deu para montar o teste (obs diz por que)
-- =============================================================================


-- ----------------------------------------------------------------- resultado
-- Tabela temporaria: so desta sessao, nunca entra no banco do ADAM.
drop table if exists pg_temp.rls_resultado;
create temp table rls_resultado (
  perfil text,
  item text,
  esperado text,
  obtido text,
  resultado text,
  obs text
);


do $teste$
declare
  -- marcas dos erros propositais (o que termina com rls_ nao e do banco)
  c_ok_desfaz constant text := 'rls_ok_rollback';
  c_fim constant text := 'rls_desfazer_tudo';
  c_suporte constant text := 'suporte.ti@adam.ong.br';
  c_protecao constant text := 'depende do SQL de proteção';

  -- quem pode, pela regra pretendida
  c_perfis constant text[] := array['adm', 'secretaria', 'treinador', 'coord_tecnico', 'professor', 'inativo'];
  c_ativos constant text[] := array['adm', 'secretaria', 'treinador', 'coord_tecnico', 'professor'];
  c_sensivel constant text[] := array['adm', 'secretaria'];
  c_jogo constant text[] := array['adm', 'treinador', 'coord_tecnico'];
  c_escala constant text[] := array['adm', 'coord_tecnico'];
  c_estudo constant text[] := array['adm', 'professor'];
  c_ninguem constant text[] := '{}';

  v_uid jsonb := '{}';   -- perfil -> id da conta de teste
  v_perfil text;
  v_id uuid;
  v_outro uuid;

  -- dados de teste
  v_unidade uuid;
  v_crianca uuid;    -- com livro emprestado
  v_crianca2 uuid;   -- sem livro
  v_livro uuid;
  v_treino uuid;
  v_escala uuid;
  v_chamada uuid;
  v_backup constant bigint := -424242;
  v_arquivo text;
  v_storage_ok boolean := false;
  v_storage_msg text;
  v_suporte uuid;
  v_suporte_obs text;

  -- verificacoes e resultados (variaveis sobrevivem ao desfazer)
  v_checks jsonb;
  v_check jsonb;
  v_res jsonb := '[]';

  v_sql text;
  v_passo text;
  v_n bigint;
  v_esperado text;
  v_obtido text;
  v_obs text;
  v_estado text;
  v_msg text;
begin
  -- --------------------------------------------------------------- guarda
  -- Se sobrou algum dado de teste de outra execucao (nao deveria), para
  -- tudo antes de tocar em qualquer coisa.
  if exists (select 1 from auth.users where email like 'rls.teste.%@exemplo.invalid')
     or exists (select 1 from public.usuarios where email like 'rls.teste.%@exemplo.invalid')
     or exists (select 1 from public.unidades where nome = 'RLS TESTE')
     or exists (select 1 from public.livro_tipos where nome = 'RLS TESTE') then
    raise exception 'ABORTADO: ja existe conta rls.teste.*@exemplo.invalid, unidade ou tipo de livro "RLS TESTE" no banco. Nada foi feito. Confira e apague esses registros antes de rodar o teste.';
  end if;

  -- =============================================================== bloco desfeito
  begin
    -- ------------------------------------------------------------- contas
    -- Inserir no auth.users dispara ao_criar_conta, que cria a linha em
    -- usuarios (inativa, sem funcao). So as colunas necessarias.
    foreach v_perfil in array c_perfis loop
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        'rls.teste.' || v_perfil || '@exemplo.invalid',
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nome', 'RLS teste ' || v_perfil),
        now(), now()
      );
      v_uid := v_uid || jsonb_build_object(v_perfil, v_id);
    end loop;

    if (select count(*) from public.usuarios where email like 'rls.teste.%@exemplo.invalid') <> 6 then
      raise exception 'o gatilho ao_criar_conta nao criou as 6 linhas em usuarios';
    end if;

    -- de brinde: conta nova nasce inativa e sem funcao?
    v_res := v_res || jsonb_build_array(jsonb_build_object(
      'perfil', '(conta nova)',
      'item', '00 nasce inativa, sem funcao, ver_registrar',
      'esperado', 'sim',
      'obtido', case when (
          select count(*) from public.usuarios
          where email like 'rls.teste.%@exemplo.invalid'
            and not ativo and funcao is null and permissao = 'ver_registrar'
        ) = 6 then 'sim' else 'nao' end,
      'obs', 'gatilho ao_criar_conta'));

    -- o ADM de verdade faria isto em Ajustes
    update public.usuarios u
    set funcao = x.funcao::public.funcao,
        permissao = x.permissao::public.permissao,
        ativo = x.ativo
    from (values
      ('adm', null::text, 'acesso_total', true),
      ('secretaria', 'secretaria', 'ver_registrar', true),
      ('treinador', 'treinador', 'ver_registrar', true),
      ('coord_tecnico', 'treinador', 'coordenar_setor', true),
      ('professor', 'professor', 'ver_registrar', true),
      ('inativo', 'treinador', 'ver_registrar', false)
    ) as x (perfil, funcao, permissao, ativo)
    where u.id = (v_uid ->> x.perfil)::uuid;

    -- ------------------------------------------------------------- suporte.ti
    -- As travas olham a conta de suporte de verdade. Se ela nao existir
    -- neste banco, entra uma copia temporaria (desfeita no fim).
    select id into v_suporte from public.usuarios where email = c_suporte;
    if v_suporte is null then
      select id into v_suporte from auth.users where email = c_suporte;
      if v_suporte is null then
        v_suporte := gen_random_uuid();
        insert into auth.users (
          instance_id, id, aud, role, email,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) values (
          '00000000-0000-0000-0000-000000000000', v_suporte, 'authenticated', 'authenticated',
          c_suporte, '{"provider": "email", "providers": ["email"]}'::jsonb,
          '{"nome": "Suporte TI"}'::jsonb, now(), now()
        );
      end if;
      insert into public.usuarios (id, nome, email)
      values (v_suporte, 'Suporte TI', c_suporte)
      on conflict (id) do nothing;
      update public.usuarios
      set funcao = null, permissao = 'acesso_total', ativo = true
      where id = v_suporte;
      v_suporte_obs := 'conta suporte.ti nao existe neste banco: testado com uma copia temporaria';
    end if;

    -- ------------------------------------------------------------- dados
    insert into public.unidades (nome) values ('RLS TESTE') returning id into v_unidade;
    insert into public.livro_tipos (nome) values ('RLS TESTE');

    insert into public.criancas (nome, nascimento, unidade_id, observacao)
    values ('RLS TESTE Crianca Um', date '2016-05-10', v_unidade, 'dado sensivel de teste')
    returning id into v_crianca;
    insert into public.criancas (nome, nascimento, unidade_id, observacao)
    values ('RLS TESTE Crianca Dois', date '2017-03-20', v_unidade, 'dado sensivel de teste')
    returning id into v_crianca2;

    insert into public.responsaveis (crianca_id, nome, relacao, telefone, whatsapp, principal)
    values (v_crianca, 'RLS TESTE Mae Um', 'mae', '11900000001', true, true),
           (v_crianca2, 'RLS TESTE Mae Dois', 'mae', '11900000002', true, true);

    insert into public.documentos (crianca_id, tipo, entregue_em)
    values (v_crianca, 'RLS TESTE certidao', public.hoje());

    -- inscricao pelo link (pendente) e a tentativa dela; a ficha de
    -- matricula da crianca Um ja nasce sozinha (gatilho criar_ficha_matricula)
    insert into public.inscricao_tentativas (id, ip_hash)
    values ('00000000-0000-4000-8000-000000000042', 'rls teste');
    insert into public.inscricoes (id, crianca_nome, nascimento, dados, hash, assinatura_tipo, ficha_path)
    values ('00000000-0000-4000-8000-000000000042', 'RLS TESTE Inscrita', date '2016-01-01',
            '{}', 'rlsteste', 'tela', 'rls/teste.pdf');

    insert into public.livros (titulo, tipo) values ('RLS TESTE Livro', 'RLS TESTE')
    returning id into v_livro;
    -- emprestimo ABERTO so da crianca Um
    insert into public.emprestimos (livro_id, crianca_id, emprestado_por, entrega)
    values (v_livro, v_crianca, (v_uid ->> 'adm')::uuid, public.hoje() + 14);

    insert into public.treinos (data, hora, unidade_id, turma, responsavel_id, criado_por)
    values (public.hoje(), time '17:00', v_unidade, 'pequenos',
            (v_uid ->> 'treinador')::uuid, (v_uid ->> 'adm')::uuid)
    returning id into v_treino;

    insert into public.escala (unidade_id, dia_semana, hora, turma, tecnico_id)
    values (v_unidade, 2, time '18:00', 'pequenos', (v_uid ->> 'treinador')::uuid)
    returning id into v_escala;

    -- chamada de HOJE em andamento, que os perfis vao entrar
    insert into public.chamadas (data, unidade_id, turma, iniciada_por)
    values (public.hoje(), v_unidade, 'pequenos', (v_uid ->> 'adm')::uuid)
    returning id into v_chamada;

    -- registro de backup com id fixo: a sequencia nao anda
    insert into public.backups (id, origem, ok, arquivo)
    overriding system value
    values (v_backup, 'manual', true, 'rls-teste.json');

    -- arquivo de mentira no bucket privado 'fichas' (so a linha; nenhum
    -- arquivo sobe). Se o postgres nao puder, o item do storage sai pulado.
    v_arquivo := 'rls-teste/' || v_crianca || '.txt';
    begin
      insert into storage.objects (bucket_id, name) values ('fichas', v_arquivo);
      v_storage_ok := true;
    exception when others then
      v_storage_ok := false;
      v_storage_msg := sqlerrm;
    end;

    -- ------------------------------------------------------------- verificacoes
    -- modo: ler (conta linhas), escrever (conta linhas afetadas), rpc (rodou?)
    -- prep: roda JA como o perfil, antes da acao (ex.: entrar na chamada)
    -- prep_pg: roda como postgres, antes de vestir o perfil
    -- so: limita a verificacao a alguns perfis
    -- {eu} = id do perfil da vez; {outro} = id de outra pessoa da equipe
    select jsonb_agg(jsonb_build_object(
             'item', t.item, 'permitidos', to_jsonb(t.permitidos), 'modo', t.modo,
             'sql', t.sql, 'prep', t.prep, 'prep_pg', to_jsonb(t.prep_pg),
             'obs', t.obs, 'so', to_jsonb(t.so)))
    into v_checks
    from (values
      -- criancas: a ficha inteira e so de ADM e Secretaria
      ('01 criancas: ler a ficha completa', c_sensivel, 'ler',
        format('select c.observacao, c.nascimento from public.criancas c where c.id = %L', v_crianca),
        null::text, null::text[], null::text, null::text[]),
      ('02 criancas_basico: ve nome e idade', c_ativos, 'ler',
        format('select 1 from public.criancas_basico() b where b.id = %L', v_crianca),
        null, null, null, null),
      ('03 criancas: cadastrar', c_sensivel, 'escrever',
        format('insert into public.criancas (nome, nascimento, unidade_id) values (%L, date %L, %L)',
               'RLS TESTE Crianca Nova', '2015-01-01', v_unidade),
        null, null, null, null),
      ('04 criancas: editar', c_sensivel, 'escrever',
        format('update public.criancas set observacao = %L where id = %L', 'editado no teste', v_crianca),
        null, null, null, null),
      ('05 criancas: excluir', array['adm'], 'escrever',
        format('delete from public.criancas where id = %L', v_crianca),
        null, null, null, null),

      -- responsaveis e documentos: dado sensivel
      ('06 responsaveis: ler', c_sensivel, 'ler',
        format('select r.telefone from public.responsaveis r where r.crianca_id = %L', v_crianca),
        null, null, null, null),
      ('07 documentos: ler', c_sensivel, 'ler',
        format('select d.tipo from public.documentos d where d.crianca_id = %L', v_crianca),
        null, null, null, null),
      ('07b responsaveis: ler CPF e RG', c_sensivel, 'ler',
        format('select r.cpf, r.rg from public.responsaveis r where r.crianca_id = %L', v_crianca),
        null, null, null, null),

      -- ficha de matricula (endereco, escola, familia, saude): dado sensivel
      ('07c fichas_matricula: ler', c_sensivel, 'ler',
        format('select m.numero from public.fichas_matricula m where m.crianca_id = %L', v_crianca),
        null, null, null, null),
      ('07d fichas_matricula: editar', c_sensivel, 'escrever',
        format('update public.fichas_matricula set dados = %L::jsonb where crianca_id = %L',
               '{"rua": "RLS TESTE"}', v_crianca),
        null, null, null, null),

      -- inscricoes pelo link: so ADM e Secretaria leem e decidem; excluir,
      -- so quem administra a Secretaria; as tentativas, ninguem pelo app
      ('07e inscricoes: ler', c_sensivel, 'ler',
        'select 1 from public.inscricoes i where i.id = ''00000000-0000-4000-8000-000000000042''',
        null, null, null, null),
      ('07f inscricoes: recusar', c_sensivel, 'escrever',
        'update public.inscricoes set status = ''recusada'' where id = ''00000000-0000-4000-8000-000000000042''',
        null, null, null, null),
      ('07g inscricoes: excluir', array['adm'], 'escrever',
        'delete from public.inscricoes where id = ''00000000-0000-4000-8000-000000000042''',
        null, null, null, null),
      ('07h inscricao_tentativas: ler', c_ninguem, 'ler',
        'select 1 from public.inscricao_tentativas t where t.id = ''00000000-0000-4000-8000-000000000042''',
        null, null, null, null),

      -- o telefone principal: o professor so de quem esta com livro
      ('08 contato_principal: crianca COM livro emprestado', array['adm', 'secretaria', 'professor'], 'ler',
        format('select * from public.contato_principal(%L)', v_crianca),
        null, null, null, null),
      ('09 contato_principal: crianca SEM livro', c_sensivel, 'ler',
        format('select * from public.contato_principal(%L)', v_crianca2),
        null, null, null, null),

      -- usuarios: a equipe ativa se ve; so o ADM mexe em permissao
      ('10 usuarios: ver a equipe (outra pessoa)', c_ativos, 'ler',
        'select 1 from public.usuarios u where u.id = {outro}',
        null, null, null, null),
      ('11 usuarios: mudar a permissao de outra pessoa', array['adm'], 'escrever',
        'update public.usuarios set permissao = ''coordenar_setor'' where id = {outro}',
        null, null, null, null),
      ('12 usuarios: mudar a propria permissao', c_ninguem, 'escrever',
        'update public.usuarios set permissao = case when permissao = ''acesso_total'' then ''coordenar_setor''::public.permissao else ''acesso_total''::public.permissao end where id = auth.uid()',
        null, null, 'regra: ninguem muda a propria permissao pela API', null),
      ('13 usuarios: ativar a propria conta', c_ninguem, 'escrever',
        'update public.usuarios set ativo = true where id = auth.uid()',
        null, null, null, array['inativo']),

      -- copias de seguranca: so o ADM
      ('14 backups: ler o registro', array['adm'], 'ler',
        format('select 1 from public.backups b where b.id = %L', v_backup),
        null, null, null, null),

      -- estudo: ADM e professor
      ('15 livros: cadastrar', c_estudo, 'escrever',
        format('insert into public.livros (titulo, tipo) values (%L, %L)', 'RLS TESTE Livro Novo', 'RLS TESTE'),
        null, null, null, null),
      ('16 emprestimos: ler', array['adm', 'secretaria', 'professor'], 'ler',
        format('select 1 from public.emprestimos e where e.crianca_id = %L', v_crianca),
        null, null, null, null),
      ('17 emprestimos: emprestar livro', c_estudo, 'escrever',
        format('insert into public.emprestimos (livro_id, crianca_id, emprestado_por, entrega) values (%L, %L, auth.uid(), public.hoje() + 7)',
               v_livro, v_crianca2),
        null, null, null, null),

      -- jogo: treino e de quem cuida do jogo; escala so da coordenacao
      ('18 treinos: cadastrar', c_jogo, 'escrever',
        format('insert into public.treinos (data, hora, unidade_id, turma) values (public.hoje() + 1, time %L, %L, %L)',
               '08:00', v_unidade, 'maiores'),
        null, null, null, null),
      ('19 treinos: editar', c_jogo, 'escrever',
        format('update public.treinos set local = %L where id = %L', 'campo de teste', v_treino),
        null, null, null, null),
      ('20 treinos: apagar', c_escala, 'escrever',
        format('delete from public.treinos where id = %L', v_treino),
        null, null, null, null),
      ('21 escala: incluir horario', c_escala, 'escrever',
        format('insert into public.escala (unidade_id, dia_semana, hora, turma) values (%L, 3, time %L, %L)',
               v_unidade, '19:00', 'maiores'),
        null, null, null, null),
      ('22 escala: trocar o tecnico', c_escala, 'escrever',
        format('update public.escala set tecnico_id = {eu} where id = %L', v_escala),
        null, null, null, null),

      -- chamada: toda a equipe ativa marca
      ('23 chamada: entrar_na_chamada', c_ativos, 'rpc',
        format('select public.entrar_na_chamada(%L, %L::public.turma)', v_unidade, 'pequenos'),
        null, null, null, null),
      ('24 chamada_marcas: marcar depois de entrar', c_ativos, 'escrever',
        format('insert into public.chamada_marcas (chamada_id, crianca_id, marcado_por) values (%L, %L, auth.uid())',
               v_chamada, v_crianca),
        format('select public.entrar_na_chamada(%L, %L::public.turma)', v_unidade, 'pequenos'),
        null, null, null),
      ('25 chamada_marcas: marcar SEM ter entrado', c_ninguem, 'escrever',
        format('insert into public.chamada_marcas (chamada_id, crianca_id, marcado_por) values (%L, %L, auth.uid())',
               v_chamada, v_crianca),
        null, null, null, null),
      ('26 chamada: encerrar depois de entrar', c_ativos, 'rpc',
        format('select public.encerrar_chamada(%L)', v_chamada),
        format('select public.entrar_na_chamada(%L, %L::public.turma)', v_unidade, 'pequenos'),
        null, null, null),

      ('27 unidades: ler', c_ativos, 'ler',
        format('select 1 from public.unidades u where u.id = %L', v_unidade),
        null, null, null, null),

      -- travas que ainda podem nao estar aplicadas
      -- 1) o ultimo acesso total ativo nao pode se rebaixar: as outras
      --    contas de acesso total ficam inativas SO dentro desta verificacao
      --    (desfeito na hora); gatilhos de usuarios ficam desligados so
      --    durante esse preparo, para a propria trava nao barrar o preparo
      ('trava: ultimo acesso total ativo se rebaixar', c_ninguem, 'escrever',
        'update public.usuarios set permissao = ''ver_registrar'' where id = auth.uid()',
        null,
        array[
          'select set_config(''lock_timeout'', ''5s'', true)',
          'alter table public.usuarios disable trigger user',
          'update public.usuarios set ativo = false where permissao = ''acesso_total'' and ativo and id <> {eu}',
          'alter table public.usuarios enable trigger user'
        ],
        c_protecao, array['adm']),
      -- 2) e 3) a conta de suporte nao pode ser mexida por outro ADM
      ('trava: outro adm rebaixar/desativar suporte.ti', c_ninguem, 'escrever',
        format('update public.usuarios set permissao = ''ver_registrar'', ativo = false where id = %L', v_suporte),
        null, null, concat_ws(' | ', c_protecao, v_suporte_obs), array['adm']),
      ('trava: outro adm excluir suporte.ti', c_ninguem, 'escrever',
        format('delete from public.usuarios where id = %L', v_suporte),
        null, null, concat_ws(' | ', c_protecao, v_suporte_obs), array['adm'])
    ) as t (item, permitidos, modo, sql, prep, prep_pg, obs, so);

    -- storage: o arquivo da ficha so para ADM e Secretaria
    if v_storage_ok then
      v_checks := v_checks || jsonb_build_array(jsonb_build_object(
        'item', '28 storage fichas: ler o arquivo', 'permitidos', to_jsonb(c_sensivel), 'modo', 'ler',
        'sql', format('select 1 from storage.objects o where o.bucket_id = %L and o.name = %L', 'fichas', v_arquivo)));
    else
      foreach v_perfil in array c_perfis loop
        v_res := v_res || jsonb_build_array(jsonb_build_object(
          'perfil', v_perfil, 'item', '28 storage fichas: ler o arquivo',
          'esperado', case when v_perfil = any (c_sensivel) then 'permitido' else 'negado' end,
          'obtido', 'pulado',
          'obs', 'postgres nao conseguiu criar a linha de teste em storage.objects: ' || coalesce(v_storage_msg, '?')));
      end loop;
    end if;

    -- ------------------------------------------------------------- execucao
    for v_check in select value from jsonb_array_elements(v_checks) loop
      foreach v_perfil in array c_perfis loop
        if jsonb_typeof(v_check -> 'so') = 'array' and not ((v_check -> 'so') ? v_perfil) then
          continue;
        end if;

        v_id := (v_uid ->> v_perfil)::uuid;
        v_outro := case when v_perfil = 'treinador'
                        then (v_uid ->> 'professor')::uuid
                        else (v_uid ->> 'treinador')::uuid end;
        v_esperado := case when (v_check -> 'permitidos') ? v_perfil then 'permitido' else 'negado' end;
        v_obtido := null;
        v_obs := v_check ->> 'obs';
        v_sql := replace(replace(v_check ->> 'sql', '{eu}', quote_literal(v_id)), '{outro}', quote_literal(v_outro));

        -- cada verificacao num sub-bloco que SEMPRE termina em erro: a
        -- escrita, o papel e o JWT voltam ao que eram (postgres, sem JWT)
        begin
          -- preparo como postgres
          for v_passo in
            select jsonb_array_elements_text(
              case when jsonb_typeof(v_check -> 'prep_pg') = 'array' then v_check -> 'prep_pg' else '[]'::jsonb end)
          loop
            execute replace(v_passo, '{eu}', quote_literal(v_id));
          end loop;

          -- veste o perfil (igual a uma chamada do app pela API)
          perform set_config('role', 'authenticated', true);
          perform set_config('request.jwt.claims',
                             json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
          perform set_config('request.jwt.claim.sub', v_id::text, true);
          perform set_config('request.jwt.claim.role', 'authenticated', true);

          if current_user <> 'authenticated' or auth.uid() is distinct from v_id then
            raise exception using errcode = 'P0001', message = 'rls_personificacao_falhou (current_user=' || current_user || ')';
          end if;

          -- preparo ja como o perfil
          if v_check ->> 'prep' is not null then
            execute v_check ->> 'prep';
          end if;

          -- a acao
          if v_check ->> 'modo' = 'ler' then
            execute 'select count(*) from (' || v_sql || ') as s' into v_n;
          else
            execute v_sql;
            get diagnostics v_n = row_count;
          end if;

          v_obtido := case when v_check ->> 'modo' = 'rpc' or v_n > 0 then 'permitido' else 'negado' end;

          raise exception using errcode = 'P0001', message = c_ok_desfaz;
        exception when others then
          get stacked diagnostics v_estado = returned_sqlstate, v_msg = message_text;
          if v_msg = c_ok_desfaz then
            null;  -- chegou ao fim: v_obtido ja foi decidido acima
          elsif v_estado = '42501' then
            -- RLS barrou (new row violates...) ou falta de privilegio
            v_obtido := 'negado';
            v_obs := concat_ws(' | ', v_obs, 'barrado: ' || v_msg);
          elsif v_estado = 'P0001' and v_msg not like 'rls\_%' then
            -- a propria funcao recusou (ex.: 'acesso inativo')
            v_obtido := 'negado';
            v_obs := concat_ws(' | ', v_obs, 'recusado: ' || v_msg);
          else
            v_obtido := 'erro';
            v_obs := concat_ws(' | ', v_obs, v_estado || ': ' || v_msg);
          end if;
        end;

        v_res := v_res || jsonb_build_array(jsonb_build_object(
          'perfil', v_perfil, 'item', v_check ->> 'item',
          'esperado', v_esperado, 'obtido', v_obtido, 'obs', v_obs));
      end loop;
    end loop;

    -- ------------------------------------------------------------- desfaz tudo
    raise exception using errcode = 'P0001', message = c_fim;
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate, v_msg = message_text;
    if v_msg <> c_fim then
      -- algo deu errado ao montar o teste: aparece no resultado
      v_res := v_res || jsonb_build_array(jsonb_build_object(
        'perfil', '(script)', 'item', '00 montagem do teste',
        'esperado', 'ok', 'obtido', 'erro', 'obs', v_estado || ': ' || v_msg));
    end if;
  end;
  -- =============================================================== fim do bloco desfeito

  -- daqui para baixo, de volta como postgres e sem nenhum dado de teste
  insert into pg_temp.rls_resultado (perfil, item, esperado, obtido, resultado, obs)
  select x.perfil, x.item, x.esperado, x.obtido,
         case when x.obtido = 'pulado' then 'pulado'
              when x.esperado = x.obtido then 'ok'
              else 'FALHOU' end,
         x.obs
  from jsonb_to_recordset(v_res) as x (perfil text, item text, esperado text, obtido text, obs text);

  insert into pg_temp.rls_resultado (perfil, item, esperado, obtido, resultado, obs)
  select '(resumo)',
         '00 total: ' || count(*) || ' verificacoes',
         count(*) filter (where r.resultado <> 'pulado') || ' ok',
         count(*) filter (where r.resultado = 'ok') || ' ok',
         case when count(*) filter (where r.resultado = 'FALHOU') = 0 then 'ok' else 'FALHOU' end,
         count(*) filter (where r.resultado = 'FALHOU') || ' FALHOU, '
           || count(*) filter (where r.resultado = 'pulado') || ' pulado'
  from pg_temp.rls_resultado r;
end
$teste$;


-- ----------------------------------------------------------------- o que aparece
select perfil, item, esperado, obtido, resultado, obs
from pg_temp.rls_resultado
order by perfil collate "C", item collate "C"
limit 1000;
