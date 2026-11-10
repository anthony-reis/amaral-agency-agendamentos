-- Calendário do painel: uma chamada só (antes: 2 consultas + agregação em JS no servidor da Vercel).
-- Move o trabalho para o Postgres (Supabase) e reduz a CPU ativa da Vercel.
create or replace function public.calendario_mes(p_autoescola_id uuid, p_ano int, p_mes int)
returns table (dia text, total int, bloqueado boolean)
language sql
stable
security invoker
set search_path = public
as $$
  with limites as (
    select make_date(p_ano, p_mes, 1) as ini,
           (make_date(p_ano, p_mes, 1) + interval '1 month' - interval '1 day')::date as fim
  ),
  dias as (
    select d::date as dia from limites, generate_series(limites.ini, limites.fim, interval '1 day') d
  ),
  ag as (
    select a.date as dia, count(*)::int as total
    from public.agendamentos a, limites l
    where a.autoescola_id = p_autoescola_id
      and a.date between l.ini and l.fim
      and a.status <> 'cancelled'
    group by a.date
  ),
  bl as (
    select distinct b."date" as dia
    from public."blockedTimeSlots" b, limites l
    where b.autoescola_id = p_autoescola_id
      and b."date" between to_char(l.ini, 'YYYY-MM-DD') and to_char(l.fim, 'YYYY-MM-DD')
  )
  select to_char(dias.dia, 'YYYY-MM-DD'),
         coalesce(ag.total, 0),
         (bl.dia is not null)
  from dias
  left join ag on ag.dia = dias.dia
  left join bl on bl.dia = to_char(dias.dia, 'YYYY-MM-DD')
  order by dias.dia;
$$;

revoke all on function public.calendario_mes(uuid, int, int) from public, anon, authenticated;
grant execute on function public.calendario_mes(uuid, int, int) to service_role;
