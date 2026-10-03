-- Selfie + assinatura do aluno ao criar solicitação (exame/legislação).
-- Guardamos só o caminho no storage; o painel gera URL assinada ao exibir.
alter table public.solicitacoes
  add column if not exists foto_path text,
  add column if not exists assinatura_path text;

-- Bucket privado (selfie do aluno não deve ficar acessível por link público).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('solicitacoes-evidencias', 'solicitacoes-evidencias', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
