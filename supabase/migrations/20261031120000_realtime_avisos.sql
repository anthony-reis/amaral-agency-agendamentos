-- Avisos em tempo real (Realtime Broadcast) no lugar de polling.
-- A cada mudança em agendamentos/solicitacoes, publica um "ping" sem dados
-- no canal `autoescola:<id>:<tabela>`. O cliente só ouve o ping e busca os dados pelas
-- server actions — nada da linha vai pelo canal, então não depende de RLS.
create or replace function public.avisar_mudanca()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_autoescola uuid;
begin
  v_autoescola := coalesce(
    case when tg_op = 'DELETE' then old.autoescola_id else new.autoescola_id end,
    null
  );
  if v_autoescola is null then
    return null;
  end if;

  begin
    perform realtime.send(
      jsonb_build_object('tabela', tg_table_name),
      'mudou',
      'autoescola:' || v_autoescola::text || ':' || tg_table_name,
      false
    );
  exception when others then
    -- o aviso nunca pode derrubar a escrita
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_avisar_agendamentos on public.agendamentos;
create trigger trg_avisar_agendamentos
  after insert or update or delete on public.agendamentos
  for each row execute function public.avisar_mudanca();

drop trigger if exists trg_avisar_solicitacoes on public.solicitacoes;
create trigger trg_avisar_solicitacoes
  after insert or update or delete on public.solicitacoes
  for each row execute function public.avisar_mudanca();
