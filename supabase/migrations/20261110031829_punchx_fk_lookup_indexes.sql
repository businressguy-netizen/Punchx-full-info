-- Add covering indexes for foreign keys flagged by Supabase's performance advisor.
-- These indexes are additive and do not change application data or access policies.
CREATE INDEX IF NOT EXISTS complaints_customer_id_idx ON public.complaints (customer_id);
CREATE INDEX IF NOT EXISTS complaints_order_id_idx ON public.complaints (order_id);
CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON public.reviews (order_id);
CREATE INDEX IF NOT EXISTS warranty_claims_customer_id_idx ON public.warranty_claims (customer_id);
CREATE INDEX IF NOT EXISTS warranty_claims_worker_id_idx ON public.warranty_claims (worker_id);
