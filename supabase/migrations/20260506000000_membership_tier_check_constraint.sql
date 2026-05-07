-- Add CHECK constraint to enforce allowed values for membership_tier.
-- The column already exists (added in 20260409000000_members_directory_fields.sql);
-- this migration locks down valid values to 'Free' and 'Premier'.
ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_membership_tier_check
    CHECK (membership_tier IN ('Free', 'Premier'));
