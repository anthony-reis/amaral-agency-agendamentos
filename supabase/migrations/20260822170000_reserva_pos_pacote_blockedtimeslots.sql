-- Reserva pós-pacote: ao agendar aulas em massa, a autoescola pode reservar
-- os próximos N horários livres do mesmo instrutor pro mesmo aluno (via
-- blockedTimeSlots), dando tempo pro atendente tentar uma revenda antes do
-- horário ficar disponível pra qualquer outro aluno.
ALTER TABLE public."blockedTimeSlots"
  ADD COLUMN IF NOT EXISTS reserva_grupo_id UUID NULL,
  ADD COLUMN IF NOT EXISTS reserva_student_id UUID NULL REFERENCES public.students(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_blockedtimeslots_reserva_grupo
  ON public."blockedTimeSlots" (reserva_grupo_id)
  WHERE reserva_grupo_id IS NOT NULL;
