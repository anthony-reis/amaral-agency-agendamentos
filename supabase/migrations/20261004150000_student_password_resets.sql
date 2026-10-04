-- Recuperação de senha do aluno (módulo login_senha_aluno): código de 6
-- dígitos enviado por e-mail. Guardamos só o hash do código.
create table if not exists public.student_password_resets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_password_resets_student_idx
  on public.student_password_resets (student_id, created_at desc);

-- Sem policies: só a service role (servidor) lê/escreve. A anon key pública
-- não enxerga os hashes.
alter table public.student_password_resets enable row level security;
