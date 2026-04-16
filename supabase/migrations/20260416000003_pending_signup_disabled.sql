-- Self-registered members should not have immediate access to the CRM.
-- Update handle_new_user() so that any signup after the first user starts with
-- disabled = true.  An admin approves the member by setting disabled = false in
-- the Sales admin UI, which also lifts the Supabase Auth ban (if any).
--
-- The first user (initial admin setup) is NOT disabled.

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  sales_count int;
begin
  select count(id) into sales_count
  from public.sales;

  insert into public.sales (first_name, last_name, email, user_id, administrator, disabled)
  values (
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data -> 'custom_claims' ->> 'first_name', 'Pending'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data -> 'custom_claims' ->> 'last_name', 'Pending'),
    new.email,
    new.id,
    -- administrator: first user becomes admin, all others start as regular users
    case when sales_count > 0 then FALSE else TRUE end,
    -- disabled: first user can access immediately; subsequent signups await approval
    case when sales_count > 0 then TRUE else FALSE end
  );
  return new;
end;
$$;
