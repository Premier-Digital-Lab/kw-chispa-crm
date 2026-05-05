-- Add KW Website field to contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS kw_website text;
