-- Recreate contacts_summary to guarantee phone_fts is not referenced.
-- phone_jsonb was dropped in 20260409000000_members_directory_fields, so
-- phone_fts can no longer be computed. This migration is idempotent: if the
-- view already lacks phone_fts it is simply replaced with the same definition.

DROP VIEW IF EXISTS public.contacts_summary;

CREATE VIEW public.contacts_summary
WITH (security_invoker = on)
AS
SELECT
    co.*,
    jsonb_path_query_array(co.email_jsonb, '$[*].email')::text AS email_fts,
    c.name AS company_name,
    count(DISTINCT t.id) FILTER (WHERE t.done_date IS NULL) AS nb_tasks
FROM public.contacts co
LEFT JOIN public.tasks t ON co.id = t.contact_id
LEFT JOIN public.companies c ON co.company_id = c.id
GROUP BY co.id, c.name;
