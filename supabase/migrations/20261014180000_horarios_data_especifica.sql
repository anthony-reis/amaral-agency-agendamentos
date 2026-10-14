-- Horário pontual: quando `data` está preenchida, o horário vale só naquele dia (não repete toda semana).
-- NULL = horário recorrente (comportamento de todos os horários já cadastrados).
alter table public.horarios_disponiveis
  add column if not exists data date null;

create index if not exists horarios_disponiveis_data_idx
  on public.horarios_disponiveis (autoescola_id, data)
  where data is not null;
