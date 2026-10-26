-- Anexos do aluno: comprovantes de pagamento (ligados a uma venda) e documentos
-- avulsos enviados pelo painel. Arquivos em bucket privado; o painel gera URL
-- assinada ao exibir.
create table if not exists public.aluno_anexos (
  id uuid primary key default gen_random_uuid(),
  autoescola_id uuid not null references public.autoescolas(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  pedido_id uuid references public.pedidos_loja(id) on delete set null,
  tipo text not null default 'documento' check (tipo in ('comprovante', 'documento')),
  nome text not null,
  path text not null,
  mime text not null,
  tamanho int not null,
  enviado_por text,
  created_at timestamptz not null default now()
);

create index if not exists aluno_anexos_student_idx on public.aluno_anexos (student_id, created_at desc);
create index if not exists aluno_anexos_pedido_idx on public.aluno_anexos (pedido_id);

-- Sem policies: só a service role (servidor) acessa.
alter table public.aluno_anexos enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('alunos-anexos', 'alunos-anexos', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
