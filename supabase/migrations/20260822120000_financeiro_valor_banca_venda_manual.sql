-- Módulo Financeiro: valor por banca do instrutor, tipo de agendamento
-- (aula normal vs banca de exame) e origem/vendedor em pedidos_loja para
-- suportar vendas manuais registradas pelo operador do painel (além das
-- vendas self-service via Mercado Pago).

ALTER TABLE public.instructors
  ADD COLUMN IF NOT EXISTS valor_banca NUMERIC;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'aula'
    CHECK (tipo IN ('aula', 'banca'));

ALTER TABLE public.pedidos_loja
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'mercado_pago'
    CHECK (origem IN ('mercado_pago', 'manual')),
  ADD COLUMN IF NOT EXISTS vendedor_user_id UUID REFERENCES public.users_painel(id) ON DELETE SET NULL;
