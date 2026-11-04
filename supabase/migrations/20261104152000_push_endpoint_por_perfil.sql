-- Um mesmo aparelho/navegador pode ser aluno e instrutor: a chave única passa a ser (endpoint, perfil).
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_perfil_key unique (endpoint, perfil);
