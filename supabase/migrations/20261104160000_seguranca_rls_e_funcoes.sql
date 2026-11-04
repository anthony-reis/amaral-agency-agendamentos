-- Segurança: o app acessa o banco só pelo servidor (service role, que ignora RLS) e o
-- navegador só usa Realtime Broadcast. Políticas "USING (true)" para o papel público
-- deixavam a chave anônima (que vai no navegador) ler/gravar tabelas inteiras
-- (users_painel e instructors com senhas, students, agendamentos, créditos, logs).
-- Rollback: supabase/rollback/20261104160000_rls_politicas_abertas.sql
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and (qual = 'true' or with_check = 'true')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Funções SECURITY DEFINER não devem ser chamáveis por /rest/v1/rpc com a chave pública.
-- O service_role (usado pelo servidor do app) mantém o EXECUTE.
revoke execute on function public.vault_read_secret(uuid) from public, anon, authenticated;
revoke execute on function public.vault_upsert_secret(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.avisar_mudanca() from public, anon, authenticated;
revoke execute on function public.avisar_aviso_aluno() from public, anon, authenticated;
revoke execute on function public.avisar_aviso_instrutor() from public, anon, authenticated;
revoke execute on function public.gerar_aviso_instrutor() from public, anon, authenticated;
revoke execute on function public.disparar_push_aviso() from public, anon, authenticated;
