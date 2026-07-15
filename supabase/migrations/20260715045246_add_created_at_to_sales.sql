-- Add created_at to sales, mirroring the member's real auth.users signup date.
alter table public.sales
  add column if not exists created_at timestamp with time zone not null default now();

-- Backfill existing members with their real auth.users signup date.
-- (Runs as a migration, outside any authenticated session, so the
-- protect_sales_privileged_columns trigger's auth.uid() IS NULL branch
-- lets this through untouched.)
update public.sales s
set created_at = au.created_at
from auth.users au
where s.user_id = au.id;

-- Populate created_at from the auth.users row being inserted, instead of
-- relying on the column default, so new signups get the exact same instant.
create or replace function public.handle_new_user() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  sales_count int;
begin
  select count(id) into sales_count
  from public.sales;

  insert into public.sales (first_name, last_name, email, user_id, administrator, created_at)
  values (
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data -> 'custom_claims' ->> 'first_name', 'Pending'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data -> 'custom_claims' ->> 'last_name', 'Pending'),
    new.email,
    new.id,
    case when sales_count > 0 then FALSE else TRUE end,
    new.created_at
  );
  return new;
end;
$$;

-- Prevent non-admins from spoofing their own signup date, same protection
-- already applied to administrator/disabled/is_super_admin.
create or replace function public.protect_sales_privileged_columns() returns trigger
    language plpgsql
    set search_path to 'public'
    as $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.administrator IS DISTINCT FROM OLD.administrator THEN
    RAISE EXCEPTION 'Only administrators may change the "administrator" column on sales';
  END IF;

  IF NEW.disabled IS DISTINCT FROM OLD.disabled THEN
    RAISE EXCEPTION 'Only administrators may change the "disabled" column on sales';
  END IF;

  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'Only administrators may change the "is_super_admin" column on sales';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only administrators may change the "created_at" column on sales';
  END IF;

  RETURN NEW;
END;
$$;
