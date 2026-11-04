-- Avisos do instrutor (aula agendada / desmarcada / remarcada), gerados por trigger
-- em `agendamentos` (cobre aluno, painel, massa e instrutor sem mexer em cada fluxo),
-- ping Realtime no canal do instrutor e inscrições de Web Push (aluno e instrutor).

create table if not exists public.avisos_instrutor (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null,
  instructor_id uuid not null,
  tipo text not null check (tipo in ('aula_agendada','aula_cancelada','aula_remarcada')),
  titulo text not null,
  mensagem text not null,
  agendamento_id uuid,
  lido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists avisos_instrutor_pendentes_idx
  on public.avisos_instrutor (instructor_id, created_at desc) where lido_em is null;
alter table public.avisos_instrutor enable row level security;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null,
  perfil text not null check (perfil in ('aluno','instrutor')),
  owner_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_owner_idx on public.push_subscriptions (perfil, owner_id);
alter table public.push_subscriptions enable row level security;

-- Gera o aviso do instrutor a partir das mudanças em agendamentos
create or replace function public.gerar_aviso_instrutor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instr uuid;
  v_tipo text;
  v_titulo text;
  v_msg text;
  v_aluno text;
  v_data text;
begin
  begin
    if new.instructor_name is null then return null; end if;
    select id into v_instr from public.instructors
      where autoescola_id = new.autoescola_id and name = new.instructor_name limit 1;
    if v_instr is null then return null; end if;

    v_aluno := coalesce(new.student_name, 'Um aluno');
    v_data := to_char(new.date::date, 'DD/MM');

    if tg_op = 'INSERT' then
      if new.status not in ('scheduled','confirmed') then return null; end if;
      v_tipo := 'aula_agendada';
      v_titulo := 'Nova aula agendada';
      v_msg := v_aluno || ' agendou aula em ' || v_data || ' às ' || new.time_slot || '.';
    elsif tg_op = 'UPDATE' then
      if new.status = 'cancelled' and old.status <> 'cancelled' then
        v_tipo := 'aula_cancelada';
        v_titulo := 'Aula desmarcada';
        v_msg := 'A aula de ' || v_aluno || ' em ' || v_data || ' às ' || new.time_slot || ' foi desmarcada.';
      elsif new.status in ('scheduled','confirmed')
        and old.status in ('scheduled','confirmed')
        and (new.date <> old.date or new.time_slot <> old.time_slot) then
        v_tipo := 'aula_remarcada';
        v_titulo := 'Aula remarcada';
        v_msg := 'A aula de ' || v_aluno || ' mudou de ' || to_char(old.date::date, 'DD/MM') || ' às ' || old.time_slot
          || ' para ' || v_data || ' às ' || new.time_slot || '.';
      else
        return null;
      end if;
    end if;

    if v_tipo is null then return null; end if;

    insert into public.avisos_instrutor (autoescola_id, instructor_id, tipo, titulo, mensagem, agendamento_id)
    values (new.autoescola_id, v_instr, v_tipo, v_titulo, v_msg, new.id);
  exception when others then
    -- o aviso nunca pode derrubar a escrita do agendamento
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_gerar_aviso_instrutor on public.agendamentos;
create trigger trg_gerar_aviso_instrutor
  after insert or update on public.agendamentos
  for each row execute function public.gerar_aviso_instrutor();

-- Ping Realtime no canal do instrutor (sem dados: o app busca o estado atual)
create or replace function public.avisar_aviso_instrutor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('tabela', 'avisos'),
      'mudou',
      'instrutor:' || new.instructor_id::text || ':avisos',
      false
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_avisar_avisos_instrutor on public.avisos_instrutor;
create trigger trg_avisar_avisos_instrutor
  after insert on public.avisos_instrutor
  for each row execute function public.avisar_aviso_instrutor();
