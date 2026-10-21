-- Câmbio (MANUAL | AUTOMATICO) do instrutor de carro e do aluno.
-- NULL = sem restrição (instrutor atende qualquer aluno / aluno vê qualquer instrutor).
-- Só vale quando o módulo `separar_cambio` está ligado na autoescola.
alter table public.instructors
  add column if not exists cambio text null check (cambio in ('MANUAL', 'AUTOMATICO'));

alter table public.students
  add column if not exists cambio text null check (cambio in ('MANUAL', 'AUTOMATICO'));
