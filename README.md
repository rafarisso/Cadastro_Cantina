# Cantina Orion - Autorizacao de Compras Faturadas

Projeto estatico (HTML/CSS/JS) com Netlify Functions e Supabase para atualizacao cadastral e autorizacao de compras pos-pagas.

## Setup basico (site publico)

1. Crie um projeto no Supabase e execute o arquivo `supabase.sql` no SQL Editor.
2. Crie um bucket privado chamado `cantina-termos` no Supabase Storage.
3. No Netlify, configure as variaveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BUCKET` (opcional; padrao `cantina-termos`)
4. Instale as dependencias das functions:
   ```bash
   npm install
   ```
5. Faca o deploy publicando esta pasta no Netlify.
6. Teste o fluxo completo na pagina publicada.

## Setup do painel admin

1. Execute o arquivo `admin.sql` no SQL Editor do Supabase (roles e policies).
2. Crie um usuario no Supabase Auth (email/senha).
3. Promova o usuario a admin executando:
   ```sql
   insert into public.user_roles(user_id, role)
   values ('<COLE_AQUI_SEU_USER_ID_DO_AUTH.USERS>', 'admin');
   ```
4. Configure o Supabase Auth > URL Configuration:
   - Site URL: `https://cadastro-cantina-orion.netlify.app`
   - Redirect URLs:
     - `https://cadastro-cantina-orion.netlify.app/`
     - `https://cadastro-cantina-orion.netlify.app/admin.html`
   - (Opcional dev)
     - `http://localhost:8888/`
     - `http://localhost:8888/admin.html`
5. No Netlify, adicione a variavel de ambiente:
   - `SUPABASE_ANON_KEY`
   - Recomendado: `NODE_VERSION=20`
6. Edite `admin.html` e informe:
   ```js
   window.__SUPABASE_CONFIG__ = {
     url: "https://YOUR_PROJECT.supabase.co",
     anonKey: "YOUR_SUPABASE_ANON_KEY"
   };
   ```
7. Acesse o painel em `https://cadastro-cantina-orion.netlify.app/admin` (ou `admin.html`).

## Estrutura

- `index.html`, `styles.css`, `app.js`: front-end estatico do cadastro.
- `admin.html`, `admin.css`, `admin.js`: painel admin.
- `netlify/functions/submit-authorization.mjs`: grava dados e gera PDF.
- `netlify/functions/admin-list.mjs`: lista autorizacoes para admin.
- `netlify/functions/admin-pdf-link.mjs`: gera signed URL do PDF.
- `supabase.sql`: tabelas base e RLS.
- `admin.sql`: roles e policies para admin.

## Observacoes

- Nao coloque `SUPABASE_SERVICE_ROLE_KEY` no front-end.
- Se aparecer o erro "Unknown character 65279" no deploy, regrave `netlify.toml` em UTF-8 sem BOM (VS Code: Save with Encoding -> UTF-8).
