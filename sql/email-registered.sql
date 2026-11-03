-- Кешбекер: проверка, зарегистрирована ли почта.
-- Выполни один раз в Supabase: SQL Editor → New query → вставить → Run.
-- Функция отвечает только «да» или «нет» и не выдаёт никаких других данных об аккаунте.

create or replace function public.email_registered(e text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(e)));
$$;

revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to anon, authenticated;
