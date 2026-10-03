-- Perfis (roles) do painel da autoescola: um usuário pode ter vários.
-- users_painel.perfis guarda códigos de perfis prontos (definidos no código,
-- src/lib/permissoes.ts) e/ou ids de perfis personalizados (painel_perfis).
alter table public.users_painel
  add column if not exists perfis text[] not null default '{}';

-- Migra quem já existe sem mudar o acesso atual:
-- admin/super_admin/operador tinham acesso total; visualizador só leitura.
update public.users_painel
  set perfis = case when role = 'visualizador' then array['visualizador'] else array['gestor'] end
  where perfis = '{}';

-- Perfis personalizados por autoescola (criados no /admin).
create table if not exists public.painel_perfis (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  nome text not null,
  descricao text,
  permissoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (autoescola_id, nome)
);

create index if not exists painel_perfis_autoescola_idx on public.painel_perfis (autoescola_id);

-- Mesmo padrão das tabelas críticas: RLS ligado, sem políticas (só service_role).
alter table public.painel_perfis enable row level security;
