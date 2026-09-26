-- ====================================================================
-- PUNCHX Raven PostgreSQL Database Migration Schema v1.0
-- High-Performance Relational Schema for Service Platform
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY, -- Maps to Firebase UID / Auth ID
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    photo_url TEXT,
    role VARCHAR(32) NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'worker', 'admin')),
    phone VARCHAR(32),
    dob VARCHAR(32),
    is_profile_completed BOOLEAN DEFAULT FALSE,
    address TEXT,
    landmark TEXT,
    area VARCHAR(128),
    sector VARCHAR(128),
    visiting_fee DECIMAL(10, 2) DEFAULT 0.00,
    worker_skill VARCHAR(128),
    worker_categories TEXT[], -- Array of category names
    worker_experience VARCHAR(64),
    worker_rating DECIMAL(3, 2) DEFAULT 5.00,
    worker_completed_jobs INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector);

-- 3. Worker Applications Table
CREATE TABLE IF NOT EXISTS worker_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
    legal_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    area VARCHAR(128),
    sector VARCHAR(128),
    skill VARCHAR(128) NOT NULL,
    categories TEXT[],
    custom_skill VARCHAR(128),
    experience_years VARCHAR(64) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    visiting_fee DECIMAL(10, 2) DEFAULT 0.00,
    terms_accepted BOOLEAN DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_apps_status ON worker_applications(status);
CREATE INDEX IF NOT EXISTS idx_worker_apps_uid ON worker_applications(uid);

-- 4. Service Categories Catalog Table
CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    icon VARCHAR(64) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 199.00,
    emergency_eta VARCHAR(32) DEFAULT '15 mins',
    emergency_surcharge DECIMAL(10, 2) DEFAULT 99.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(128) PRIMARY KEY,
    category VARCHAR(128) NOT NULL,
    customer_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    worker_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_address TEXT,
    customer_phone VARCHAR(32),
    customer_lat DECIMAL(10, 7),
    customer_lng DECIMAL(10, 7),
    worker_name VARCHAR(255),
    worker_phone VARCHAR(32),
    worker_avatar TEXT,
    worker_rating DECIMAL(3, 2),
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    discount_applied DECIMAL(10, 2) DEFAULT 0.00,
    coupon_used VARCHAR(64),
    visiting_fee DECIMAL(10, 2) DEFAULT 0.00,
    platform_commission DECIMAL(10, 2) DEFAULT 0.00,
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount_to_pay DECIMAL(10, 2) NOT NULL,
    date VARCHAR(64) NOT NULL,
    time VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'In-Progress', 'Done', 'Cancelled')),
    area VARCHAR(128),
    sector VARCHAR(128),
    otp_code VARCHAR(16),
    issue_description TEXT,
    photo_proof TEXT,
    is_rated BOOLEAN DEFAULT FALSE,
    user_rating DECIMAL(3, 2),
    user_behaviour VARCHAR(64),
    payment_method VARCHAR(64) DEFAULT 'COD',
    has_warranty_guarantee BOOLEAN DEFAULT TRUE,
    warranty_fee DECIMAL(10, 2) DEFAULT 0.00,
    warranty_expiry_date VARCHAR(64),
    warranty_claim_id VARCHAR(128),
    warranty_claim_status VARCHAR(64),
    dispatch_mode VARCHAR(64) DEFAULT 'BROADCAST_15KM',
    personal_select_fee DECIMAL(10, 2) DEFAULT 0.00,
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_eta VARCHAR(32),
    emergency_surcharge DECIMAL(10, 2) DEFAULT 0.00,
    base_fee DECIMAL(10, 2) DEFAULT 0.00,
    arrival_feedback_submitted BOOLEAN DEFAULT FALSE,
    arrival_quality JSONB,
    quality_discount_applied DECIMAL(10, 2) DEFAULT 0.00,
    prepaid_refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    prepaid_refund_status VARCHAR(32) DEFAULT 'NONE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_worker ON orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- 6. Warranty Claims Table
CREATE TABLE IF NOT EXISTS warranty_claims (
    id VARCHAR(128) PRIMARY KEY,
    order_id VARCHAR(128) REFERENCES orders(id) ON DELETE CASCADE,
    customer_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_address TEXT NOT NULL,
    worker_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    worker_name VARCHAR(255),
    category VARCHAR(128) NOT NULL,
    recurring_issue TEXT,
    problem_description TEXT,
    days_recurring VARCHAR(32),
    problem_duration_days VARCHAR(32),
    photo_proof TEXT,
    preferred_date VARCHAR(64),
    preferred_time_slot VARCHAR(64),
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
    admin_notes TEXT,
    rebooking_date VARCHAR(64),
    rebooking_time VARCHAR(64),
    rebooking_order_id VARCHAR(128),
    worker_payout_fee DECIMAL(10, 2) DEFAULT 59.00,
    service_person_visiting_charge DECIMAL(10, 2) DEFAULT 59.00,
    customer_charge DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_order ON warranty_claims(order_id);

-- 7. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(128) PRIMARY KEY,
    order_id VARCHAR(128) REFERENCES orders(id) ON DELETE CASCADE,
    customer_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_address TEXT NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    worker_phone VARCHAR(32),
    worker_category VARCHAR(128),
    correct_equipment BOOLEAN DEFAULT TRUE,
    equipment_working BOOLEAN DEFAULT TRUE,
    behaviour_rating VARCHAR(32) NOT NULL DEFAULT 'EXCELLENT',
    comment TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'CRITICAL_PENDING_ADMIN',
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(64),
    refund_type VARCHAR(64) DEFAULT 'COD_DISCOUNT',
    refund_status VARCHAR(64) DEFAULT 'DISCOUNT_APPLIED',
    admin_action_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- 8. Customer Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(128) PRIMARY KEY,
    order_id VARCHAR(128) REFERENCES orders(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    worker_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    worker_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    comment TEXT,
    punctuality VARCHAR(32),
    professionalism VARCHAR(32),
    cleanliness VARCHAR(32),
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id);

-- 9. Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial categories if not present
INSERT INTO service_categories (id, name, icon, base_price, emergency_eta, emergency_surcharge)
VALUES 
    ('ac', 'AC Repair', 'ac_unit', 199.00, '15 mins', 99.00),
    ('electrical', 'Electrical Systems', 'electrical_services', 179.00, '12 mins', 79.00),
    ('plumbing', 'Plumbing & Drainage', 'plumbing', 159.00, '18 mins', 69.00),
    ('cleaning', 'Deep Cleaning', 'cleaning_services', 249.00, '25 mins', 119.00),
    ('carpentry', 'Carpentry & Locks', 'carpenter', 189.00, '20 mins', 89.00)
ON CONFLICT (id) DO NOTHING;
