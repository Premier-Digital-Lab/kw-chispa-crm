-- ============================================================
-- SECURITY FIX: Column-level protection for privileged fields
--
-- Problem: RLS policies "Sales: admin or own update" and
-- "Contacts: admin or own update" allow a member to update their
-- OWN row, but RLS only gates which ROWS are touched, not which
-- COLUMNS change within an allowed row. A member could therefore
-- send a direct API call setting sales.administrator = true or
-- contacts.membership_tier = 'Premier' on their own row.
--
-- Fix: BEFORE UPDATE triggers on public.sales and public.contacts
-- that reject changes to privileged columns unless the request
-- comes from an admin (public.is_admin()) or from service_role.
--
-- service_role note: service_role bypasses RLS but NOT triggers,
-- so these trigger functions must explicitly allow it through.
-- auth.uid() is NULL when the request is made with service_role
-- (no authenticated JWT subject), which is what we use as the
-- service_role check. This is required because:
--   - the PayPal webhook updates contacts.membership_tier via
--     service_role
--   - signup triggers set contacts.member_status via service_role
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."protect_sales_privileged_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- service_role has no auth.uid() (no authenticated JWT subject); let it through
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins may change any column
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

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."protect_contacts_privileged_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- service_role has no auth.uid() (no authenticated JWT subject); let it through
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins may change any column
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier THEN
    RAISE EXCEPTION 'Only administrators may change the "membership_tier" column on contacts';
  END IF;

  IF NEW.member_status IS DISTINCT FROM OLD.member_status THEN
    RAISE EXCEPTION 'Only administrators may change the "member_status" column on contacts';
  END IF;

  IF NEW.sales_id IS DISTINCT FROM OLD.sales_id THEN
    RAISE EXCEPTION 'Only administrators may change the "sales_id" column on contacts';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER "sales_protect_privileged_columns_trigger"
    BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.protect_sales_privileged_columns();

CREATE OR REPLACE TRIGGER "contacts_protect_privileged_columns_trigger"
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.protect_contacts_privileged_columns();
