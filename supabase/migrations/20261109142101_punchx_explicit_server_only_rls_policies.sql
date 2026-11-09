-- Operational tables are accessed only through the authenticated Express backend.
-- Supabase browser roles receive an explicit deny policy; server DB connections use the backend-only database credential.
DROP POLICY IF EXISTS profiles_deny_browser_access ON public.profiles;
CREATE POLICY profiles_deny_browser_access ON public.profiles FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS bookings_deny_browser_access ON public.bookings;
CREATE POLICY bookings_deny_browser_access ON public.bookings FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS booking_items_deny_browser_access ON public.booking_items;
CREATE POLICY booking_items_deny_browser_access ON public.booking_items FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS booking_status_history_deny_browser_access ON public.booking_status_history;
CREATE POLICY booking_status_history_deny_browser_access ON public.booking_status_history FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS payments_deny_browser_access ON public.payments;
CREATE POLICY payments_deny_browser_access ON public.payments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS invoices_deny_browser_access ON public.invoices;
CREATE POLICY invoices_deny_browser_access ON public.invoices FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS commission_ledger_deny_browser_access ON public.commission_ledger;
CREATE POLICY commission_ledger_deny_browser_access ON public.commission_ledger FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS whatsapp_events_deny_browser_access ON public.whatsapp_events;
CREATE POLICY whatsapp_events_deny_browser_access ON public.whatsapp_events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS users_deny_browser_access ON public.users;
CREATE POLICY users_deny_browser_access ON public.users FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS worker_applications_deny_browser_access ON public.worker_applications;
CREATE POLICY worker_applications_deny_browser_access ON public.worker_applications FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS orders_deny_browser_access ON public.orders;
CREATE POLICY orders_deny_browser_access ON public.orders FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS warranty_claims_deny_browser_access ON public.warranty_claims;
CREATE POLICY warranty_claims_deny_browser_access ON public.warranty_claims FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS complaints_deny_browser_access ON public.complaints;
CREATE POLICY complaints_deny_browser_access ON public.complaints FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS reviews_deny_browser_access ON public.reviews;
CREATE POLICY reviews_deny_browser_access ON public.reviews FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS platform_settings_deny_browser_access ON public.platform_settings;
CREATE POLICY platform_settings_deny_browser_access ON public.platform_settings FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
