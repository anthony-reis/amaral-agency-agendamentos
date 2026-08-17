-- Credenciais do Mercado Pago por autoescola passam a ser armazenadas via
-- Supabase Vault (criptografadas em repouso, chave fora do banco) em vez de
-- colunas de texto simples. autoescola_pagamentos tinha 0 linhas no momento
-- desta migration — não há dado de produção para migrar.
--
-- As colunas antigas mp_access_token/mp_webhook_secret são mantidas (nullable,
-- não usadas pelo código novo) para não exigir coordenação de deploy; podem
-- ser removidas numa migration futura depois de confirmado em produção.

ALTER TABLE public.autoescola_pagamentos
  ADD COLUMN mp_access_token_secret_id UUID,
  ADD COLUMN mp_webhook_secret_id UUID;

ALTER TABLE public.autoescola_pagamentos
  ALTER COLUMN mp_access_token DROP NOT NULL,
  ALTER COLUMN mp_webhook_secret DROP NOT NULL;

-- Wrappers em public (schema exposto ao PostgREST) para o schema vault, que não
-- é exposto diretamente. SECURITY DEFINER + EXECUTE restrito a service_role.

CREATE OR REPLACE FUNCTION public.vault_upsert_secret(
  p_secret_id UUID,
  p_secret TEXT,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF p_secret_id IS NULL THEN
    v_id := vault.create_secret(p_secret, p_name);
  ELSE
    PERFORM vault.update_secret(p_secret_id, p_secret);
    v_id := p_secret_id;
  END IF;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vault_read_secret(p_secret_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $function$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = p_secret_id;
$function$;

REVOKE ALL ON FUNCTION public.vault_upsert_secret(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vault_read_secret(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_upsert_secret(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_read_secret(UUID) TO service_role;
