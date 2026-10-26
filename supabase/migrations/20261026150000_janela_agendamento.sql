-- Travamento: janela (dias da semana + faixas de horário) em que o aluno pode
-- agendar pelo app. NULL = sem restrição. Formato:
-- { "ativo": true, "dias": { "1": [{"inicio":"07:00","fim":"20:00"}], ... } }
alter table public.autoescolas
  add column if not exists janela_agendamento jsonb;
