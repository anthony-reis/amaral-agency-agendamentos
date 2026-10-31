-- Realtime: além do canal da autoescola (painel/instrutor), avisa o canal do ALUNO
-- dono da linha (`aluno:<student_id>:<tabela>`). Assim só a tela de quem foi
-- afetado recarrega, em vez de todos os alunos com o app aberto (isso custaria
-- invocações na Vercel a cada agendamento). O aviso continua sem dados.
create or replace function public.avisar_mudanca()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_autoescola uuid;
  v_student uuid;
begin
  v_row := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_autoescola := (v_row->>'autoescola_id')::uuid;
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

    if tg_table_name = 'solicitacoes' then
      v_student := (v_row->>'student_id')::uuid;
    elsif tg_table_name = 'agendamentos' then
      select id into v_student
      from public.students
      where autoescola_id = v_autoescola
        and document_id = coalesce(v_row->>'cpf_cnh', v_row->>'student_document')
      limit 1;
    end if;

    if v_student is not null then
      perform realtime.send(
        jsonb_build_object('tabela', tg_table_name),
        'mudou',
        'aluno:' || v_student::text || ':' || tg_table_name,
        false
      );
    end if;
  exception when others then
    -- o aviso nunca pode derrubar a escrita
    null;
  end;
  return null;
end;
$$;
