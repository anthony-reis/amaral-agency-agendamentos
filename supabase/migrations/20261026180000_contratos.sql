-- Contrato de prestação de serviço: modelo por autoescola (versionado), contratos
-- enviados ao aluno para assinar pelo portal (assinatura + selfie) e contratos
-- assinados no papel e anexados pela equipe. Módulo `contratos` (features).

create table if not exists public.contrato_modelos (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  versao int not null,
  titulo text not null,
  texto text not null,
  publicado_por text,
  created_at timestamptz not null default now(),
  unique (autoescola_id, versao)
);

create table if not exists public.contratos_aluno (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  origem text not null check (origem in ('digital', 'anexado')),
  status text not null default 'pendente' check (status in ('pendente', 'assinado', 'cancelado')),
  titulo text not null,
  -- digital: texto exato enviado ao aluno (campos já preenchidos) + hash dele
  texto text,
  texto_hash text,
  modelo_versao int,
  enviado_por text,
  created_at timestamptz not null default now(),
  -- evidências da assinatura digital
  assinado_em timestamptz,
  ip text,
  user_agent text,
  foto_path text,
  assinatura_path text,
  -- anexado: arquivo do contrato assinado no papel
  anexo_id uuid references public.aluno_anexos(id) on delete set null,
  cancelado_em timestamptz,
  cancelado_por text
);

create index if not exists contratos_aluno_student_idx on public.contratos_aluno (student_id, created_at desc);
create index if not exists contratos_aluno_escola_idx on public.contratos_aluno (autoescola_id, status);

-- Sem policies: só a service role (servidor) acessa.
alter table public.contrato_modelos enable row level security;
alter table public.contratos_aluno enable row level security;

-- O contrato assinado no papel é um anexo do aluno
alter table public.aluno_anexos drop constraint if exists aluno_anexos_tipo_check;
alter table public.aluno_anexos
  add constraint aluno_anexos_tipo_check check (tipo in ('comprovante', 'documento', 'contrato'));

-- Selfie e assinatura da assinatura digital (bucket privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos-evidencias', 'contratos-evidencias', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
