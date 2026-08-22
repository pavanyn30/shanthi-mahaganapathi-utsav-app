-- FESTIVAL SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.festival_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  schedule_date date NOT NULL,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time,
  venue text NOT NULL DEFAULT 'Main Pandal',
  category text NOT NULL DEFAULT 'aarti',
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.festival_schedules TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_schedules TO authenticated;
GRANT ALL ON public.festival_schedules TO service_role;

ALTER TABLE public.festival_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'festival_schedules' AND policyname = 'festival_schedules_public_read'
  ) THEN
    CREATE POLICY "festival_schedules_public_read" ON public.festival_schedules FOR SELECT TO anon, authenticated USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'festival_schedules' AND policyname = 'festival_schedules_staff_all'
  ) THEN
    CREATE POLICY "festival_schedules_staff_all" ON public.festival_schedules FOR ALL TO authenticated
      USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_festival_schedules_updated'
  ) THEN
    CREATE TRIGGER trg_festival_schedules_updated BEFORE UPDATE ON public.festival_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

-- Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.festival_schedules;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Seed default schedule items if empty
INSERT INTO public.festival_schedules (title, description, schedule_date, start_time, end_time, venue, category, is_published, sort_order)
VALUES
('Morning Maha Aarti & Sankalpa', 'Daily sacred morning ritual with Vedic chanting and stotram.', '2026-09-14', '07:30', '08:30', 'Main Sanctum', 'aarti', true, 1),
('Annadana Mahaprasadam Distribution', 'Grand community lunch serving hot prasadam to thousands of devotees.', '2026-09-14', '12:30', '15:00', 'Annadana Hall', 'prasadam', true, 2),
('Traditional Dhol Tasha Troupe Performance', 'High-energy drum Troupe salute by Shivmudra Dhol Tasha Pathak.', '2026-09-14', '17:30', '19:00', 'Mandal Entrance', 'cultural', true, 3),
('Evening Deepalankara & Grand Aarti', '1008 Lamps lighting ritual followed by devotional bhajan evening.', '2026-09-14', '19:30', '21:00', 'Main Sanctum', 'aarti', true, 4),
('Grand Visarjan Miravand (Final Procession)', 'Magnificent farewell procession with flowers, gulal and traditional beats.', '2026-09-24', '16:00', '22:00', 'Festival Route', 'visarjan', true, 5)
ON CONFLICT DO NOTHING;
