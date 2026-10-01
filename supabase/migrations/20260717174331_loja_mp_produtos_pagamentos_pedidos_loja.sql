-- Snapshot documental do schema da loja de pacotes (Checkout Pro / Mercado Pago).
-- As tabelas já existem em produção (criadas via commit 3c39839, sem migration
-- versionada na época) — este arquivo só traz o schema para o controle de
-- versão do git, usando IF NOT EXISTS para ser seguro de rodar de novo.
-- As colunas mp_access_token_secret_id/mp_webhook_secret_id (Vault) foram
-- adicionadas depois, em 20260817200300_vault_credenciais_mp.sql.

CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autoescola_id UUID NOT NULL REFERENCES public.autoescolas(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo = ANY (ARRAY['pacote', 'avulsa', 'servico'])),
  automatico BOOLEAN NOT NULL DEFAULT false,
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos > 0),
  qtd_cat_a INTEGER NOT NULL DEFAULT 0 CHECK (qtd_cat_a >= 0),
  qtd_cat_b INTEGER NOT NULL DEFAULT 0 CHECK (qtd_cat_b >= 0),
  qtd_cat_c INTEGER NOT NULL DEFAULT 0 CHECK (qtd_cat_c >= 0),
  qtd_cat_d INTEGER NOT NULL DEFAULT 0 CHECK (qtd_cat_d >= 0),
  qtd_cat_e INTEGER NOT NULL DEFAULT 0 CHECK (qtd_cat_e >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.autoescola_pagamentos (
  autoescola_id UUID PRIMARY KEY REFERENCES public.autoescolas(id),
  mp_access_token TEXT,
  mp_public_key TEXT,
  mp_webhook_secret TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  sandbox BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.autoescola_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pedidos_loja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autoescola_id UUID NOT NULL REFERENCES public.autoescolas(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_snapshot JSONB NOT NULL,
  valor_centavos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status = ANY (ARRAY['pendente', 'aprovado', 'rejeitado', 'cancelado', 'expirado', 'reembolsado'])),
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  payment_method TEXT,
  creditos_liberados BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_loja ENABLE ROW LEVEL SECURITY;
