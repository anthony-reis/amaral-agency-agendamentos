-- Otimização das telas do aluno (/aluno e /aluno/agendar): menos consultas e menos CPU na Vercel.

-- 1) Índices para as consultas por documento do aluno e por data (antes: varredura por autoescola)
create index if not exists idx_agendamentos_aluno_doc on public.agendamentos (autoescola_id, student_document);
create index if not exists idx_agendamentos_aluno_cpf on public.agendamentos (autoescola_id, cpf_cnh);
create index if not exists idx_agendamentos_escola_data on public.agendamentos (autoescola_id, date);

-- 2) Aulas concluídas por instrutor (antes: baixava TODAS as linhas concluídas e contava em JS)
create or replace function public.aulas_concluidas_por_instrutor(p_autoescola_id uuid)
returns table (instructor_name text, total int)
language sql stable security invoker set search_path = public
as $$
  select a.instructor_name, count(*)::int
  from public.agendamentos a
  where a.autoescola_id = p_autoescola_id and a.status = 'completed'
  group by a.instructor_name;
$$;

-- 3) Dashboard do aluno: estatísticas + aulas do mês numa chamada só
create or replace function public.aluno_dashboard(p_autoescola_id uuid, p_doc text, p_ano int, p_mes int)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  with base as (
    select a.id, a.date, a.time_slot, a.instructor_name, a."instructorCategory" as categoria,
           a.status, coalesce(a.tipo, 'aula') as tipo, a.km_rodado
    from public.agendamentos a
    where a.autoescola_id = p_autoescola_id
      and (a.student_document = p_doc or a.cpf_cnh = p_doc)
      and a.status <> 'cancelled'
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'aulasConcluidas', count(*) filter (where status = 'completed' and tipo <> 'banca'),
      'tentativasExame', count(*) filter (where status = 'completed' and tipo = 'banca'),
      'faltas',          count(*) filter (where status = 'absent'),
      'kmTotal',         coalesce(sum(km_rodado) filter (where status = 'completed'), 0)
    ),
    'aulas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', b.id, 'date', b.date, 'time_slot', b.time_slot, 'status', b.status,
               'tipo', b.tipo, 'instructor_name', b.instructor_name, 'instructorCategory', b.categoria)
             order by b.date, b.time_slot)
      from base b
      where b.date >= make_date(p_ano, p_mes, 1)
        and b.date <  (make_date(p_ano, p_mes, 1) + interval '1 month')::date
    ), '[]'::jsonb)
  )
  from base;
$$;

revoke all on function public.aulas_concluidas_por_instrutor(uuid) from public, anon, authenticated;
revoke all on function public.aluno_dashboard(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.aulas_concluidas_por_instrutor(uuid) to service_role;
grant execute on function public.aluno_dashboard(uuid, text, int, int) to service_role;
