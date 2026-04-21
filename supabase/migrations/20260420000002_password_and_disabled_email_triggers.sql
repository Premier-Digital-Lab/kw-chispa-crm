-- Migration: Send transactional emails on password change and account disable
--
-- Trigger 1: handle_password_changed_email()
--   Fires on auth.users AFTER UPDATE when encrypted_password changes.
--   Looks up the member's contact via public.sales (sales.user_id = NEW.id).
--
-- Trigger 2: handle_account_disabled_email()
--   Fires on public.sales AFTER UPDATE OF disabled when disabled flips false → true.
--   Looks up the member's contact via public.contacts (contacts.sales_id = NEW.id).
--
-- Both triggers read secrets from public.app_secrets.

-- ─── Trigger 1: password changed ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_password_changed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  webhook_secret text;
  anon_key       text;
  function_url   text;
  member_email   text;
  member_first   text;
  payload        jsonb;
  headers        jsonb;
BEGIN
  -- Only fire when the password actually changed
  IF OLD.encrypted_password IS NOT DISTINCT FROM NEW.encrypted_password THEN
    RETURN NEW;
  END IF;

  SELECT value INTO webhook_secret FROM public.app_secrets WHERE key = 'send_email_webhook_secret';
  SELECT value INTO anon_key FROM public.app_secrets WHERE key = 'supabase_anon_key';

  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  -- Look up the contact linked to this auth user via public.sales
  SELECT
    c.first_name,
    c.email_jsonb -> 0 ->> 'email'
  INTO
    member_first,
    member_email
  FROM public.sales s
  JOIN public.contacts c ON c.sales_id = s.id
  WHERE s.user_id = NEW.id
  LIMIT 1;

  IF member_email IS NULL OR member_email = '' THEN
    RETURN NEW;
  END IF;

  function_url := 'https://yxebmtukofvfthkzaknc.supabase.co/functions/v1/send-email';

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', webhook_secret,
    'Authorization', 'Bearer ' || coalesce(anon_key, '')
  );

  payload := jsonb_build_object(
    'type', 'password_changed',
    'to',   member_email,
    'data', jsonb_build_object(
      'first_name', coalesce(member_first, '')
    )
  );

  PERFORM net.http_post(
    url     := function_url,
    body    := payload,
    params  := '{}'::jsonb,
    headers := headers,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_password_changed_send_email ON auth.users;

CREATE TRIGGER on_password_changed_send_email
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_password_changed_email();


-- ─── Trigger 2: account disabled ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_account_disabled_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  webhook_secret text;
  anon_key       text;
  function_url   text;
  member_email   text;
  member_first   text;
  payload        jsonb;
  headers        jsonb;
BEGIN
  -- Only fire when disabled flips from false to true (disable/reject event)
  IF NOT (OLD.disabled = FALSE AND NEW.disabled = TRUE) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO webhook_secret FROM public.app_secrets WHERE key = 'send_email_webhook_secret';
  SELECT value INTO anon_key FROM public.app_secrets WHERE key = 'supabase_anon_key';

  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  SELECT
    c.first_name,
    c.email_jsonb -> 0 ->> 'email'
  INTO
    member_first,
    member_email
  FROM public.contacts c
  WHERE c.sales_id = NEW.id
  LIMIT 1;

  IF member_email IS NULL OR member_email = '' THEN
    RETURN NEW;
  END IF;

  function_url := 'https://yxebmtukofvfthkzaknc.supabase.co/functions/v1/send-email';

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', webhook_secret,
    'Authorization', 'Bearer ' || coalesce(anon_key, '')
  );

  payload := jsonb_build_object(
    'type', 'account_disabled',
    'to',   member_email,
    'data', jsonb_build_object(
      'first_name', coalesce(member_first, '')
    )
  );

  PERFORM net.http_post(
    url     := function_url,
    body    := payload,
    params  := '{}'::jsonb,
    headers := headers,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_account_disabled_send_email ON public.sales;

CREATE TRIGGER on_account_disabled_send_email
  AFTER UPDATE OF disabled ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_account_disabled_email();
