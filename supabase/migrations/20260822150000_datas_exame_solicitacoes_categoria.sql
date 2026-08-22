-- Datas de exame configuradas por categoria (A-E), pra suportar o mutirão de
-- agendamento em massa de bancas de exame.
CREATE TABLE public.datas_exame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autoescola_id UUID NOT NULL REFERENCES public.autoescolas(id) ON DELETE CASCADE,
  categoria_codigo TEXT NOT NULL CHECK (categoria_codigo IN ('A','B','C','D','E')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (autoescola_id, categoria_codigo, date)
);

CREATE INDEX idx_datas_exame_autoescola_categoria_date
  ON public.datas_exame (autoescola_id, categoria_codigo, date);

ALTER TABLE public.datas_exame ENABLE ROW LEVEL SECURITY;
-- Sem policies = deny-by-default para anon/authenticated (padrão do projeto,
-- ver 20260817200000_enable_rls_critical_tables.sql). O app usa apenas
-- SUPABASE_SERVICE_ROLE_KEY, então nenhuma policy é necessária.

-- Solicitações de exame passam a registrar categoria + data preferida, e
-- (quando agendadas via mutirão) o vínculo com a linha real em agendamentos.
ALTER TABLE public.solicitacoes
  ADD COLUMN data_preferida DATE NULL,
  ADD COLUMN agendamento_id UUID NULL REFERENCES public.agendamentos(id) ON DELETE SET NULL;
-- Sem CHECK exigindo categoria/data_preferida quando tipo='exame': já existem
-- linhas históricas com categoria NULL. Validação fica em código (criarSolicitacao).

-- Corrige a unicidade de "solicitação ativa" para ser por categoria também —
-- hoje um aluno só pode ter 1 solicitação de exame ativa no total; segregação
-- por categoria exige permitir 1 ativa POR categoria (ex: CARRO e MOTO ao
-- mesmo tempo). COALESCE trata o NULL de 'legislacao' de forma estável, já
-- que NULLs são distintos entre si em índices únicos por padrão.
DROP INDEX IF EXISTS public.uq_solicitacoes_ativa_por_tipo;

CREATE UNIQUE INDEX uq_solicitacoes_ativa_por_tipo_categoria
  ON public.solicitacoes (student_id, tipo, COALESCE(categoria, ''))
  WHERE status IN ('pendente', 'em_analise', 'agendado');
