-- Restrict contact_notes and deal_notes to admin users only.
-- Uses the existing public.is_admin() function (02_functions.sql) which checks
-- public.sales WHERE user_id = auth.uid() AND administrator = true.
-- The Postmark edge function and AI MCP server both run as service_role
-- and bypass RLS, so they are unaffected.

-- ============================================================
-- Contact Notes: replace permissive policies with admin-only
-- ============================================================
drop policy if exists "Enable read access for authenticated users" on public.contact_notes;
drop policy if exists "Enable insert for authenticated users only" on public.contact_notes;
drop policy if exists "Contact Notes Update policy" on public.contact_notes;
drop policy if exists "Contact Notes Delete Policy" on public.contact_notes;

create policy "Contact Notes: admin read" on public.contact_notes
  for select to authenticated
  using (public.is_admin());

create policy "Contact Notes: admin insert" on public.contact_notes
  for insert to authenticated
  with check (public.is_admin());

create policy "Contact Notes: admin update" on public.contact_notes
  for update to authenticated
  using (public.is_admin());

create policy "Contact Notes: admin delete" on public.contact_notes
  for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- Deal Notes: replace permissive policies with admin-only
-- ============================================================
drop policy if exists "Enable read access for authenticated users" on public.deal_notes;
drop policy if exists "Enable insert for authenticated users only" on public.deal_notes;
drop policy if exists "Deal Notes Update Policy" on public.deal_notes;
drop policy if exists "Deal Notes Delete Policy" on public.deal_notes;

create policy "Deal Notes: admin read" on public.deal_notes
  for select to authenticated
  using (public.is_admin());

create policy "Deal Notes: admin insert" on public.deal_notes
  for insert to authenticated
  with check (public.is_admin());

create policy "Deal Notes: admin update" on public.deal_notes
  for update to authenticated
  using (public.is_admin());

create policy "Deal Notes: admin delete" on public.deal_notes
  for delete to authenticated
  using (public.is_admin());
