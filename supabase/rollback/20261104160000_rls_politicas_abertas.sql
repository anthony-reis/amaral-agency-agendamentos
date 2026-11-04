-- ROLLBACK: recria as políticas abertas removidas por 20261104160000_seguranca_rls_e_funcoes.sql.
-- Só use se algo quebrar; elas expõem as tabelas à chave anônima.

create policy "allow_all_logs" on public."activity_logs" for all to public using (true);
create policy "allow_all" on public."activity_logs_painel" for all to public using (true);
create policy "agendamentos_all" on public."agendamentos" for all to public using (true);
create policy "agendamentos_select" on public."agendamentos" for select to public using (true);
create policy "public_read_alunos" on public."alunos_creditos_backup_12mar2026" for select to public using (true);
create policy "public_write_alunos" on public."alunos_creditos_backup_12mar2026" for all to public using (true);
create policy "blocked_all" on public."blockedTimeSlots" for all to public using (true);
create policy "blocked_select" on public."blockedTimeSlots" for select to public using (true);
create policy "public_read_historico" on public."historico_creditos" for select to public using (true);
create policy "public_write_historico" on public."historico_creditos" for all to public using (true);
create policy "instructors_all" on public."instructors" for all to public using (true);
create policy "instructors_select" on public."instructors" for select to public using (true);
create policy "Permitir atualizar pedidos" on public."pedidos" for update to public using (true);
create policy "Permitir criar pedidos" on public."pedidos" for insert to public with check (true);
create policy "Permitir ler pedidos" on public."pedidos" for select to public using (true);
create policy "Allow all access to student_credits" on public."student_credits" for all to public using (true) with check (true);
create policy "student_credits_all" on public."student_credits" for all to public using (true);
create policy "student_credits_select" on public."student_credits" for select to public using (true);
create policy "Allow all access to students" on public."students" for all to public using (true) with check (true);
create policy "students_all" on public."students" for all to public using (true);
create policy "students_select" on public."students" for select to public using (true);
create policy "allow_all_users" on public."users" for all to public using (true);
create policy "users_insert" on public."users" for insert to public with check (true);
create policy "users_select" on public."users" for select to public using (true);
create policy "users_update" on public."users" for update to public using (true);
create policy "allow_all" on public."users_painel" for all to public using (true);
create policy "vehicles_all" on public."vehicles" for all to public using (true);
create policy "vehicles_select" on public."vehicles" for select to public using (true);

grant execute on function public.vault_read_secret(uuid) to anon, authenticated;
grant execute on function public.vault_upsert_secret(uuid, text, text) to anon, authenticated;
