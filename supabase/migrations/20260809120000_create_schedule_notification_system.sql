-- Create Schedule Notification Logs Table for Idempotency & Tracking
CREATE TABLE IF NOT EXISTS public.schedule_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.festival_schedules(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('30_min', '15_min', '5_min')),
    scheduled_time TEXT NOT NULL, -- Stores start_time (e.g. '07:00' or '19:00:00')
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'sent',
    onesignal_id TEXT,
    recipients_count INTEGER DEFAULT 0,
    CONSTRAINT schedule_notification_logs_unique UNIQUE (schedule_id, notification_type, scheduled_time)
);

-- Index for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_schedule_notification_logs_lookup 
ON public.schedule_notification_logs (schedule_id, notification_type, scheduled_time);

-- Enable Row Level Security (RLS)
ALTER TABLE public.schedule_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for schedule_notification_logs
DROP POLICY IF EXISTS "Anyone can view schedule notification logs" ON public.schedule_notification_logs;
DROP POLICY IF EXISTS "Authenticated users can insert schedule notification logs" ON public.schedule_notification_logs;
DROP POLICY IF EXISTS "Authenticated users can update schedule notification logs" ON public.schedule_notification_logs;
DROP POLICY IF EXISTS "Authenticated users can delete schedule notification logs" ON public.schedule_notification_logs;

CREATE POLICY "Anyone can view schedule notification logs"
    ON public.schedule_notification_logs FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert schedule notification logs"
    ON public.schedule_notification_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule notification logs"
    ON public.schedule_notification_logs FOR UPDATE
    USING (true);

CREATE POLICY "Authenticated users can delete schedule notification logs"
    ON public.schedule_notification_logs FOR DELETE
    USING (true);

-- Enable Realtime for schedule_notification_logs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_notification_logs;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Optional pg_cron & pg_net configuration if extensions exist
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    
    PERFORM cron.schedule(
      'auto-process-schedule-notifications',
      '* * * * *',
      $cron_job$
      DO $net_call$
      BEGIN
        PERFORM net.http_post(
          url := 'https://btuvycmteycrvflaxhgc.supabase.co/functions/v1/process-schedule-notifications',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body := '{}'::jsonb
        );
      END;
      $net_call$;
      $cron_job$
    );
EXCEPTION WHEN OTHERS THEN
    -- If pg_cron/pg_net is restricted or requires elevated extension privileges, catch safely
    NULL;
END $$;
