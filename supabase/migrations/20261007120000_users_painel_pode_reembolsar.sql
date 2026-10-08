-- Reembolso de vendas é uma permissão individual, concedida só pela equipe
-- AmaralPro no /admin (Clientes → Usuários). Não vem de perfil nenhum.
-- Todos começam sem a permissão.
alter table public.users_painel
  add column if not exists pode_reembolsar boolean not null default false;
