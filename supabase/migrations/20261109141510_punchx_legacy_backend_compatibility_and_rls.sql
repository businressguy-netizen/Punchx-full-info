-- PUNCHX compatibility layer for the existing Express IDatabaseAdapter.
-- Additive only. The canonical Supabase booking tables remain untouched.
-- Operational tables are server-only; browser roles are denied by RLS.

CREATE TABLE IF NOT EXISTS public.users (
  id varchar(128) PRIMARY KEY,
  name varchar(255) NOT NULL DEFAULT '',
  email varchar(255),
  photo_url text,
  role varchar(32) NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','worker','admin')),
  phone varchar(32), dob varchar(32), is_profile_completed boolean DEFAULT false,
  address text, landmark text, area varchar(128), sector varchar(128),
  visiting_fee numeric(10,2) DEFAULT 0, worker_skill varchar(128),
  worker_categories text[] DEFAULT '{}', worker_experience varchar(64),
  worker_rating numeric(3,2) DEFAULT 5, worker_completed_jobs integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_nonempty_idx ON public.users (lower(email)) WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
CREATE INDEX IF NOT EXISTS users_sector_idx ON public.users(sector);

CREATE TABLE IF NOT EXISTS public.worker_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid varchar(128) REFERENCES public.users(id) ON DELETE SET NULL,
  legal_name varchar(255) NOT NULL, address text NOT NULL DEFAULT '',
  area varchar(128), sector varchar(128), skill varchar(128) NOT NULL,
  categories text[] DEFAULT '{}', custom_skill varchar(128),
  experience_years varchar(64) NOT NULL DEFAULT '', phone varchar(32) NOT NULL,
  email varchar(255) NOT NULL, visiting_fee numeric(10,2) DEFAULT 0,
  terms_accepted boolean NOT NULL DEFAULT false,
  status varchar(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  notes text, applied_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS worker_applications_uid_idx ON public.worker_applications(uid);
CREATE INDEX IF NOT EXISTS worker_applications_status_idx ON public.worker_applications(status);
CREATE INDEX IF NOT EXISTS worker_applications_contact_idx ON public.worker_applications(phone,email);

CREATE TABLE IF NOT EXISTS public.orders (
  id varchar(128) PRIMARY KEY, category varchar(128) NOT NULL,
  customer_id varchar(128) REFERENCES public.users(id) ON DELETE SET NULL,
  worker_id varchar(128) REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name varchar(255), customer_address text, customer_phone varchar(32),
  customer_lat numeric(10,7), customer_lng numeric(10,7),
  worker_name varchar(255), worker_phone varchar(32), worker_avatar text, worker_rating numeric(3,2),
  price numeric(10,2) NOT NULL DEFAULT 0, original_price numeric(10,2),
  discount_applied numeric(10,2) DEFAULT 0, coupon_used varchar(64),
  visiting_fee numeric(10,2) DEFAULT 0, platform_commission numeric(10,2) DEFAULT 0,
  gst_amount numeric(10,2) DEFAULT 0, total_amount_to_pay numeric(10,2) NOT NULL DEFAULT 0,
  date varchar(64) NOT NULL DEFAULT '', time varchar(64), status varchar(32) NOT NULL DEFAULT 'Pending',
  area varchar(128), sector varchar(128), otp_code varchar(16), issue_description text, photo_proof text,
  is_rated boolean DEFAULT false, user_rating numeric(3,2), user_behaviour varchar(64),
  payment_method varchar(64) DEFAULT 'COD', has_warranty_guarantee boolean DEFAULT true,
  warranty_fee numeric(10,2) DEFAULT 0, warranty_expiry_date varchar(64),
  warranty_claim_id varchar(128), warranty_claim_status varchar(64),
  dispatch_mode varchar(64) DEFAULT 'AREA_MATCH', personal_select_fee numeric(10,2) DEFAULT 0,
  is_emergency boolean DEFAULT false, emergency_eta varchar(32), emergency_surcharge numeric(10,2) DEFAULT 0,
  base_fee numeric(10,2) DEFAULT 0, arrival_feedback_submitted boolean DEFAULT false,
  arrival_quality jsonb, quality_discount_applied numeric(10,2) DEFAULT 0,
  prepaid_refund_amount numeric(10,2) DEFAULT 0, prepaid_refund_status varchar(32) DEFAULT 'NONE',
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_worker_idx ON public.orders(worker_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at DESC);

CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id varchar(128) PRIMARY KEY,
  order_id varchar(128) REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id varchar(128) REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name varchar(255) NOT NULL, customer_phone varchar(32) NOT NULL, customer_address text NOT NULL,
  worker_id varchar(128) REFERENCES public.users(id) ON DELETE SET NULL, worker_name varchar(255),
  category varchar(128) NOT NULL, recurring_issue text, problem_description text,
  days_recurring varchar(32), problem_duration_days varchar(32), photo_proof text,
  preferred_date varchar(64), preferred_time_slot varchar(64),
  status varchar(64) NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW', admin_notes text,
  rebooking_date varchar(64), rebooking_time varchar(64), rebooking_order_id varchar(128),
  worker_payout_fee numeric(10,2) DEFAULT 59, service_person_visiting_charge numeric(10,2) DEFAULT 59,
  customer_charge numeric(10,2) DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz, approved_at timestamptz, rejected_at timestamptz, rejection_reason text
);
CREATE INDEX IF NOT EXISTS warranty_claims_status_idx ON public.warranty_claims(status);
CREATE INDEX IF NOT EXISTS warranty_claims_order_idx ON public.warranty_claims(order_id);

CREATE TABLE IF NOT EXISTS public.complaints (
  id varchar(128) PRIMARY KEY,
  order_id varchar(128) REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id varchar(128) REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name varchar(255) NOT NULL, customer_phone varchar(32) NOT NULL, customer_address text NOT NULL,
  worker_name varchar(255) NOT NULL, worker_phone varchar(32), worker_category varchar(128),
  correct_equipment boolean DEFAULT true, equipment_working boolean DEFAULT true,
  behaviour_rating varchar(32) NOT NULL DEFAULT 'EXCELLENT', comment text,
  status varchar(64) NOT NULL DEFAULT 'CRITICAL_PENDING_ADMIN', discount_amount numeric(10,2) DEFAULT 0,
  payment_method varchar(64), refund_type varchar(64) DEFAULT 'COD_DISCOUNT',
  refund_status varchar(64) DEFAULT 'DISCOUNT_APPLIED', admin_action_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON public.complaints(status);

CREATE TABLE IF NOT EXISTS public.reviews (
  id varchar(128) PRIMARY KEY,
  order_id varchar(128) REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name varchar(255) NOT NULL,
  worker_id varchar(128) REFERENCES public.users(id) ON DELETE SET NULL,
  worker_name varchar(255) NOT NULL, category varchar(128) NOT NULL,
  rating numeric(3,2) NOT NULL DEFAULT 5, comment text,
  punctuality varchar(32), professionalism varchar(32), cleanliness varchar(32), tags text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_worker_idx ON public.reviews(worker_id);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key varchar(128) PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','worker_applications','orders','warranty_claims','complaints','reviews','platform_settings']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS service_categories_public_read ON public.service_categories;
CREATE POLICY service_categories_public_read ON public.service_categories FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS service_items_public_read ON public.service_items;
CREATE POLICY service_items_public_read ON public.service_items FOR SELECT TO anon, authenticated
USING (is_active = true AND EXISTS (
  SELECT 1 FROM public.service_categories c WHERE c.id = service_items.category_id AND c.is_active = true
));
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
