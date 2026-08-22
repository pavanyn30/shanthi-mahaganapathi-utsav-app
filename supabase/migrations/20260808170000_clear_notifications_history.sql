-- Clear all notification records and user read tracking from the production database
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.user_notification_reads CASCADE;
