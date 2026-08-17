-- A revogação anterior (REVOKE ... FROM PUBLIC) não bastou: o Supabase concede
-- EXECUTE explicitamente a anon/authenticated via ALTER DEFAULT PRIVILEGES do
-- schema public, não só pelo grant implícito de PUBLIC. Revoga explicitamente.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
