-- Migration: Combine mc_street_number + mc_street_name into mc_street_address
--
-- Steps:
--   1. Drop contacts_summary view
--   2. Add mc_street_address column
--   3. Migrate existing data
--   4. Drop mc_street_number and mc_street_name
--   5. Recreate contacts_summary
--   6. Recreate merge_contacts() without the two old columns
--   7. Recreate handle_new_sales_member() trigger using mc_street_address


-- ============================================================
-- Step 1: Drop contacts_summary view
-- ============================================================

DROP VIEW IF EXISTS public.contacts_summary;


-- ============================================================
-- Step 2: Add mc_street_address
-- ============================================================

ALTER TABLE public.contacts
    ADD COLUMN mc_street_address text;


-- ============================================================
-- Step 3: Migrate existing data
-- ============================================================

UPDATE public.contacts
SET mc_street_address = TRIM(
    COALESCE(mc_street_number, '') || ' ' || COALESCE(mc_street_name, '')
)
WHERE mc_street_number IS NOT NULL OR mc_street_name IS NOT NULL;


-- ============================================================
-- Step 4: Drop old columns
-- ============================================================

ALTER TABLE public.contacts
    DROP COLUMN mc_street_number,
    DROP COLUMN mc_street_name;


-- ============================================================
-- Step 5: Recreate contacts_summary
-- ============================================================

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


-- ============================================================
-- Step 6: Recreate merge_contacts()
-- ============================================================

DROP FUNCTION IF EXISTS public.merge_contacts(bigint, bigint);

CREATE FUNCTION public.merge_contacts(loser_id bigint, winner_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  winner_contact contacts%ROWTYPE;
  loser_contact contacts%ROWTYPE;
  deal_record RECORD;
  merged_emails jsonb;
  merged_tags bigint[];
  winner_emails jsonb;
  loser_emails jsonb;
  email_map jsonb;
BEGIN
  SELECT * INTO winner_contact FROM contacts WHERE id = winner_id;
  SELECT * INTO loser_contact FROM contacts WHERE id = loser_id;

  IF winner_contact IS NULL OR loser_contact IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  UPDATE tasks SET contact_id = winner_id WHERE contact_id = loser_id;
  UPDATE contact_notes SET contact_id = winner_id WHERE contact_id = loser_id;

  FOR deal_record IN
    SELECT id, contact_ids FROM deals WHERE contact_ids @> ARRAY[loser_id]
  LOOP
    UPDATE deals
    SET contact_ids = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(
          array_remove(deal_record.contact_ids, loser_id) || ARRAY[winner_id]
        )
      )
    )
    WHERE id = deal_record.id;
  END LOOP;

  winner_emails := COALESCE(winner_contact.email_jsonb, '[]'::jsonb);
  loser_emails  := COALESCE(loser_contact.email_jsonb,  '[]'::jsonb);
  email_map     := '{}'::jsonb;

  IF jsonb_array_length(winner_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_emails)-1 LOOP
      email_map := email_map || jsonb_build_object(
        winner_emails->i->>'email', winner_emails->i
      );
    END LOOP;
  END IF;

  IF jsonb_array_length(loser_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_emails)-1 LOOP
      IF NOT email_map ? (loser_emails->i->>'email') THEN
        email_map := email_map || jsonb_build_object(
          loser_emails->i->>'email', loser_emails->i
        );
      END IF;
    END LOOP;
  END IF;

  merged_emails := (SELECT jsonb_agg(value) FROM jsonb_each(email_map));
  merged_emails := COALESCE(merged_emails, '[]'::jsonb);

  merged_tags := ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(winner_contact.tags, ARRAY[]::bigint[]) ||
      COALESCE(loser_contact.tags, ARRAY[]::bigint[])
    )
  );

  UPDATE contacts SET
    avatar                       = COALESCE(winner_contact.avatar,                       loser_contact.avatar),
    gender                       = COALESCE(winner_contact.gender,                       loser_contact.gender),
    first_name                   = COALESCE(winner_contact.first_name,                   loser_contact.first_name),
    last_name                    = COALESCE(winner_contact.last_name,                    loser_contact.last_name),
    title                        = COALESCE(winner_contact.title,                        loser_contact.title),
    company_id                   = COALESCE(winner_contact.company_id,                   loser_contact.company_id),
    email_jsonb                  = merged_emails,
    cell_number                  = COALESCE(winner_contact.cell_number,                  loser_contact.cell_number),
    linkedin_url                 = COALESCE(winner_contact.linkedin_url,                 loser_contact.linkedin_url),
    background                   = COALESCE(winner_contact.background,                   loser_contact.background),
    has_newsletter               = COALESCE(winner_contact.has_newsletter,               loser_contact.has_newsletter),
    first_seen                   = LEAST(
                                     COALESCE(winner_contact.first_seen, loser_contact.first_seen),
                                     COALESCE(loser_contact.first_seen,  winner_contact.first_seen)
                                   ),
    last_seen                    = GREATEST(
                                     COALESCE(winner_contact.last_seen, loser_contact.last_seen),
                                     COALESCE(loser_contact.last_seen,  winner_contact.last_seen)
                                   ),
    sales_id                     = COALESCE(winner_contact.sales_id,                     loser_contact.sales_id),
    tags                         = merged_tags,
    market_center_name           = COALESCE(winner_contact.market_center_name,           loser_contact.market_center_name),
    market_center_team_leader    = COALESCE(winner_contact.market_center_team_leader,    loser_contact.market_center_team_leader),
    market_center_tl_phone       = COALESCE(winner_contact.market_center_tl_phone,       loser_contact.market_center_tl_phone),
    market_center_tl_email       = COALESCE(winner_contact.market_center_tl_email,       loser_contact.market_center_tl_email),
    agent_role                   = COALESCE(winner_contact.agent_role,                   loser_contact.agent_role),
    languages_spoken             = COALESCE(winner_contact.languages_spoken,             loser_contact.languages_spoken),
    counties_served              = COALESCE(winner_contact.counties_served,              loser_contact.counties_served),
    cities_served                = COALESCE(winner_contact.cities_served,                loser_contact.cities_served),
    membership_tier              = COALESCE(winner_contact.membership_tier,              loser_contact.membership_tier),
    join_date                    = COALESCE(winner_contact.join_date,                    loser_contact.join_date),
    member_status                = COALESCE(winner_contact.member_status,                loser_contact.member_status),
    mc_street_address            = COALESCE(winner_contact.mc_street_address,            loser_contact.mc_street_address),
    mc_suite_unit                = COALESCE(winner_contact.mc_suite_unit,                loser_contact.mc_suite_unit),
    mc_city                      = COALESCE(winner_contact.mc_city,                      loser_contact.mc_city),
    mc_state                     = COALESCE(winner_contact.mc_state,                     loser_contact.mc_state),
    mc_zip_code                  = COALESCE(winner_contact.mc_zip_code,                  loser_contact.mc_zip_code),
    mc_country                   = COALESCE(winner_contact.mc_country,                   loser_contact.mc_country),
    facebook_url                 = COALESCE(winner_contact.facebook_url,                 loser_contact.facebook_url),
    instagram_url                = COALESCE(winner_contact.instagram_url,                loser_contact.instagram_url),
    tiktok_url                   = COALESCE(winner_contact.tiktok_url,                   loser_contact.tiktok_url),
    states_served                = COALESCE(winner_contact.states_served,                loser_contact.states_served),
    countries_served             = COALESCE(winner_contact.countries_served,             loser_contact.countries_served)
  WHERE id = winner_id;

  DELETE FROM contacts WHERE id = loser_id;

  RETURN winner_id;
