-- Automatically create a contacts (member profile) row whenever a new sales row
-- is inserted. This fires for ALL signup paths — self-signup whether or not email
-- confirmation is required, admin invite, and SSO — so the application layer never
-- needs to handle this itself.

CREATE OR REPLACE FUNCTION public.handle_new_sales_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Guard against duplicates: skip if a contacts row for this sales_id already
  -- exists. This protects users (e.g. Nikki) who already have a contacts row.
  IF EXISTS (
    SELECT 1 FROM public.contacts WHERE sales_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.contacts (
    first_name,
    last_name,
    email_jsonb,
    member_status,
    first_seen,
    sales_id
  )
  VALUES (
    NEW.first_name,
    NEW.last_name,
    jsonb_build_array(
      jsonb_build_object('email', NEW.email::text, 'type', 'Work')
    ),
    'Pending',
    now(),
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sales_member_created
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_sales_member();
