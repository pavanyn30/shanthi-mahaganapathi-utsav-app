-- ============================================================================
-- FULL SUPABASE REALTIME CONFIGURATION SCRIPT
-- Enables Realtime (CDC - Change Data Capture) for all tables with REPLICA IDENTITY FULL
-- ============================================================================

BEGIN;

  -- 1. Create supabase_realtime publication if it doesn't already exist
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- 2. Set REPLICA IDENTITY to FULL for all application tables
  -- (Ensures INSERT, UPDATE, and DELETE real-time payloads include all row data)
  ALTER TABLE public.announcements REPLICA IDENTITY FULL;
  ALTER TABLE public.donations REPLICA IDENTITY FULL;
  ALTER TABLE public.events REPLICA IDENTITY FULL;
  ALTER TABLE public.festival_memories REPLICA IDENTITY FULL;
  ALTER TABLE public.festival_settings REPLICA IDENTITY FULL;
  ALTER TABLE public.gallery_items REPLICA IDENTITY FULL;
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  ALTER TABLE public.registrations REPLICA IDENTITY FULL;
  ALTER TABLE public.sponsors REPLICA IDENTITY FULL;
  ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
  ALTER TABLE public.volunteers REPLICA IDENTITY FULL;

  -- 3. Safely add tables to publication if they are not already in supabase_realtime
  DO $$
  DECLARE
    tbl text;
    tbls text[] := ARRAY[
      'announcements',
      'donations',
      'events',
      'festival_memories',
      'festival_settings',
      'gallery_items',
      'profiles',
      'registrations',
      'sponsors',
      'user_roles',
      'volunteers'
    ];
  BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
      ) THEN
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
      END IF;
    END LOOP;
  END
  $$;

COMMIT;

-- 4. Verification query: Run this to confirm which tables are enabled for Realtime
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
