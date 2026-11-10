-- Vínculo aluno ↔ instrutor por modalidade: quem faz Carro e Moto pode ter um
-- instrutor de cada. Substitui o uso de students.instrutor_id (coluna mantida,
-- sem uso, para não perder o histórico).
create table if not exists public.aluno_instrutores (
  student_id uuid not null references public.students(id) on delete cascade,
  categoria text not null check (categoria in ('CARRO', 'MOTO')),
  instrutor_id uuid not null references public.instructors(id) on delete cascade,
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, categoria)
);

create index if not exists idx_aluno_instrutores_instrutor on public.aluno_instrutores (instrutor_id);
create index if not exists idx_aluno_instrutores_escola on public.aluno_instrutores (autoescola_id);

-- Sem policies: só a service role (servidor) acessa.
alter table public.aluno_instrutores enable row level security;

-- Copia os vínculos já existentes: instrutor de Moto → MOTO; AMBOS → os dois; demais → CARRO
insert into public.aluno_instrutores (student_id, categoria, instrutor_id, autoescola_id)
select s.id, m.categoria, s.instrutor_id, s.autoescola_id
from public.students s
join public.instructors i on i.id = s.instrutor_id
cross join lateral unnest(
  case upper(coalesce(i.category, ''))
    when 'MOTO' then array['MOTO']
    when 'AMBOS' then array['CARRO', 'MOTO']
    else array['CARRO']
  end
) as m(categoria)
where s.instrutor_id is not null
on conflict do nothing;
