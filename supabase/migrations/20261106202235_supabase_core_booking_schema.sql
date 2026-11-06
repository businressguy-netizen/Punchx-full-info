create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'citizen' check (role in ('citizen','professional','admin')),
 full_name text not null default '', email text, phone text, avatar_url text,
 profile_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index profiles_phone_unique on public.profiles(phone) where phone is not null and phone <> '';
create index profiles_role_idx on public.profiles(role);
create table public.service_categories (
 id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text, icon text,
 is_active boolean not null default true, sort_order integer not null default 0, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.service_items (
 id uuid primary key default gen_random_uuid(), category_id uuid not null references public.service_categories(id) on delete restrict,
 sku text unique, name text not null, description text, base_price numeric(12,2), price_unit text,
 is_active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint service_items_base_price_nonnegative check (base_price is null or base_price >= 0)
);
create index service_items_category_idx on public.service_items(category_id);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), order_code text not null unique,
 customer_id uuid not null references public.profiles(id) on delete restrict,
 assigned_professional_id uuid references public.profiles(id) on delete set null,
 status text not null default 'PENDING_ADMIN_REVIEW' check (status in ('PENDING_ADMIN_REVIEW','ADMIN_ACCEPTED','PENDING_CUSTOMER_CONFIRMATION','CONFIRMED','PROFESSIONAL_ASSIGNED','SERVICE_IN_PROGRESS','SERVICE_COMPLETED','PAYMENT_PENDING','PAID','INVOICE_SENT','COMPLETED','REJECTED','CANCELLED')),
 customer_confirmation_status text not null default 'NOT_STARTED' check (customer_confirmation_status in ('NOT_STARTED','PENDING','CONFIRMED','EXPIRED')),
 payment_status text not null default 'NOT_DUE' check (payment_status in ('NOT_DUE','PENDING','PROCESSING','PAID','FAILED','REFUNDED')),
 service_address jsonb not null, preferred_at timestamptz, customer_note text, service_area text,
 estimated_amount numeric(12,2), final_service_amount numeric(12,2), platform_fee numeric(12,2) not null default 0,
 tax_amount numeric(12,2) not null default 0, total_amount numeric(12,2), currency char(3) not null default 'INR',
 accepted_by uuid references public.profiles(id) on delete set null, accepted_at timestamptz,
 rejected_by uuid references public.profiles(id) on delete set null, rejected_at timestamptz,
 customer_confirmed_at timestamptz, service_started_at timestamptz, service_completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb,
 constraint booking_amounts_nonnegative check ((estimated_amount is null or estimated_amount >= 0) and (final_service_amount is null or final_service_amount >= 0) and platform_fee >= 0 and tax_amount >= 0 and (total_amount is null or total_amount >= 0))
);
create index bookings_customer_created_idx on public.bookings(customer_id, created_at desc);
create index bookings_status_created_idx on public.bookings(status, created_at desc);
create index bookings_professional_status_idx on public.bookings(assigned_professional_id, status);
create table public.booking_items (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
 service_item_id uuid references public.service_items(id) on delete set null,
 item_type text not null default 'SERVICE' check (item_type in ('SERVICE','PRODUCT','MATERIAL','CUSTOM')),
 name_snapshot text not null, description_snapshot text, sku_snapshot text, quantity numeric(12,3) not null default 1 check (quantity > 0),
 unit_price numeric(12,2), line_total numeric(12,2), details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 constraint booking_item_amounts_nonnegative check ((unit_price is null or unit_price >= 0) and (line_total is null or line_total >= 0))
);
create index booking_items_booking_idx on public.booking_items(booking_id);
create table public.booking_status_history (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
 from_status text, to_status text not null, actor_id uuid references public.profiles(id) on delete set null,
 actor_role text not null check (actor_role in ('citizen','professional','admin','system')), note text, created_at timestamptz not null default now()
);
create index booking_status_history_booking_idx on public.booking_status_history(booking_id, created_at);
create table public.payments (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete restrict,
 provider text not null default 'razorpay', provider_order_id text unique, provider_payment_id text unique,
 amount numeric(12,2) not null check (amount > 0), currency char(3) not null default 'INR',
 status text not null default 'CREATED' check (status in ('CREATED','PENDING','AUTHORIZED','CAPTURED','FAILED','REFUNDED')),
 idempotency_key text not null unique, verified_at timestamptz, provider_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index payments_booking_idx on public.payments(booking_id, created_at desc);
create table public.invoices (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete restrict,
 invoice_number text not null unique, amount numeric(12,2) not null check (amount >= 0), currency char(3) not null default 'INR',
 status text not null default 'GENERATED' check (status in ('GENERATED','SENT','VOID')),
 document_url text, invoice_data jsonb not null default '{}'::jsonb, generated_at timestamptz not null default now(), sent_at timestamptz
);
create table public.commission_ledger (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete restrict,
 professional_id uuid not null references public.profiles(id) on delete restrict,
 gross_amount numeric(12,2) not null check (gross_amount >= 0), platform_commission numeric(12,2) not null check (platform_commission >= 0),
 professional_payable numeric(12,2) not null check (professional_payable >= 0),
 settlement_status text not null default 'PENDING' check (settlement_status in ('PENDING','PROCESSING','SETTLED','HELD','REVERSED')),
 settled_at timestamptz, created_at timestamptz not null default now()
);
create table public.whatsapp_events (
 id uuid primary key default gen_random_uuid(), provider_event_id text not null unique,
 booking_id uuid references public.bookings(id) on delete set null, sender_phone text, event_type text not null,
 processing_status text not null default 'RECEIVED' check (processing_status in ('RECEIVED','PROCESSED','IGNORED','FAILED')),
 received_at timestamptz not null default now(), processed_at timestamptz, metadata jsonb not null default '{}'::jsonb
);
do $$
declare t text;
begin
 foreach t in array array['profiles','service_categories','service_items','bookings','booking_items','booking_status_history','payments','invoices','commission_ledger','whatsapp_events'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on table public.%I from anon, authenticated', t);
  execute format('grant all on table public.%I to service_role', t);
 end loop;
end $$;