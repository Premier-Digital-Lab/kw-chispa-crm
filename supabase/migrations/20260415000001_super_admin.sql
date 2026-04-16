-- Add is_super_admin column to the sales table
ALTER TABLE public.sales
  ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Assign super-admin status to Nikki (case-insensitive match)
UPDATE public.sales
  SET is_super_admin = true
  WHERE email ILIKE 'your.premier.digital.lab@gmail.com';

-- Enforce uniqueness: only one row may ever have is_super_admin = true.
-- A partial unique index on the filtered set means a second row with
-- is_super_admin = true will fail with a unique-constraint violation.
CREATE UNIQUE INDEX idx_sales_single_super_admin
  ON public.sales (is_super_admin)
  WHERE is_super_admin = true;
