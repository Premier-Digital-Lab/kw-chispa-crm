-- Recreate contacts_summary so that co.* re-expands to include the
-- is_chapter_leader column added in 20260512061911_add_chapter_leader_field.sql.
-- PostgreSQL expands * at view-creation time, so adding a column to the
-- underlying table does NOT automatically appear in existing views.

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
