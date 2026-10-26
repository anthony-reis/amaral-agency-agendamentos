-- Linha do tempo das aulas agendadas pelo aluno: cada agendamento e cada
-- remarcação guarda o antes e o depois (a linha de `agendamentos` é
-- sobrescrita ao remarcar, então sem isto o horário original se perde).
create table if not exists public.agendamento_historico (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  agendamento_id uuid not null,
  student_id uuid,
  student_name text,
  tipo text not null check (tipo in ('agendado', 'reagendado')),
  origem text not null default 'aluno' check (origem in ('aluno', 'painel')),
  de_date date,
  de_time_slot text,
  de_instrutor text,
  de_categoria text,
  para_date date not null,
  para_time_slot text not null,
  para_instrutor text,
  para_categoria text,
  feito_por text,
  created_at timestamptz not null default now()
);

create index if not exists agendamento_historico_agendamento_idx on public.agendamento_historico (agendamento_id, created_at);
create index if not exists agendamento_historico_student_idx on public.agendamento_historico (student_id, created_at desc);

-- Sem policies: só a service role (servidor) acessa.
alter table public.agendamento_historico enable row level security;
