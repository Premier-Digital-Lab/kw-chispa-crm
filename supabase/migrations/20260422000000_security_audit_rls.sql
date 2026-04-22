-- ============================================================
-- SECURITY AUDIT: Tighten RLS policies across all tables
-- Date: 2026-04-22
-- 
-- Summary of changes:
--   contacts: admins full access, members read all + update own only
--   sales: admins full access, members read all + update own only  
--   companies: admin-only
--   deals: admin-only
--   tasks: admin-only
--   tags: admin-only
--
-- Helper: is_admin() already exists — checks sales.administrator = true
-- Link: auth.uid() → sales.user_id → sales.id → contacts.sales_id
-- ============================================================

-- ============================================================
-- CONTACTS (Members): admins full, members read + update own
-- ============================================================
drop policy if exists "Contact Delete Policy" on public.contacts;
drop policy if exists "Enable insert for authenticated users only" on public.contacts;
drop policy if exists "Enable read access for authenticated users" on public.contacts;
drop policy if exists "Enable update for authenticated users only" on public.contacts;

-- All authenticated users can read all contacts (needed for Find an Agent)
create policy "Contacts: read for authenticated"
  on public.contacts for select to authenticated
  using (true);

-- Only admins can insert new contacts
create policy "Contacts: admin insert"
  on public.contacts for insert to authenticated
  with check (public.is_admin());

-- Admins can update any contact; members can update only their own
create policy "Contacts: admin or own update"
  on public.contacts for update to authenticated
  using (
    public.is_admin()
    OR sales_id = (select id from public.sales where user_id = auth.uid())
  );

-- Only admins can delete contacts
create policy "Contacts: admin delete"
  on public.contacts for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- SALES (Accounts): admins full, members read + update own
-- ============================================================
drop policy if exists "Enable read access for authenticated users" on public.sales;
drop policy if exists "Enable update for authenticated users only" on public.sales;
drop policy if exists "Enable insert for authenticated users only" on public.sales;
drop policy if exists "Enable delete for authenticated users only" on public.sales;

-- All authenticated users can read all sales records (needed for directory)
create policy "Sales: read for authenticated"
  on public.sales for select to authenticated
  using (true);

-- Only admins can insert new sales records (self-registration uses service_role)
create policy "Sales: admin insert"
  on public.sales for insert to authenticated
  with check (public.is_admin());

-- Admins can update any record; members can update only their own
-- Super-admin protection is handled by the existing edge function
create policy "Sales: admin or own update"
  on public.sales for update to authenticated
  using (
    public.is_admin()
    OR user_id = auth.uid()
  );

-- Only admins can delete sales records
create policy "Sales: admin delete"
  on public.sales for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- COMPANIES: admin-only (not used in UI, tab removed)
-- ============================================================
drop policy if exists "Company Delete Policy" on public.companies;
drop policy if exists "Enable insert for authenticated users only" on public.companies;
drop policy if exists "Enable read access for authenticated users" on public.companies;
drop policy if exists "Enable update for authenticated users only" on public.companies;

create policy "Companies: admin read"
  on public.companies for select to authenticated
  using (public.is_admin());

create policy "Companies: admin insert"
  on public.companies for insert to authenticated
  with check (public.is_admin());

create policy "Companies: admin update"
  on public.companies for update to authenticated
  using (public.is_admin());

create policy "Companies: admin delete"
  on public.companies for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- DEALS: admin-only (not used in UI, tab removed)
-- ============================================================
drop policy if exists "Deals Delete Policy" on public.deals;
drop policy if exists "Enable insert for authenticated users only" on public.deals;
drop policy if exists "Enable read access for authenticated users" on public.deals;
drop policy if exists "Enable update for authenticated users only" on public.deals;

create policy "Deals: admin read"
  on public.deals for select to authenticated
  using (public.is_admin());

create policy "Deals: admin insert"
  on public.deals for insert to authenticated
  with check (public.is_admin());

create policy "Deals: admin update"
  on public.deals for update to authenticated
  using (public.is_admin());

create policy "Deals: admin delete"
  on public.deals for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- TASKS: admin-only
-- ============================================================
drop policy if exists "Task Delete Policy" on public.tasks;
drop policy if exists "Task Update Policy" on public.tasks;
drop policy if exists "Enable insert for authenticated users only" on public.tasks;
drop policy if exists "Enable read access for authenticated users" on public.tasks;

create policy "Tasks: admin read"
  on public.tasks for select to authenticated
  using (public.is_admin());

create policy "Tasks: admin insert"
  on public.tasks for insert to authenticated
  with check (public.is_admin());

create policy "Tasks: admin update"
  on public.tasks for update to authenticated
  using (public.is_admin());

create policy "Tasks: admin delete"
  on public.tasks for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- TAGS: admin-only
-- ============================================================
drop policy if exists "Enable delete for authenticated users only" on public.tags;
drop policy if exists "Enable insert for authenticated users only" on public.tags;
drop policy if exists "Enable read access for authenticated users" on public.tags;
drop policy if exists "Enable update for authenticated users only" on public.tags;

create policy "Tags: admin read"
  on public.tags for select to authenticated
  using (public.is_admin());

create policy "Tags: admin insert"
  on public.tags for insert to authenticated
  with check (public.is_admin());

create policy "Tags: admin update"
  on public.tags for update to authenticated
  using (public.is_admin());

create policy "Tags: admin delete"
  on public.tags for delete to authenticated
  using (public.is_admin());
