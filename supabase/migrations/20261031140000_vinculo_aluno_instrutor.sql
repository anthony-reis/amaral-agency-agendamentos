-- Vínculo aluno ↔ instrutor responsável (opcional, ligado por autoescola na aba Sistema).
-- Com a opção ligada, o aluno vinculado só agenda/remarca com o próprio instrutor.
-- (A opção "antecipar aula" fica em autoescolas.instructor_config, sem coluna nova.)

alter table public.autoescolas
  add column if not exists vincular_aluno_instrutor boolean not null default false;

alter table public.students
  add column if not exists instrutor_id uuid references public.instructors(id) on delete set null;

create index if not exists idx_students_instrutor
  on public.students (instrutor_id) where instrutor_id is not null;
