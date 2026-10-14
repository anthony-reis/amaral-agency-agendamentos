-- Dias da semana em que o horário vale (ISO: 1=Seg … 7=Dom).
-- NULL (ou vazio) = todos os dias — comportamento atual dos horários já cadastrados.
alter table public.horarios_disponiveis
  add column if not exists dias_semana smallint[] null;
