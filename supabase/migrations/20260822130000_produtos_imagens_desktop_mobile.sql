-- Catálogo: imagens de vitrine por produto (desktop e mobile separadas),
-- exibidas na loja do aluno e usadas no preview do painel.

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS imagem_desktop_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_mobile_url TEXT;
