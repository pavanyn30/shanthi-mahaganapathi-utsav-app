-- Migration: Dynamically enable Supabase Realtime (CDC) & REPLICA IDENTITY FULL for ALL tables in public schema
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Ensure publication 'supabase_realtime' exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 2. Iterate through all public tables, setting REPLICA IDENTITY FULL and adding to publication
  FOR r IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  ) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', r.tablename);
      
      IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = r.tablename
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', r.tablename);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log warning safely if any system view/table is skipped
      RAISE NOTICE 'Skipped realtime configuration for table %: %', r.tablename, SQLERRM;
    END;
  END LOOP;
END $$;
