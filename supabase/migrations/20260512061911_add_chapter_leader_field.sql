ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_chapter_leader boolean NOT NULL DEFAULT false;
