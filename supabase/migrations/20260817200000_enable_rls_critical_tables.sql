-- Corrige exposição crítica: 9 tabelas com RLS desabilitado eram acessíveis
-- (leitura E escrita) via API REST pública do Supabase usando a chave anon,
-- incluindo instructor_passwords (senhas em texto puro).
--
-- ENABLE ROW LEVEL SECURITY sem policies = deny-by-default para os roles
-- anon/authenticated usados pelo PostgREST. O app usa exclusivamente
-- SUPABASE_SERVICE_ROLE_KEY (bypassa RLS por design), então nenhuma
-- funcionalidade existente é afetada.

ALTER TABLE public.instructor_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_disponiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_backup_10mar2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoescolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoescola_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_lidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_lidos_instrutor ENABLE ROW LEVEL SECURITY;

-- View rodava como SECURITY DEFINER (padrão legado do Postgres), ignorando
-- RLS de quem consulta. Não há lógica que dependa disso; troca para
-- SECURITY INVOKER (respeita RLS do role que consulta).
ALTER VIEW public.students_with_credits SET (security_invoker = true);

-- handle_new_user() é um trigger de auth.users (SECURITY DEFINER) e não deveria
-- ser chamável diretamente via RPC por anon/authenticated. Revogar o EXECUTE
-- implícito de PUBLIC não afeta o disparo do trigger (que não depende de grant).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
