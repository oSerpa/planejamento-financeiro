-- Passo 2: categorias e lançamentos, cada usuário só enxerga os próprios dados.
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).

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
