ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status varchar(32) CHECK (status IS NULL OR status IN ('PENDING','APPROVED','REJECTED','SUSPENDED'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS application_id varchar(128);
