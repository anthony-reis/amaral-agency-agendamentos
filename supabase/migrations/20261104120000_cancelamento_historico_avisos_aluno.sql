-- Cancelamentos passam a entrar na linha do tempo da aula / atividade do aluno
-- e o aluno é avisado quando uma aula é desmarcada ou remarcada pela escola.

alter table public.agendamento_historico drop constraint if exists agendamento_historico_tipo_check;
alter table public.agendamento_historico
  add constraint agendamento_historico_tipo_check check (tipo in ('agendado', 'reagendado', 'cancelado'));

-- Cancelamento não tem "para": relaxa as colunas de destino.
alter table public.agendamento_historico alter column para_date drop not null;
alter table public.agendamento_historico alter column para_time_slot drop not null;

alter table public.agendamento_historico add column if not exists motivo text;

-- Avisos para o aluno (aula desmarcada/remarcada pela escola ou instrutor)
create table if not exists public.avisos_aluno (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  student_id uuid not null,
  tipo text not null check (tipo in ('aula_cancelada', 'aula_remarcada')),
  titulo text not null,
  mensagem text not null,
  agendamento_id uuid,
  lido_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists avisos_aluno_student_idx on public.avisos_aluno (student_id, created_at desc);
alter table public.avisos_aluno enable row level security;

-- Ping em tempo real para o canal do aluno quando chega um aviso
create or replace function public.avisar_aviso_aluno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('tabela', 'agendamentos'),
      'mudou',
      'aluno:' || new.student_id::text || ':agendamentos',
      false
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_avisar_avisos_aluno on public.avisos_aluno;
create trigger trg_avisar_avisos_aluno
  after insert on public.avisos_aluno
  for each row execute function public.avisar_aviso_aluno();
