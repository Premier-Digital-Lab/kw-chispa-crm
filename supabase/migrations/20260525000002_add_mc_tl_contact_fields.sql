ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS mc_tl_phone text,
  ADD COLUMN IF NOT EXISTS mc_tl_email text;
