-- Avisos v2: novos eventos para aluno e instrutor, agrupamento de rajadas (sem custo extra),
-- lembretes por pg_cron (dentro do banco, sem chamar a Vercel) e limpeza semanal.
-- Custo: nenhum serviço novo. O push só chama o app quando o dono tem aparelho inscrito.

create extension if not exists pg_cron;

-- ── Tipos novos e colunas de agrupamento ─────────────────────────────────────
alter table public.avisos_aluno drop constraint if exists avisos_aluno_tipo_check;
alter table public.avisos_aluno add constraint avisos_aluno_tipo_check check (tipo in (
  'aula_cancelada','aula_remarcada','aula_agendada','falta','solicitacao',
  'pagamento','credito','contrato','lembrete_dia','lembrete_hora'));
alter table public.avisos_aluno add column if not exists qtd int not null default 1;
create unique index if not exists avisos_aluno_lembrete_uk
  on public.avisos_aluno (agendamento_id, tipo) where tipo in ('lembrete_dia','lembrete_hora');

alter table public.avisos_instrutor drop constraint if exists avisos_instrutor_tipo_check;
alter table public.avisos_instrutor add constraint avisos_instrutor_tipo_check check (tipo in (
  'aula_agendada','aula_cancelada','aula_remarcada','horario_bloqueado','lembrete_dia'));
alter table public.avisos_instrutor add column if not exists qtd int not null default 1;
alter table public.avisos_instrutor add column if not exists chave text;
create unique index if not exists avisos_instrutor_lembrete_uk
  on public.avisos_instrutor (instructor_id, tipo, chave) where tipo = 'lembrete_dia';

-- ── Rótulo para mensagens agrupadas ──────────────────────────────────────────
create or replace function public.rotulo_aviso(p_tipo text)
returns text language sql immutable set search_path = '' as $$
  select case p_tipo
    when 'aula_agendada' then 'aulas agendadas'
    when 'aula_cancelada' then 'aulas desmarcadas'
    when 'aula_remarcada' then 'aulas remarcadas'
    when 'falta' then 'faltas registradas'
    when 'horario_bloqueado' then 'horários bloqueados'
    else 'avisos' end
$$;

