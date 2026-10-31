-- Solicitações: novo tipo "psicotecnico" e fluxo de boleto/comprovante.
-- Fluxo: autoescola anexa o boleto (aguardando_pagamento) → aluno paga e anexa o
-- comprovante (comprovante_enviado) → autoescola conclui (agendado) ou recusa.

alter table public.solicitacoes drop constraint if exists solicitacoes_tipo_check;
alter table public.solicitacoes add constraint solicitacoes_tipo_check
  check (tipo = any (array['exame', 'legislacao', 'psicotecnico']));

alter table public.solicitacoes drop constraint if exists solicitacoes_status_check;
alter table public.solicitacoes add constraint solicitacoes_status_check
  check (status = any (array[
    'pendente', 'em_analise', 'aguardando_pagamento', 'comprovante_enviado',
    'agendado', 'recusado', 'cancelado'
  ]));

alter table public.solicitacoes_eventos drop constraint if exists solicitacoes_eventos_tipo_evento_check;
alter table public.solicitacoes_eventos add constraint solicitacoes_eventos_tipo_evento_check
  check (tipo_evento = any (array[
    'criada', 'visualizada', 'em_analise', 'agendada', 'recusada', 'cancelada', 'mensagem',
    'boleto_enviado', 'comprovante_enviado'
  ]));

-- Solicitação "ativa" (impede duplicar) agora inclui os dois novos status.
drop index if exists public.uq_solicitacoes_ativa_por_tipo_categoria;
create unique index uq_solicitacoes_ativa_por_tipo_categoria
  on public.solicitacoes (student_id, tipo, coalesce(categoria, ''))
  where status = any (array[
    'pendente', 'em_analise', 'aguardando_pagamento', 'comprovante_enviado', 'agendado'
  ]);

-- Arquivos trocados na solicitação (bucket privado `alunos-anexos`).
create table if not exists public.solicitacoes_arquivos (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes(id) on delete cascade,
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  tipo text not null check (tipo in ('boleto', 'comprovante')),
  path text not null,
  nome text not null,
  mime text not null,
  tamanho integer not null,
  autor_tipo text not null check (autor_tipo in ('aluno', 'painel')),
  autor_nome text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_solicitacoes_arquivos_solicitacao
  on public.solicitacoes_arquivos (solicitacao_id, created_at);

-- Acesso só pelo servidor (service role); sem policies.
alter table public.solicitacoes_arquivos enable row level security;
