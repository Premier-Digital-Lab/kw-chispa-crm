-- Fix: Remove webhook secret guard from handle_new_member_signup_email().
-- The trigger was silently skipping because app.settings.send_email_webhook_secret
-- was not configured in the database. Removing the guard so the trigger always fires.

CREATE OR REPLACE FUNCTION public.handle_new_member_signup_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  function_url    text;
  member_email    text;
  payload_confirm jsonb;
  payload_admin   jsonb;
  headers         jsonb;
BEGIN
  -- Only fire for new signups (member_status = 'Pending')
  IF NEW.member_status IS DISTINCT FROM 'Pending' THEN
    RETURN NEW;
  END IF;

  -- Edge function URL for this Supabase project
  function_url := 'https://yxebmtukofvfthkzaknc.supabase.co/functions/v1/send-email';

  -- Extract the member's email from email_jsonb
  member_email := NEW.email_jsonb -> 0 ->> 'email';

  headers := jsonb_build_object('Content-Type', 'application/json');

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


-- Recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS on_new_member_signup_send_email ON public.contacts;

CREATE TRIGGER on_new_member_signup_send_email
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_member_signup_email();
