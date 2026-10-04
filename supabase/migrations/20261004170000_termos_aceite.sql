-- Termos de Uso e Política de Privacidade por autoescola.
-- Cada publicação no painel vira uma versão imutável (o texto exato que o
-- aluno aceitou fica guardado). A versão vigente é a de maior `versao`.
create table if not exists public.termos_versoes (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  versao int not null,
  termos_uso text not null default '',
  politica_privacidade text not null default '',
  publicado_por text,
  created_at timestamptz not null default now(),
  unique (autoescola_id, versao)
);

-- Aceite do aluno (só no primeiro acesso). IP e dispositivo como evidência.
create table if not exists public.termos_aceites (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  termos_versao_id uuid not null references public.termos_versoes(id) on delete restrict,
  student_name text not null,
  student_document text not null,
  ip text,
  user_agent text,
  aceito_em timestamptz not null default now(),
  unique (student_id, termos_versao_id)
);

create index if not exists termos_aceites_escola_idx
  on public.termos_aceites (autoescola_id, aceito_em desc);
create index if not exists termos_aceites_student_idx
  on public.termos_aceites (student_id);

-- Sem policies: só a service role (servidor) acessa.
alter table public.termos_versoes enable row level security;
alter table public.termos_aceites enable row level security;
