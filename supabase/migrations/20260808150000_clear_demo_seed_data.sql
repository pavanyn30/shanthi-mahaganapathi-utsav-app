-- Clear all sample/demo seed data from the production database
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.announcements CASCADE;
TRUNCATE TABLE public.sponsors CASCADE;
TRUNCATE TABLE public.gallery_items CASCADE;
TRUNCATE TABLE public.donations CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.volunteers CASCADE;
TRUNCATE TABLE public.festival_memories CASCADE;
TRUNCATE TABLE public.festival_schedules CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.user_notification_reads CASCADE;

-- Reset festival_settings to clean initial state for Admin customization
UPDATE public.festival_settings
SET 
  festival_name = 'SHANTHI MAHA GANAPATHI 2026',
  start_date = '2026-09-14',
  end_date = '2026-09-24',
  live_stream_url = NULL,
  upi_id = NULL,
  donation_goal = 500000,
  contact_phone = NULL,
  contact_email = NULL,
  address = NULL
WHERE id = 1;
