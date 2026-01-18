# Cantina Órion - Autorização de Compras Faturadas

Projeto estático (HTML/CSS/JS) com Netlify Functions e Supabase para atualização cadastral e autorização de compras pós-pagas.

## Passo a passo

1. Crie um projeto no Supabase e execute o arquivo `supabase.sql` no SQL Editor.
2. Crie um bucket privado chamado `cantina-termos` no Supabase Storage.
3. No Netlify, configure as variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BUCKET` (opcional; padrão `cantina-termos`)
4. Instale as dependências das functions:
   ```bash
   npm install
   ```
5. Faça o deploy publicando esta pasta no Netlify.
6. Teste o fluxo completo na página publicada.

## Estrutura

- `index.html`, `styles.css`, `app.js`: front-end estático.
- `netlify/functions/submit-authorization.mjs`: função que grava dados no Supabase e gera o PDF.
- `supabase.sql`: criação de tabelas e RLS.

## Observações

- As chaves sensíveis não estão no front-end.
- O acesso ao banco ocorre apenas via Netlify Function usando `SUPABASE_SERVICE_ROLE_KEY`.
