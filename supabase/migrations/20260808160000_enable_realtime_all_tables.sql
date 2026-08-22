-- Safely ensure all 12 public tables are in the supabase_realtime publication
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'events', 'announcements', 'sponsors', 'gallery_items', 
    'donations', 'registrations', 'volunteers', 'festival_memories', 
    'festival_schedules', 'festival_settings', 'notifications', 'user_notification_reads'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN duplicate_object THEN
      -- Table is already in publication, ignore
      NULL;
    END;
  END LOOP;
END $$;
