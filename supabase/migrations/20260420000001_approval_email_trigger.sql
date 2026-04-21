-- Migration: Send welcome_approved email when an admin approves a member
--
-- How it works:
--   1. A trigger fires on public.sales AFTER UPDATE when disabled changes true → false
--      (this is how admins approve pending members in the CRM)
--   2. The trigger looks up the member's first_name and email from public.contacts
--   3. It calls pg_net.http_post to send the welcome_approved email via send-email edge function
--
-- This is separate from the existing on_sale_approved trigger (which sets member_status = 'Active').

CREATE OR REPLACE FUNCTION public.handle_member_approval_email()
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
  -- Only fire when disabled flips from true to false (approval event)
  IF NOT (OLD.disabled = TRUE AND NEW.disabled = FALSE) THEN
    RETURN NEW;
  END IF;

  -- Read secrets from public.app_secrets
  SELECT value INTO webhook_secret FROM public.app_secrets WHERE key = 'send_email_webhook_secret';
  SELECT value INTO anon_key FROM public.app_secrets WHERE key = 'supabase_anon_key';

  -- If the secret isn't configured yet, skip silently
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  -- Look up the contact linked to this sales record
  SELECT
    c.first_name,
    c.email_jsonb -> 0 ->> 'email'
  INTO
    member_first,
    member_email
  FROM public.contacts c
  WHERE c.sales_id = NEW.id
  LIMIT 1;

  -- Nothing to do if no contact or no email found
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
    'type', 'welcome_approved',
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


DROP TRIGGER IF EXISTS on_member_approval_send_email ON public.sales;

CREATE TRIGGER on_member_approval_send_email
  AFTER UPDATE OF disabled ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_member_approval_email();
