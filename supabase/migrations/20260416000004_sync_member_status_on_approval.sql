-- When an admin approves a pending member (sales.disabled changes true → false),
-- automatically set contacts.member_status = 'Active' on the linked contact row.
-- This fires regardless of how disabled is changed: admin UI, edge function, or direct SQL.

CREATE OR REPLACE FUNCTION public.handle_sale_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF OLD.disabled = TRUE AND NEW.disabled = FALSE THEN
    UPDATE public.contacts
    SET member_status = 'Active'
    WHERE sales_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sale_approved
  AFTER UPDATE OF disabled ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sale_approved();
