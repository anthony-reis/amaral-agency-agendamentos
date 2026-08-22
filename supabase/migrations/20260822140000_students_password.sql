-- Senha do aluno: protege identificação/compras contra uso do CPF de outra
-- pessoa. Nula para todos os alunos existentes — no próximo acesso, a senha
-- digitada é registrada como definitiva (não quebra quem já usa o app hoje).
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS password TEXT;
