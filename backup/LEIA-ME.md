# Cópia de segurança do ADAM

Três vezes por dia (7h, 13h e 21h, horário de Brasília, com até 1 hora de
variação no plano grátis da Vercel), a função `api/backup.ts`:

1. lê o banco inteiro — e isso mantém o Supabase gratuito acordado, mesmo
   num mês de férias (ele pausa depois de 7 dias sem uso);
2. grava a cópia completa (`adam-banco-AAAA-MM-DD_HHhMM.json`) na pasta
   `banco/` do Google Drive da ADAM;
3. grava as fotos e os documentos novos na pasta `arquivos/`;
4. anota o resultado no app (Configuração da ADAM › Cópia de segurança).

No Drive ficam só as 3 cópias mais recentes do banco (manhã, tarde e noite); as
mais antigas vão para a lixeira do Drive a cada cópia nova.

## Instalar (uma vez)

### 1. Uma senha longa

Invente uma senha longa (30 caracteres ou mais, só letras e números). Ela vai
em dois lugares e em nenhum outro: na Vercel e no Apps Script. Não mande
para ninguém.

### 2. O Apps Script (conta Google dona da pasta do Drive)

1. Abra <https://script.google.com> › **Novo projeto**.
2. Apague o que vier e cole o conteúdo de `backup/apps-script.gs`.
3. Na linha `const SENHA = '...'`, troque o texto pela senha do passo 1.
4. Salve. No topo, escolha a função **testarPasta** e clique em **Executar**.
   Autorize o acesso ao Drive. No registro deve aparecer o nome da pasta.
5. **Implantar › Nova implantação** › tipo **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Copie o **URL do app da Web** (termina em `/exec`).

### 3. As variáveis na Vercel

Na Vercel (conta da ADAM) › projeto **adam** › **Settings › Environment
Variables**, crie para **Production**:

| Nome | Valor |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase › Project Settings › API Keys › **Secret keys** (`sb_secret_...`) |
| `CRON_SECRET` | a senha do passo 1 |
| `BACKUP_DRIVE_URL` | o URL do passo 2 |

(`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` já estão lá: são as do
despertador, que funciona mesmo antes destas três.) Depois disso o site
precisa ser publicado de novo para a função enxergar as variáveis.

### 4. Conferir

No app: Configuração da ADAM › **Cópia de segurança** › **Fazer cópia no
Drive agora**. Em seguida aparecem, no Drive, a pasta `banco/` com o arquivo
`.json` e a pasta `arquivos/`.

## Restaurar

Em `scripts/restaurar-backup.mjs` está o passo a passo. Resumo:

1. No projeto Supabase de destino, rodar todos os SQLs de `supabase/migrations`.
2. Baixar do Drive o `.json` (e a pasta `arquivos/`, se quiser as fotos).
3. No PowerShell, nesta pasta:

   ```
   $env:SUPABASE_URL = "https://<destino>.supabase.co"
   $env:SUPABASE_SECRET_KEY = "sb_secret_..."
   $env:SENHA_INICIAL = "uma senha provisoria"
   node scripts/restaurar-backup.mjs C:\caminho\adam-banco-....json C:\caminho\arquivos
   ```

As contas voltam com o mesmo e-mail e a mesma função, com a senha
provisória (senha não vai em cópia nenhuma).

**Teste de restauração:** faça uma vez num projeto de teste, nunca no de
verdade. O projeto vazio "ADAM.app" serve para isso.

## Cópia em mãos

Antes das férias: Configuração da ADAM › Cópia de segurança › **Baixar cópia
neste aparelho** e guardar o arquivo num pendrive. Ela traz os dados; as
fotos e os documentos estão na pasta `arquivos/` do Drive.
