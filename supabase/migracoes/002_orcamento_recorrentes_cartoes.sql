-- Migração 002: orçamento por categoria, recorrentes, parcelados e cartões de crédito.
-- Quem já rodou o schema.sql antigo roda só este arquivo no SQL Editor.
-- Precisa de Postgres 15 ou mais novo (padrão do Supabase) por causa do "set null (coluna)".

-- ---------- Orçamento mensal por categoria ----------
alter table public.categorias
  add column if not exists limite numeric(12, 2) check (limite is null or limite > 0);

-- ---------- Cartões de crédito ----------
create table if not exists public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 30),
  limite numeric(12, 2) not null check (limite > 0),
  fechamento smallint not null check (fechamento between 1 and 31),
  vencimento smallint not null check (vencimento between 1 and 31),
  cor text not null default '#24493a' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, nome)
);

-- fatura paga = linha aqui; mes é o mês de vencimento, "yyyy-mm"
create table if not exists public.faturas_pagas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cartao_id uuid not null,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  paga_em timestamptz not null default now(),
  primary key (cartao_id, mes),
  foreign key (cartao_id, user_id) references public.cartoes (id, user_id) on delete cascade
);

-- ---------- Recorrentes ("netflix todo mês") ----------
create table if not exists public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id uuid not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  descricao text not null check (char_length(trim(descricao)) between 1 and 120),
  valor numeric(12, 2) not null check (valor > 0),
  dia smallint not null check (dia between 1 and 31),
  inicio date not null default current_date,
  -- último mês já lançado; o app cria os que faltam ao abrir
  gerado_ate text check (gerado_ate is null or gerado_ate ~ '^\d{4}-\d{2}$'),
  cartao_id uuid,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (categoria_id, user_id, tipo)
    references public.categorias (id, user_id, tipo) on delete cascade,
  foreign key (cartao_id, user_id)
    references public.cartoes (id, user_id) on delete set null (cartao_id)
);

-- ---------- Colunas novas nos lançamentos ----------
alter table public.lancamentos
  add column if not exists recorrencia_id uuid,
  add column if not exists grupo uuid,
  add column if not exists parcela smallint,
  add column if not exists parcelas smallint,
  add column if not exists cartao_id uuid,
  add column if not exists fatura text check (fatura is null or fatura ~ '^\d{4}-\d{2}$');

alter table public.lancamentos
  drop constraint if exists lancamentos_parcela_ok,
  add constraint lancamentos_parcela_ok check (
    (parcela is null and parcelas is null) or (parcelas between 2 and 72 and parcela between 1 and parcelas)
  ),
  drop constraint if exists lancamentos_recorrencia_fk,
  add constraint lancamentos_recorrencia_fk foreign key (recorrencia_id, user_id)
    references public.recorrencias (id, user_id) on delete set null (recorrencia_id),
  drop constraint if exists lancamentos_cartao_fk,
  add constraint lancamentos_cartao_fk foreign key (cartao_id, user_id)
    references public.cartoes (id, user_id) on delete set null (cartao_id);

-- impede lançar duas vezes o mesmo mês de uma recorrência (dois aparelhos abertos ao mesmo tempo)
create unique index if not exists lancamentos_recorrencia_data_uk on public.lancamentos (recorrencia_id, data);
create index if not exists lancamentos_user_cartao_idx on public.lancamentos (user_id, cartao_id, fatura) where cartao_id is not null;
create index if not exists lancamentos_grupo_idx on public.lancamentos (grupo) where grupo is not null;

-- ---------- RLS ----------
alter table public.cartoes enable row level security;
alter table public.faturas_pagas enable row level security;
alter table public.recorrencias enable row level security;

drop policy if exists "cartoes: tudo nos meus" on public.cartoes;
create policy "cartoes: tudo nos meus" on public.cartoes
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "faturas: tudo nas minhas" on public.faturas_pagas;
create policy "faturas: tudo nas minhas" on public.faturas_pagas
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "recorrencias: tudo nas minhas" on public.recorrencias;
create policy "recorrencias: tudo nas minhas" on public.recorrencias
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
