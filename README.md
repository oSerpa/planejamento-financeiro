# Planejamento Financeiro

App pessoal de controle financeiro (web + celular).

## Rodar

```bash
npm install
npm run dev
```

## Stack

React 19, Vite, TypeScript, React Router. Fontes Fraunces (títulos e valores) e Instrument Sans (texto).
Por enquanto os dados são mockados em `src/data/mock.ts`; no passo 2 entra o Supabase.

## Estrutura

- `src/styles/tokens.css`: paleta, raios, sombras, tema claro e escuro
- `src/components`: Shell (navegação), Valor, Barra, ItemLancamento, NovoLancamento
- `src/pages`: Início, Lançamentos, Metas