-- ── Registro de aviso com agrupamento (rajadas viram um único aviso/push) ────
create or replace function public.registrar_aviso_aluno(
  p_autoescola uuid, p_student uuid, p_tipo text, p_titulo text, p_msg text,
  p_agend uuid default null, p_agrupar boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_agrupar then
    update public.avisos_aluno a set
      qtd = a.qtd + 1,
      titulo = initcap(public.rotulo_aviso(p_tipo)),
      mensagem = (a.qtd + 1) || ' ' || public.rotulo_aviso(p_tipo) || '. Veja os detalhes no app.'
    where a.id = (
      select id from public.avisos_aluno
      where student_id = p_student and autoescola_id = p_autoescola and tipo = p_tipo
        and lido_em is null and created_at > now() - interval '2 minutes'
      order by created_at desc limit 1)
    returning a.id into v_id;
    if v_id is not null then return; end if;
  end if;
  insert into public.avisos_aluno (autoescola_id, student_id, tipo, titulo, mensagem, agendamento_id)
  values (p_autoescola, p_student, p_tipo, p_titulo, p_msg, p_agend)
  on conflict do nothing;
exception when others then
  null;
end $$;

create or replace function public.registrar_aviso_instrutor(
  p_autoescola uuid, p_instrutor uuid, p_tipo text, p_titulo text, p_msg text,
  p_agend uuid default null, p_agrupar boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_agrupar then
    update public.avisos_instrutor a set
      qtd = a.qtd + 1,
      titulo = initcap(public.rotulo_aviso(p_tipo)),
      mensagem = (a.qtd + 1) || ' ' || public.rotulo_aviso(p_tipo) || '. Veja sua agenda.'
    where a.id = (
      select id from public.avisos_instrutor
      where instructor_id = p_instrutor and autoescola_id = p_autoescola and tipo = p_tipo
        and lido_em is null and created_at > now() - interval '2 minutes'
      order by created_at desc limit 1)
    returning a.id into v_id;
    if v_id is not null then return; end if;
  end if;
  insert into public.avisos_instrutor (autoescola_id, instructor_id, tipo, titulo, mensagem, agendamento_id)
  values (p_autoescola, p_instrutor, p_tipo, p_titulo, p_msg, p_agend);
exception when others then
  null;
end $$;

-- O aviso do instrutor (aula agendada/desmarcada/remarcada) passa a agrupar rajadas
create or replace function public.gerar_aviso_instrutor()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_instr uuid; v_tipo text; v_titulo text; v_msg text; v_aluno text; v_data text;
begin
  begin
    if new.instructor_name is null then return null; end if;
    select id into v_instr from public.instructors
      where autoescola_id = new.autoescola_id and name = new.instructor_name limit 1;
    if v_instr is null then return null; end if;
    v_aluno := coalesce(new.student_name, 'Um aluno');
    v_data := to_char(new.date::date, 'DD/MM');
    if tg_op = 'INSERT' then
      if new.status not in ('scheduled','confirmed') then return null; end if;
      v_tipo := 'aula_agendada'; v_titulo := 'Nova aula agendada';
      v_msg := v_aluno || ' agendou aula em ' || v_data || ' às ' || new.time_slot || '.';
    elsif tg_op = 'UPDATE' then
      if new.status = 'cancelled' and old.status <> 'cancelled' then
        v_tipo := 'aula_cancelada'; v_titulo := 'Aula desmarcada';
        v_msg := 'A aula de ' || v_aluno || ' em ' || v_data || ' às ' || new.time_slot || ' foi desmarcada.';
      elsif new.status in ('scheduled','confirmed') and old.status in ('scheduled','confirmed')
        and (new.date <> old.date or new.time_slot <> old.time_slot) then
        v_tipo := 'aula_remarcada'; v_titulo := 'Aula remarcada';
        v_msg := 'A aula de ' || v_aluno || ' mudou de ' || to_char(old.date::date, 'DD/MM') || ' às ' || old.time_slot
          || ' para ' || v_data || ' às ' || new.time_slot || '.';
      else
        return null;
      end if;
    end if;
    if v_tipo is null then return null; end if;
    perform public.registrar_aviso_instrutor(new.autoescola_id, v_instr, v_tipo, v_titulo, v_msg, new.id, true);
  exception when others then
    null;
  end;
  return null;
end $$;

-- ── ALUNO: aula agendada pela escola (painel/massa) e falta registrada ───────
create or replace function public.gerar_aviso_agendamento_aluno()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid; v_doc text; v_tipo text; v_titulo text; v_msg text; v_quando text;
begin
  begin
    v_doc := coalesce(new.cpf_cnh, new.student_document);
    if v_doc is null then return null; end if;
    select id into v_student from public.students
      where autoescola_id = new.autoescola_id and document_id = v_doc limit 1;
    if v_student is null then return null; end if;
    v_quando := to_char(new.date::date, 'DD/MM') || ' às ' || new.time_slot;

    if tg_op = 'INSERT' then
      if new.status not in ('scheduled','confirmed') then return null; end if;
      -- agendado pelo próprio aluno: ele já viu na tela
      if coalesce(new.notes, '') ilike '%app do aluno%' then return null; end if;
      v_tipo := 'aula_agendada';
      if new.tipo = 'banca' then
        v_titulo := 'Exame agendado';
        v_msg := 'Seu exame foi agendado para ' || v_quando || '.';
      else
        v_titulo := 'Aula agendada';
        v_msg := 'Sua aula foi agendada para ' || v_quando || coalesce(' com ' || new.instructor_name, '') || '.';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.status = 'absent' and old.status is distinct from 'absent' then
        v_tipo := 'falta'; v_titulo := 'Falta registrada';
        v_msg := 'Foi registrada falta na sua aula de ' || v_quando || '.';
      else
        return null;
      end if;
    end if;
    perform public.registrar_aviso_aluno(new.autoescola_id, v_student, v_tipo, v_titulo, v_msg, new.id, true);
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_aviso_agendamento_aluno on public.agendamentos;
create trigger trg_aviso_agendamento_aluno
  after insert or update on public.agendamentos
  for each row execute function public.gerar_aviso_agendamento_aluno();

-- ── ALUNO: solicitações (requerimentos) respondidas pelo painel ──────────────
create or replace function public.gerar_aviso_solicitacao()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s record; v_item text; v_titulo text; v_msg text; v_data text;
begin
  begin
    if new.autor_tipo is distinct from 'painel'
       or new.tipo_evento not in ('em_analise','agendada','recusada') then
      return null;
    end if;
    select student_id, autoescola_id, tipo, motivo_recusa, dados_atendimento into s
      from public.solicitacoes where id = new.solicitacao_id;
    if s.student_id is null then return null; end if;
    v_item := case s.tipo when 'exame' then 'exame' when 'legislacao' then 'legislação' else s.tipo end;

    if new.tipo_evento = 'em_analise' then
      v_titulo := 'Solicitação em análise';
      v_msg := 'Sua solicitação de ' || v_item || ' está sendo analisada pela autoescola.';
    elsif new.tipo_evento = 'agendada' then
      v_titulo := 'Solicitação agendada';
      v_data := nullif(s.dados_atendimento->>'data', '');
      v_msg := 'Sua solicitação de ' || v_item || ' foi agendada'
        || case when v_data is not null then ' para ' || right(v_data, 2) || '/' || substr(v_data, 6, 2) else '' end
        || coalesce(' às ' || nullif(s.dados_atendimento->>'horario', ''), '')
        || coalesce(' — ' || nullif(s.dados_atendimento->>'local', ''), '') || '.';
    else
      v_titulo := 'Solicitação recusada';
      v_msg := 'Sua solicitação de ' || v_item || ' foi recusada.'
        || coalesce(' Motivo: ' || nullif(s.motivo_recusa, ''), '');
    end if;
    perform public.registrar_aviso_aluno(s.autoescola_id, s.student_id, 'solicitacao', v_titulo, v_msg, null, false);
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_aviso_solicitacao on public.solicitacoes_eventos;
create trigger trg_aviso_solicitacao
  after insert on public.solicitacoes_eventos
  for each row execute function public.gerar_aviso_solicitacao();

-- ── ALUNO: pagamento aprovado ────────────────────────────────────────────────
create or replace function public.gerar_aviso_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.status = 'aprovado' and new.student_id is not null
       and (tg_op = 'INSERT' or old.status is distinct from 'aprovado') then
      perform public.registrar_aviso_aluno(new.autoescola_id, new.student_id, 'pagamento',
        'Pagamento aprovado',
        'Seu pagamento' || coalesce(' (' || nullif(new.produto_snapshot->>'nome', '') || ')', '')
          || ' foi aprovado. Confira seus créditos no app.', null, false);
    end if;
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_aviso_pedido on public.pedidos_loja;
create trigger trg_aviso_pedido
  after insert or update on public.pedidos_loja
  for each row execute function public.gerar_aviso_pedido();

-- ── ALUNO: crédito lançado manualmente pela escola ───────────────────────────
create or replace function public.gerar_aviso_credito()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_escola uuid;
begin
  begin
    if new.tipo <> 'credito' or coalesce(new.quantidade, 0) <= 0 then return null; end if;
    -- automáticos já têm aviso próprio (pagamento, cancelamento)
    if coalesce(new.usuario_responsavel, '') ~* '^(sistema|mercado pago|venda manual)'
       or coalesce(new.motivo, '') ~* '^(cancelamento|compra|venda)' then
      return null;
    end if;
    v_student := coalesce(new.student_id, new.aluno_id);
    if v_student is null then return null; end if;
    v_escola := coalesce(new.autoescola_id, (select autoescola_id from public.students where id = v_student));
    if v_escola is null then return null; end if;
    perform public.registrar_aviso_aluno(v_escola, v_student, 'credito', 'Créditos adicionados',
      'Você recebeu ' || new.quantidade || ' crédito' || case when new.quantidade > 1 then 's' else '' end
        || ' de aula.', null, false);
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_aviso_credito on public.historico_creditos;
create trigger trg_aviso_credito
  after insert on public.historico_creditos
  for each row execute function public.gerar_aviso_credito();

-- ── ALUNO: contrato aguardando assinatura ────────────────────────────────────
create or replace function public.gerar_aviso_contrato()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.status = 'pendente' and new.student_id is not null then
      perform public.registrar_aviso_aluno(new.autoescola_id, new.student_id, 'contrato',
        'Contrato para assinar', 'Há um contrato aguardando a sua assinatura no app.', null, false);
    end if;
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_aviso_contrato on public.contratos_aluno;
create trigger trg_aviso_contrato
  after insert on public.contratos_aluno
  for each row execute function public.gerar_aviso_contrato();

-- ── INSTRUTOR: horário bloqueado ─────────────────────────────────────────────
create or replace function public.gerar_aviso_bloqueio()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_instr uuid;
begin
  begin
    if new.instructor is null or new.reserva_student_id is not null then return null; end if;
    select id into v_instr from public.instructors
      where autoescola_id = new.autoescola_id and name = new.instructor limit 1;
    if v_instr is null then return null; end if;
    perform public.registrar_aviso_instrutor(new.autoescola_id, v_instr, 'horario_bloqueado',
      'Horário bloqueado',
      'Seu horário de ' || to_char(new.date::date, 'DD/MM') || ' às ' || new.time_slot || ' foi bloqueado'
        || coalesce(' (' || nullif(new.reason, '') || ')', '') || '.', null, true);
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_aviso_bloqueio on public."blockedTimeSlots";
create trigger trg_aviso_bloqueio
  after insert on public."blockedTimeSlots"
  for each row execute function public.gerar_aviso_bloqueio();

-- ── Push: só chama o app se o dono tem aparelho inscrito (corta ~todas as chamadas) ──
create or replace function public.disparar_push_aviso()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cfg record; v_tem boolean;
begin
  begin
    if tg_table_name = 'avisos_aluno' then
      select exists (select 1 from public.push_subscriptions where perfil = 'aluno' and owner_id = new.student_id) into v_tem;
    else
      select exists (select 1 from public.push_subscriptions where perfil = 'instrutor' and owner_id = new.instructor_id) into v_tem;
    end if;
    if not v_tem then return null; end if;
    select url, secret into v_cfg from public.push_config where id = 1;
    if v_cfg.url is null then return null; end if;
    perform net.http_post(
      url := v_cfg.url,
      body := jsonb_build_object('tabela', tg_table_name, 'id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_cfg.secret)
    );
  exception when others then
    null;
  end;
  return null;
end $$;

-- ── Lembretes (rodam dentro do banco; sem custo de Vercel) ───────────────────
create or replace function public.gerar_lembretes_hora()
returns void language plpgsql security definer set search_path = '' as $$
declare agora timestamp := (now() at time zone 'America/Sao_Paulo');
begin
  -- aula começa entre 1h30 e 2h: o índice único evita repetir
  insert into public.avisos_aluno (autoescola_id, student_id, tipo, titulo, mensagem, agendamento_id)
  select a.autoescola_id, s.id, 'lembrete_hora', 'Sua aula é daqui a pouco',
         'Hoje às ' || a.time_slot || coalesce(' com ' || a.instructor_name, '') || '. Não se atrase!', a.id
  from public.agendamentos a
  join public.students s on s.autoescola_id = a.autoescola_id and s.document_id = coalesce(a.cpf_cnh, a.student_document)
  where a.date = agora::date
    and a.status in ('scheduled','confirmed')
    and a.time_slot ~ '^\d{2}:\d{2}$'
    and (a.date + a.time_slot::time) >  agora + interval '90 minutes'
    and (a.date + a.time_slot::time) <= agora + interval '120 minutes'
  on conflict do nothing;
end $$;

create or replace function public.gerar_lembretes_dia()
returns void language plpgsql security definer set search_path = '' as $$
declare amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1;
begin
  insert into public.avisos_aluno (autoescola_id, student_id, tipo, titulo, mensagem, agendamento_id)
  select a.autoescola_id, s.id, 'lembrete_dia', 'Você tem aula amanhã',
         'Amanhã às ' || a.time_slot || coalesce(' com ' || a.instructor_name, '') || '.', a.id
  from public.agendamentos a
  join public.students s on s.autoescola_id = a.autoescola_id and s.document_id = coalesce(a.cpf_cnh, a.student_document)
  where a.date = amanha and a.status in ('scheduled','confirmed')
  on conflict do nothing;

  insert into public.avisos_instrutor (autoescola_id, instructor_id, tipo, titulo, mensagem, chave)
  select a.autoescola_id, i.id, 'lembrete_dia', 'Suas aulas de amanhã',
         'Você tem ' || count(*) || case when count(*) > 1 then ' aulas' else ' aula' end
           || ' amanhã, a partir das ' || min(a.time_slot) || '.',
         amanha::text
  from public.agendamentos a
  join public.instructors i on i.autoescola_id = a.autoescola_id and i.name = a.instructor_name
  where a.date = amanha and a.status in ('scheduled','confirmed')
  group by a.autoescola_id, i.id
  on conflict do nothing;
end $$;

select cron.schedule('lembrete-hora', '*/15 * * * *', 'select public.gerar_lembretes_hora()');
select cron.schedule('lembrete-dia',  '0 21 * * *',   'select public.gerar_lembretes_dia()');  -- 18h em Brasília
select cron.schedule('limpar-avisos', '0 6 * * 0', $$
  delete from public.avisos_aluno where created_at < now() - interval '30 days';
  delete from public.avisos_instrutor where created_at < now() - interval '30 days';
$$);

-- ── Funções novas: nada de chamada pública por RPC (o servidor usa service_role) ──
revoke execute on function public.registrar_aviso_aluno(uuid, uuid, text, text, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.registrar_aviso_instrutor(uuid, uuid, text, text, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.gerar_aviso_agendamento_aluno() from public, anon, authenticated;
revoke execute on function public.gerar_aviso_solicitacao() from public, anon, authenticated;
revoke execute on function public.gerar_aviso_pedido() from public, anon, authenticated;
revoke execute on function public.gerar_aviso_credito() from public, anon, authenticated;
revoke execute on function public.gerar_aviso_contrato() from public, anon, authenticated;
revoke execute on function public.gerar_aviso_bloqueio() from public, anon, authenticated;
revoke execute on function public.gerar_lembretes_hora() from public, anon, authenticated;
revoke execute on function public.gerar_lembretes_dia() from public, anon, authenticated;
