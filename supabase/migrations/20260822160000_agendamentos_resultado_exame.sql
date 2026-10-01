-- Resultado da banca de exame (aprovado/reprovado), marcado pelo instrutor no
-- dia do exame. Só é usado quando agendamentos.tipo = 'banca'.
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS resultado_exame TEXT NULL
    CHECK (resultado_exame IN ('aprovado', 'reprovado'));
