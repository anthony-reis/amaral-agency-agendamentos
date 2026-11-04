-- Dispara o Web Push quando nasce um aviso (aluno ou instrutor), chamando a rota
-- /api/push/enviar do app. URL e segredo ficam em push_config (por ambiente):
--   insert into push_config (id, url, secret) values (1, 'https://SEU-DOMINIO/api/push/enviar', '<PUSH_WEBHOOK_SECRET>');
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_config (
  id int primary key check (id = 1),
  url text not null,
  secret text not null
);
alter table public.push_config enable row level security;

create or replace function public.disparar_push_aviso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg record;
begin
  begin
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
end;
$$;

drop trigger if exists trg_push_avisos_aluno on public.avisos_aluno;
create trigger trg_push_avisos_aluno after insert on public.avisos_aluno
  for each row execute function public.disparar_push_aviso();

drop trigger if exists trg_push_avisos_instrutor on public.avisos_instrutor;
create trigger trg_push_avisos_instrutor after insert on public.avisos_instrutor
  for each row execute function public.disparar_push_aviso();
