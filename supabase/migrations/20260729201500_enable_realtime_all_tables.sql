-- Enable Supabase Realtime Change Streams on All Tables

BEGIN;
  -- Ensure publication exists
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Add all festival tables to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsors;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.festival_settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.festival_memories;
COMMIT;
