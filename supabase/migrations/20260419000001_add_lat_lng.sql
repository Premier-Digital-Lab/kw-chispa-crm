-- Migration: Add latitude and longitude to contacts for map view
--
-- Steps:
--   1. Add latitude and longitude columns
--   2. Recreate contacts_summary so co.* expands to include the new columns

-- ============================================================
-- Step 1: Add lat/lng columns
-- ============================================================

ALTER TABLE public.contacts ADD COLUMN latitude double precision;
ALTER TABLE public.contacts ADD COLUMN longitude double precision;


-- ============================================================
-- Step 2: Recreate contacts_summary (co.* expands at CREATE time)
-- ============================================================

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
