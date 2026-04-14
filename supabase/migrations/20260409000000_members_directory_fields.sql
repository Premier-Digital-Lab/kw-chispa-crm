-- Migration: KW CHISPA Members Directory
--
-- Transforms the contacts table from a lead/contact table into a
-- KW CHISPA Members directory by:
--   1. Dropping contacts_summary view (references phone_jsonb explicitly)
--   2. Dropping legacy columns: phone_jsonb, status
--   3. Adding new member directory columns
--   4. Recreating contacts_summary without phone_fts
--   5. Updating merge_contacts() to remove phone_jsonb references
--      (would error at runtime if left referencing a dropped column)


-- ============================================================
-- Step 1: Drop views that depend on phone_jsonb
-- ============================================================

DROP VIEW IF EXISTS public.contacts_summary;


-- ============================================================
-- Step 2: Drop legacy columns
-- ============================================================

ALTER TABLE public.contacts DROP COLUMN IF EXISTS phone_jsonb;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS status;


-- ============================================================
-- Step 3: Add new member directory columns
-- ============================================================

ALTER TABLE public.contacts
    ADD COLUMN cell_number              text,
    ADD COLUMN market_center_name       text,
    ADD COLUMN market_center_address    text,
    ADD COLUMN market_center_team_leader text,
    ADD COLUMN market_center_tl_phone   text,
    ADD COLUMN market_center_tl_email   text,
    ADD COLUMN agent_role               text,
    ADD COLUMN languages_spoken         text[],
    ADD COLUMN counties_served          text[],
    ADD COLUMN cities_served            text[],
    ADD COLUMN membership_tier          text DEFAULT 'Free',
    ADD COLUMN join_date                date,
    ADD COLUMN member_status            text DEFAULT 'Active';


-- ============================================================
-- Step 4: Recreate contacts_summary
--
-- Removed: phone_fts (phone_jsonb is gone)
-- Kept:    email_fts, company_name, nb_tasks
-- New member fields are automatically included via co.*
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
-- Step 5: Update merge_contacts() to remove phone_jsonb
--
-- The previous version merged phone_jsonb arrays; that column
-- is now gone. Replaced with a simple COALESCE on cell_number.
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
  -- Fetch both contacts
  SELECT * INTO winner_contact FROM contacts WHERE id = winner_id;
  SELECT * INTO loser_contact FROM contacts WHERE id = loser_id;

  IF winner_contact IS NULL OR loser_contact IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  -- 1. Reassign tasks from loser to winner
  UPDATE tasks SET contact_id = winner_id WHERE contact_id = loser_id;

  -- 2. Reassign contact notes from loser to winner
  UPDATE contact_notes SET contact_id = winner_id WHERE contact_id = loser_id;

  -- 3. Update deals - replace loser with winner in contact_ids array
  FOR deal_record IN
    SELECT id, contact_ids
    FROM deals
    WHERE contact_ids @> ARRAY[loser_id]
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

  -- 4. Merge contact data

  -- Merge emails with deduplication by email address
  winner_emails := COALESCE(winner_contact.email_jsonb, '[]'::jsonb);
  loser_emails  := COALESCE(loser_contact.email_jsonb,  '[]'::jsonb);
  email_map     := '{}'::jsonb;

  IF jsonb_array_length(winner_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_emails)-1 LOOP
      email_map := email_map || jsonb_build_object(
        winner_emails->i->>'email',
        winner_emails->i
      );
    END LOOP;
  END IF;

  IF jsonb_array_length(loser_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_emails)-1 LOOP
      IF NOT email_map ? (loser_emails->i->>'email') THEN
        email_map := email_map || jsonb_build_object(
          loser_emails->i->>'email',
          loser_emails->i
        );
      END IF;
    END LOOP;
  END IF;

  merged_emails := (SELECT jsonb_agg(value) FROM jsonb_each(email_map));
  merged_emails := COALESCE(merged_emails, '[]'::jsonb);

  -- Merge tags (remove duplicates)
  merged_tags := ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(winner_contact.tags, ARRAY[]::bigint[]) ||
      COALESCE(loser_contact.tags, ARRAY[]::bigint[])
    )
  );

  -- 5. Update winner with merged data
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
    -- Member directory fields: prefer winner's values
    market_center_name           = COALESCE(winner_contact.market_center_name,           loser_contact.market_center_name),
    market_center_address        = COALESCE(winner_contact.market_center_address,        loser_contact.market_center_address),
    market_center_team_leader    = COALESCE(winner_contact.market_center_team_leader,    loser_contact.market_center_team_leader),
    market_center_tl_phone       = COALESCE(winner_contact.market_center_tl_phone,      loser_contact.market_center_tl_phone),
    market_center_tl_email       = COALESCE(winner_contact.market_center_tl_email,      loser_contact.market_center_tl_email),
    agent_role                   = COALESCE(winner_contact.agent_role,                   loser_contact.agent_role),
    languages_spoken             = COALESCE(winner_contact.languages_spoken,             loser_contact.languages_spoken),
    counties_served              = COALESCE(winner_contact.counties_served,              loser_contact.counties_served),
    cities_served                = COALESCE(winner_contact.cities_served,                loser_contact.cities_served),
    membership_tier              = COALESCE(winner_contact.membership_tier,              loser_contact.membership_tier),
    join_date                    = COALESCE(winner_contact.join_date,                    loser_contact.join_date),
    member_status                = COALESCE(winner_contact.member_status,               loser_contact.member_status)
  WHERE id = winner_id;

  -- 6. Delete loser contact
  DELETE FROM contacts WHERE id = loser_id;

  RETURN winner_id;
END;
$$;
