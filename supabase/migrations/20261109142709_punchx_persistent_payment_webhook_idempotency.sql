CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','PROCESSED')),
  locked_until timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon, authenticated;
DROP POLICY IF EXISTS payment_webhook_events_deny_browser_access ON public.payment_webhook_events;
CREATE POLICY payment_webhook_events_deny_browser_access
  ON public.payment_webhook_events FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
