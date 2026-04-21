-- Migration: Send signup emails via send-email edge function on new member signup
--
-- How it works:
--   1. A trigger fires on public.contacts AFTER INSERT when member_status = 'Pending'
--      (every new signup via SignupPage creates a contact with member_status = 'Pending')
--   2. The trigger function calls pg_net.http_post twice:
--      - Once to send the confirmation email to the new member
--      - Once to send the admin notification email to info@kwchispa.com
--   3. The edge function URL is hardcoded to this project's Supabase URL.
--   4. The webhook secret is read from app.settings.send_email_webhook_secret
--
-- REQUIRED SETUP (run once after deploying this migration):
--   Step 1 — Set the Supabase secret:
--     npx supabase secrets set SEND_EMAIL_WEBHOOK_SECRET=<your-random-secret> --project-ref yxebmtukofvfthkzaknc
--
--   Step 2 — Store the same secret in the database so the trigger can read it:
--     Run this in the Supabase SQL editor (replace <your-random-secret>):
--     ALTER DATABASE postgres SET "app.settings.send_email_webhook_secret" = '<your-random-secret>';
--     SELECT pg_reload_conf();
--
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_member_signup_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  webhook_secret text;
  function_url   text;
  member_email   text;
  payload_confirm jsonb;
  payload_admin   jsonb;
  headers         jsonb;
BEGIN
  -- Only fire for new signups (member_status = 'Pending')
  IF NEW.member_status IS DISTINCT FROM 'Pending' THEN
    RETURN NEW;
  END IF;

  -- Read the webhook secret from database settings
  webhook_secret := current_setting('app.settings.send_email_webhook_secret', true);

  -- If the secret isn't configured yet, skip silently so signup still works
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  -- Edge function URL for this Supabase project
  function_url := 'https://yxebmtukofvfthkzaknc.supabase.co/functions/v1/send-email';

  -- Extract the member's email from email_jsonb
  member_email := NEW.email_jsonb -> 0 ->> 'email';

  -- Build shared headers
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', webhook_secret
  );

  -- 1. Send confirmation email to the new member
  IF member_email IS NOT NULL AND member_email <> '' THEN
    payload_confirm := jsonb_build_object(
      'type', 'signup_confirmation',
      'to',   member_email,
      'data', jsonb_build_object(
        'first_name', NEW.first_name,
        'last_name',  NEW.last_name
      )
    );

    PERFORM net.http_post(
      url     := function_url,
      body    := payload_confirm,
      params  := '{}'::jsonb,
      headers := headers,
      timeout_milliseconds := 10000
    );
  END IF;

  -- 2. Send admin notification email
  payload_admin := jsonb_build_object(
    'type', 'signup_admin_notification',
    'to',   'info@kwchispa.com',
    'data', jsonb_build_object(
      'first_name',          NEW.first_name,
      'last_name',           NEW.last_name,
      'email',               coalesce(member_email, ''),
      'cell_number',         coalesce(NEW.cell_number, ''),
      'market_center_name',  coalesce(NEW.market_center_name, ''),
      'agent_role',          coalesce(NEW.agent_role, '')
    )
  );

  PERFORM net.http_post(
    url     := function_url,
    body    := payload_admin,
    params  := '{}'::jsonb,
    headers := headers,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;


-- Attach the trigger to public.contacts
DROP TRIGGER IF EXISTS on_new_member_signup_send_email ON public.contacts;

CREATE TRIGGER on_new_member_signup_send_email
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_member_signup_email();
