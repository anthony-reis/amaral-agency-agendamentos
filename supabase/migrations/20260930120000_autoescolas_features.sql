-- Módulos (feature flags) por autoescola. Chave ausente = módulo desligado,
-- então autoescolas existentes continuam exatamente como estão até a equipe
-- AmaralPro ligar cada módulo em /admin → Clientes → Editar → Módulos.
alter table public.autoescolas
  add column if not exists features jsonb not null default '{}'::jsonb;

-- Solicitações já tinha flag própria (solicitacoes_ativo) — migra o valor.
update public.autoescolas
  set features = features || jsonb_build_object('solicitacoes', true)
  where solicitacoes_ativo = true;

-- Autoescolas de teste (homolog) recebem todos os módulos ligados.
update public.autoescolas
  set features = features || jsonb_build_object(
    'vendas', true,
    'financeiro', true,
    'exames', true,
    'solicitacoes', true,
    'reserva_pos_pacote', true,
    'dashboard_aluno', true,
    'login_senha_aluno', true
  )
  where is_teste = true;
