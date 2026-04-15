-- Migration: Change member_status column default from 'Active' to 'Pending'
--
-- The form SelectInput already sets defaultValue="Pending", but when the
-- Membership tab is never opened during a new-member creation, the field is
-- absent from the INSERT payload and Postgres fills in the column DEFAULT
-- instead. Aligning the DB default with the form default ensures consistent
-- behaviour regardless of which tabs the user visits.

ALTER TABLE public.contacts
    ALTER COLUMN member_status SET DEFAULT 'Pending';