END;
$$;


-- ============================================================
-- Step 7: Recreate handle_new_sales_member() trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_sales_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  meta jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.contacts WHERE sales_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT raw_user_meta_data INTO meta
  FROM auth.users
  WHERE id = NEW.user_id;

  INSERT INTO public.contacts (
    first_name,
    last_name,
    email_jsonb,
    member_status,
    first_seen,
    sales_id,
    cell_number,
    market_center_name,
    agent_role,
    market_center_team_leader,
    market_center_tl_phone,
    market_center_tl_email,
    mc_street_address,
    mc_suite_unit,
    mc_city,
    mc_state,
    mc_zip_code,
    mc_country,
    languages_spoken,
    cities_served,
    counties_served,
    states_served,
    countries_served,
    gender,
    title,
    background,
    linkedin_url,
    facebook_url,
    instagram_url,
    tiktok_url,
    membership_tier,
    has_newsletter
  )
  VALUES (
    NEW.first_name,
    NEW.last_name,
    jsonb_build_array(
      jsonb_build_object('email', NEW.email::text, 'type', 'Work')
    ),
    'Pending',
    now(),
    NEW.id,
    NULLIF(meta->>'cell_number', ''),
    NULLIF(meta->>'market_center_name', ''),
    NULLIF(meta->>'agent_role', ''),
    NULLIF(meta->>'market_center_team_leader', ''),
    NULLIF(meta->>'market_center_tl_phone', ''),
    NULLIF(meta->>'market_center_tl_email', ''),
    NULLIF(meta->>'mc_street_address', ''),
    NULLIF(meta->>'mc_suite_unit', ''),
    NULLIF(meta->>'mc_city', ''),
    NULLIF(meta->>'mc_state', ''),
    NULLIF(meta->>'mc_zip_code', ''),
    NULLIF(meta->>'mc_country', ''),
    CASE
      WHEN meta->'languages_spoken' IS NOT NULL
        AND jsonb_typeof(meta->'languages_spoken') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'languages_spoken'))
      ELSE NULL
    END,
    CASE
      WHEN meta->'cities_served' IS NOT NULL
        AND jsonb_typeof(meta->'cities_served') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'cities_served'))
      ELSE NULL
    END,
    CASE
      WHEN meta->'counties_served' IS NOT NULL
        AND jsonb_typeof(meta->'counties_served') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'counties_served'))
      ELSE NULL
    END,
    CASE
      WHEN meta->'states_served' IS NOT NULL
        AND jsonb_typeof(meta->'states_served') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'states_served'))
      ELSE NULL
    END,
    CASE
      WHEN meta->'countries_served' IS NOT NULL
        AND jsonb_typeof(meta->'countries_served') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'countries_served'))
      ELSE NULL
    END,
    NULLIF(meta->>'gender', ''),
    NULLIF(meta->>'title', ''),
    NULLIF(meta->>'background', ''),
    NULLIF(meta->>'linkedin_url', ''),
    NULLIF(meta->>'facebook_url', ''),
    NULLIF(meta->>'instagram_url', ''),
    NULLIF(meta->>'tiktok_url', ''),
    COALESCE(NULLIF(meta->>'membership_tier', ''), 'Free'),
    CASE WHEN meta->>'has_newsletter' = 'true' THEN true ELSE false END
  );

  RETURN NEW;
END;
$$;
