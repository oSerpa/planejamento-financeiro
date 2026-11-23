# Planejamento Financeiro

App pessoal de controle financeiro (web + celular).

## Rodar

```bash
npm install
npm run dev
```

## Stack

React 19, Vite, TypeScript, React Router. Fontes Bricolage Grotesque (títulos e valores) e Instrument Sans (texto).
Login e dados (lançamentos, categorias, orçamentos, recorrentes e cartões) ficam no Supabase. Metas ainda são mockadas em `src/data/mock.ts` (passo 3).

## Modo demonstração

Sem o `.env.local`, o app abre direto com dados de exemplo em memória (três meses de lançamentos). Dá para criar, editar e apagar, mas tudo some ao recarregar.

## Ligar o Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (plano gratuito serve).
2. No projeto, abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e rode. Isso cria as tabelas, as regras de acesso (cada usuário só vê os próprios dados) e as categorias padrão de quem criar conta.
3. Copie `.env.example` para `.env.local` e preencha:
   - `VITE_SUPABASE_URL`: a Project URL (Project Settings > Data API).
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: a chave publishable (Project Settings > API Keys). Se o projeto só mostrar as chaves antigas, use a `anon`.
   Nunca use a chave `secret`/`service_role` aqui.
4. Em **Authentication > URL Configuration**, coloque `http://localhost:5173` como Site URL (depois troque pelo endereço publicado).
5. Rode `npm run dev`, crie sua conta e confirme pelo link que chega no e-mail.

Já rodou o `schema.sql` antigo antes desta versão? Rode só `supabase/migracoes/002_orcamento_recorrentes_cartoes.sql` no SQL Editor.

Se quiser pular a confirmação por e-mail enquanto testa, desligue **Confirm email** em Authentication > Sign In / Providers > Email.

## Funções

- Chat na tela inicial: "gastei 35 no ifood", "netflix 55 todo mês", "tv 2000 em 10x no nubank", "orçamento mercado 800", "orçamentos", "faturas".
- Orçamento mensal por categoria, com aviso aos 80% e ao passar do limite (no Resumo e no cartão do chat).
- Recorrentes: lançam sozinhos no dia certo ao abrir o app. Parar em Ajustes não apaga o que já saiu.
- Parcelados: a compra vira uma parcela por mês; no cartão, cada parcela cai numa fatura.
- Cartões: limite disponível, fatura aberta, fechadas e próximas, marcar como paga.
- Resumo comparado ao mês anterior (no mês atual compara até o mesmo dia) e maiores gastos.
- Extrato com período (mês, 3 meses, ano, datas livres), filtros por categoria, cartão e valor, e exportar CSV.

## Estrutura

- `src/styles/tokens.css`: paleta, raios, sombras, tema claro e escuro
- `src/components`: Shell (navegação), Valor, Barra, ItemLancamento, NovoLancamento (cria e edita), SeletorMes
- `src/pages`: Chat (tela inicial), Início (resumo em /resumo), Lançamentos, Metas, Ajustes (categorias, palavras aprendidas e sair), Entrar
- `src/lib/interpretar.ts`: lê frases do chat ("gastei 35 no ifood") por palavras-chave, sem IA paga e offline
- `src/data/auth.tsx`: sessão do Supabase
- `src/data/store.tsx`: estado do app em cima de um `Backend` (Supabase em `backend.ts`, memória em `demo.ts`)
- `src/lib/financas.ts`: regras de fatura, parcelas, recorrência, orçamento e CSV
- `supabase/schema.sql`: tabelas, RLS e categorias padrão
