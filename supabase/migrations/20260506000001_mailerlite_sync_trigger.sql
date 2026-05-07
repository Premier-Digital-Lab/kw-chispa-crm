-- Migration: Sync contacts with MailerLite when member_status or membership_tier changes
--
-- Trigger fires on public.contacts AFTER INSERT, UPDATE (member_status, membership_tier), or DELETE
-- and calls the mailerlite-sync edge function via pg_net.
--
-- Prerequisites:
--   1. Add the webhook secret to the DB:
--        INSERT INTO public.app_secrets (key, value)
--        VALUES ('mailerlite_webhook_secret', '<your-secret>')
--        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
--   2. Set the matching secret + API key as Supabase function secrets:
--        supabase secrets set MAILERLITE_WEBHOOK_SECRET=<same-secret>
--        supabase secrets set MAILERLITE_API_KEY=<your-mailerlite-api-key>

CREATE OR REPLACE FUNCTION public.handle_mailerlite_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  webhook_secret text;
  anon_key       text;
  function_url   text;
  payload        jsonb;
  headers        jsonb;
BEGIN
  SELECT value INTO webhook_secret FROM public.app_secrets WHERE key = 'mailerlite_webhook_secret';
  SELECT value INTO anon_key       FROM public.app_secrets WHERE key = 'supabase_anon_key';

  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type',       'DELETE',
      'table',      TG_TABLE_NAME,
      'record',     NULL,
      'old_record', to_jsonb(OLD)
    );
  ELSIF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type',       'INSERT',
      'table',      TG_TABLE_NAME,
      'record',     to_jsonb(NEW),
      'old_record', NULL
    );
  ELSE
    payload := jsonb_build_object(
      'type',       'UPDATE',
      'table',      TG_TABLE_NAME,
      'record',     to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  END IF;

  function_url := 'https://yxebmtukofvfthkzaknc.supabase.co/functions/v1/mailerlite-sync';

  headers := jsonb_build_object(
    'Content-Type',     'application/json',
    'x-webhook-secret', webhook_secret,
    'Authorization',    'Bearer ' || coalesce(anon_key, '')
  );

  PERFORM net.http_post(
    url                  := function_url,
    body                 := payload,
    params               := '{}'::jsonb,
    headers              := headers,
    timeout_milliseconds := 10000
  );

  RETURN coalesce(NEW, OLD);
END;
$$;


DROP TRIGGER IF EXISTS on_contact_mailerlite_sync_upsert ON public.contacts;
DROP TRIGGER IF EXISTS on_contact_mailerlite_sync_delete ON public.contacts;

CREATE TRIGGER on_contact_mailerlite_sync_upsert
  AFTER INSERT OR UPDATE OF member_status, membership_tier
  ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mailerlite_sync();

CREATE TRIGGER on_contact_mailerlite_sync_delete
  AFTER DELETE
  ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mailerlite_sync();
