-- Expand handle_new_sales_member() to populate all member profile fields from
-- auth.users.raw_user_meta_data. The signup form stores all profile fields in
-- options.data when calling supabase.auth.signUp(), and Supabase persists that
-- as raw_user_meta_data on the auth.users row.

CREATE OR REPLACE FUNCTION public.handle_new_sales_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  meta jsonb;
BEGIN
  -- Guard against duplicates: skip if a contacts row for this sales_id already
  -- exists. This protects users who already have a contacts row.
  IF EXISTS (
    SELECT 1 FROM public.contacts WHERE sales_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Read user metadata that was passed in options.data during signUp().
  SELECT raw_user_meta_data INTO meta
  FROM auth.users
  WHERE id = NEW.id;

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
    mc_street_number,
    mc_street_name,
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
    NULLIF(meta->>'mc_street_number', ''),
    NULLIF(meta->>'mc_street_name', ''),
    NULLIF(meta->>'mc_suite_unit', ''),
    NULLIF(meta->>'mc_city', ''),
    NULLIF(meta->>'mc_state', ''),
    NULLIF(meta->>'mc_zip_code', ''),
    NULLIF(meta->>'mc_country', ''),
    -- Arrays: metadata stores them as JSON arrays; convert to Postgres text[].
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
