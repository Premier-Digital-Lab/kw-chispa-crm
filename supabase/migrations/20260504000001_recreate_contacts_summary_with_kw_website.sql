-- Recreate contacts_summary view to pick up kw_website column
-- The view uses co.* but PostgreSQL expands * at CREATE VIEW time,
-- so new columns added after view creation are not included.

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
