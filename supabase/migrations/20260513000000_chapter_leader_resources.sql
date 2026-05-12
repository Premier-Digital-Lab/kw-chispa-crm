CREATE TABLE IF NOT EXISTS chapter_leader_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now(),
  created_by bigint REFERENCES sales(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0
);

ALTER TABLE chapter_leader_resources ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins can do everything on chapter_leader_resources"
  ON chapter_leader_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.user_id = auth.uid()
        AND sales.administrator = true
        AND (sales.disabled IS NULL OR sales.disabled = false)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.user_id = auth.uid()
        AND sales.administrator = true
        AND (sales.disabled IS NULL OR sales.disabled = false)
    )
  );

-- Chapter leaders and active members can read
CREATE POLICY "Chapter leaders and members can read chapter_leader_resources"
  ON chapter_leader_resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.sales_id = (
        SELECT id FROM sales WHERE sales.user_id = auth.uid() LIMIT 1
      )
      AND (
        contacts.is_chapter_leader = true
        OR contacts.member_status = 'Active'
      )
    )
  );
