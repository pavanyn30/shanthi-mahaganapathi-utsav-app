-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT DEFAULT 'https://shanthiganapthi-2026.web.app',
    icon TEXT DEFAULT 'https://shanthiganapthi-2026.web.app/favicon.png',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_count INTEGER DEFAULT 0
);

-- Create User Notification Reads Table (Tracks read status per user)
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_notification_reads_unique UNIQUE (notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Full access to notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view read statuses" ON public.user_notification_reads;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.user_notification_reads;
DROP POLICY IF EXISTS "Users can delete read statuses" ON public.user_notification_reads;
DROP POLICY IF EXISTS "Full access to notification reads" ON public.user_notification_reads;

-- Create Policies
CREATE POLICY "Anyone can view notifications"
    ON public.notifications
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update notifications"
    ON public.notifications
    FOR UPDATE
    USING (true);

CREATE POLICY "Authenticated users can delete notifications"
    ON public.notifications
    FOR DELETE
    USING (true);

CREATE POLICY "Users can view read statuses"
    ON public.user_notification_reads
    FOR SELECT
    USING (true);

CREATE POLICY "Users can mark notifications as read"
    ON public.user_notification_reads
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update read statuses"
    ON public.user_notification_reads
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete read statuses"
    ON public.user_notification_reads
    FOR DELETE
    USING (true);

-- Add to Realtime Publication if not already added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
