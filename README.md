# Planejamento Financeiro

App pessoal de controle financeiro (web + celular).

## Rodar

```bash
npm install
npm run dev
```

## Stack

React 19, Vite, TypeScript, React Router. Fontes Fraunces (títulos e valores) e Instrument Sans (texto).
Login e dados (lançamentos e categorias) ficam no Supabase. Metas ainda são mockadas em `src/data/mock.ts` (passo 3).

## Ligar o Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (plano gratuito serve).
2. No projeto, abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e rode. Isso cria as tabelas, as regras de acesso (cada usuário só vê os próprios dados) e as categorias padrão de quem criar conta.
3. Copie `.env.example` para `.env.local` e preencha:
   - `VITE_SUPABASE_URL`: a Project URL (Project Settings > Data API).
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: a chave publishable (Project Settings > API Keys). Se o projeto só mostrar as chaves antigas, use a `anon`.
   Nunca use a chave `secret`/`service_role` aqui.
4. Em **Authentication > URL Configuration**, coloque `http://localhost:5173` como Site URL (depois troque pelo endereço publicado).
5. Rode `npm run dev`, crie sua conta e confirme pelo link que chega no e-mail.

Se quiser pular a confirmação por e-mail enquanto testa, desligue **Confirm email** em Authentication > Sign In / Providers > Email.

## Estrutura

- `src/styles/tokens.css`: paleta, raios, sombras, tema claro e escuro
- `src/components`: Shell (navegação), Valor, Barra, ItemLancamento, NovoLancamento (cria e edita), SeletorMes
- `src/pages`: Início, Lançamentos, Metas, Ajustes (categorias e sair), Entrar
- `src/data/auth.tsx`: sessão do Supabase
- `src/data/store.tsx`: leitura e escrita de lançamentos e categorias do mês
- `supabase/schema.sql`: tabelas, RLS e categorias padrão
