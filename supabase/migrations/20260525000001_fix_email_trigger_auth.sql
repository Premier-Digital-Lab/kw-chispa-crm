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
  IF NEW.member_status IS DISTINCT FROM 'Pending' THEN
    RETURN NEW;
  END IF;

  function_url := 'https://yxebmtukofvfthkzaknc.supabase.co/functions/v1/send-email';
  member_email := NEW.email_jsonb -> 0 ->> 'email';

  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZWJtdHVrb2Z2ZnRoa3pha25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDk1NDAsImV4cCI6MjA5MTA4NTU0MH0.gfezKQQoBtq2U2aecdMmW5o4ZJS3x18jW4lybDr7SUQ'
  );

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

  payload_admin := jsonb_build_object(
    'type', 'signup_admin_notification',
    'to',   'info@kwchispa.com',
    'data', jsonb_build_object(
      'first_name',         NEW.first_name,
      'last_name',          NEW.last_name,
      'email',              coalesce(member_email, ''),
      'cell_number',        coalesce(NEW.cell_number, ''),
      'market_center_name', coalesce(NEW.market_center_name, ''),
      'agent_role',         coalesce(NEW.agent_role, '')
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
