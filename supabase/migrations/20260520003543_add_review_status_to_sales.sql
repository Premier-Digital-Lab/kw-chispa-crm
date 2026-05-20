ALTER TABLE sales ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';

-- Set existing approved members (disabled = false) to 'approved'
UPDATE sales SET review_status = 'approved' WHERE disabled = false;

-- Set existing super admin to 'approved'
UPDATE sales SET review_status = 'approved' WHERE is_super_admin = true;
