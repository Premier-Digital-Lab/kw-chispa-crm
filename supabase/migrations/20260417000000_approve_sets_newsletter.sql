-- When an admin approves a pending member (sales.disabled changes true → false),
-- also opt them in to the KW CHISPA newsletter (has_newsletter = true).
-- Members can unsubscribe later via their profile.

CREATE OR REPLACE FUNCTION public.handle_sale_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF OLD.disabled = TRUE AND NEW.disabled = FALSE THEN
    UPDATE public.contacts
    SET member_status = 'Active',
        has_newsletter = TRUE
    WHERE sales_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
