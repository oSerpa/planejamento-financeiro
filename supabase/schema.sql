-- Banco completo: categorias, lançamentos, orçamento, recorrentes, parcelados e cartões.
-- Projeto novo: rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).
-- Quem já tinha rodado a versão antiga roda só supabase/migracoes/002_orcamento_recorrentes_cartoes.sql.

-- ---------- Categorias ----------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  tipo text not null check (tipo in ('entrada', 'saida')),
  cor text not null default '#8A928C' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  icone text not null default 'circle',
  criado_em timestamptz not null default now(),
  -- permite a FK composta abaixo (garante mesma pessoa e mesmo tipo)
  unique (id, user_id, tipo),
  unique (user_id, tipo, nome)
);

-- ---------- Lançamentos ----------
create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id uuid not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  descricao text not null check (char_length(trim(descricao)) between 1 and 120),
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default current_date,
  conta text check (conta is null or char_length(conta) <= 40),
  criado_em timestamptz not null default now(),
  -- a categoria tem que ser do mesmo usuário e do mesmo tipo do lançamento
  foreign key (categoria_id, user_id, tipo)
    references public.categorias (id, user_id, tipo) on delete restrict
);

create index if not exists lancamentos_user_data_idx on public.lancamentos (user_id, data desc);

-- ---------- RLS: cada um só mexe no que é seu ----------
alter table public.categorias enable row level security;
alter table public.lancamentos enable row level security;

create policy "categorias: ler as minhas" on public.categorias
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "categorias: criar as minhas" on public.categorias
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categorias: editar as minhas" on public.categorias
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categorias: apagar as minhas" on public.categorias
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "lancamentos: ler os meus" on public.lancamentos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lancamentos: criar os meus" on public.lancamentos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lancamentos: editar os meus" on public.lancamentos
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lancamentos: apagar os meus" on public.lancamentos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Categorias padrão para quem acabou de criar conta ----------
create or replace function public.criar_categorias_padrao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categorias (user_id, nome, tipo, cor, icone) values
    (new.id, 'Salário',     'entrada', '#3F7D58', 'briefcase'),
    (new.id, 'Freela',      'entrada', '#6B8F3A', 'laptop'),
    (new.id, 'Outras entradas', 'entrada', '#8A928C', 'circle'),
    (new.id, 'Moradia',     'saida',   '#C2553A', 'home'),
    (new.id, 'Mercado',     'saida',   '#D08A2E', 'cart'),
    (new.id, 'Alimentação', 'saida',   '#B8642E', 'food'),
    (new.id, 'Transporte',  'saida',   '#4E6E8E', 'bus'),
    (new.id, 'Lazer',       'saida',   '#8C5A9E', 'ticket'),
    (new.id, 'Saúde',       'saida',   '#3E8E8A', 'heart'),
    (new.id, 'Assinaturas', 'saida',   '#9A6B4F', 'repeat'),
    (new.id, 'Estudos',     'saida',   '#5A6BB0', 'book'),
    (new.id, 'Outros gastos', 'saida', '#8A928C', 'circle');
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_categorias_padrao();


-- =====================================================================

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

-- ---------- Permissões ----------
-- Projetos novos do Supabase não dão acesso automático às tabelas para quem está logado.
-- O RLS acima continua decidindo quais linhas cada um vê; isso só libera o acesso à tabela.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.categorias, public.lancamentos, public.cartoes, public.faturas_pagas, public.recorrencias
  to authenticated;
