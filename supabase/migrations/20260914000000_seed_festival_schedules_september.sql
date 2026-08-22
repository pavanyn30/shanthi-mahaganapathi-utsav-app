-- Migration: Seed 14/09/2026, 15/09/2026, and 16/09/2026 Festival Schedules

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.festival_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    venue TEXT,
    category TEXT DEFAULT 'pooja',
    is_published BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert schedule records for 14, 15, 16 September 2026
INSERT INTO public.festival_schedules (title, description, schedule_date, start_time, end_time, venue, category, is_published, sort_order)
VALUES
-- 14 Sep 2026
('Prana Pratishtha & Maha Sankalpa', 'Grand invocation of Lord Ganesha with sacred Vedic chants and 108 Kalasha Abhishekam.', '2026-09-14', '06:30:00', '08:00:00', 'Main Sanctum', 'pooja', true, 1),
('Prathama Ganapathi Homam', 'Sacred fire ritual offering 1,008 Modakas and herbal ahuti to Lord Vigneshwara.', '2026-09-14', '08:30:00', '10:30:00', 'Yajnashala', 'pooja', true, 2),
('Day 1 Mahaprasada & Annadana', 'Devotional community meal served to thousands of visiting devotees.', '2026-09-14', '12:30:00', '15:00:00', 'Annadana Hall', 'prasadam', true, 3),
('Dhol Tasha Pathak Performance', 'High-energy traditional drum troupe performance welcoming mandal devotees.', '2026-09-14', '17:00:00', '19:00:00', 'Pandal Ground', 'cultural', true, 4),
('Grand Evening 108 Lamp Maha Aarti', 'Grand evening illumination and devotional bhajans led by Sri Ganapathi Mandal choir.', '2026-09-14', '19:30:00', '21:00:00', 'Main Pandal', 'aarti', true, 5),

-- 15 Sep 2026
('Morning Panchamrutha Abhishekam', 'Holy abhishekam with milk, honey, curd, and sugarcane juice followed by Sahasranama Archana.', '2026-09-15', '07:00:00', '08:30:00', 'Main Sanctum', 'pooja', true, 1),
('Children''s Eco-Ganesha Clay Workshop', 'Eco-friendly clay modeling competition and Rangoli festival for kids & youth.', '2026-09-15', '10:00:00', '12:30:00', 'Cultural Stage', 'event', true, 2),
('Day 2 Mahaprasadam Distribution', 'Sacred prasadam meals served to all visiting devotees.', '2026-09-15', '12:30:00', '14:30:00', 'Annadana Hall', 'prasadam', true, 3),
('Carnatic & Devotional Music Night', 'Live vocal and instrumental performance by renowned classical artists.', '2026-09-15', '18:00:00', '19:30:00', 'Main Stage', 'cultural', true, 4),
('Deepotsava & Night Aarti', 'Lighting 1,008 traditional brass lamps accompanied by devotional singing.', '2026-09-15', '19:30:00', '21:00:00', 'Main Sanctum', 'aarti', true, 5),

-- 16 Sep 2026
('Uttarapooja & Maha Mangalarathi', 'Special farewell pooja and final morning blessings.', '2026-09-16', '07:30:00', '09:00:00', 'Main Sanctum', 'pooja', true, 1),
('Grand Shobhayatra Procession', 'Royal procession through city streets with flower chariot, folk dances & Dhol Tasha.', '2026-09-16', '10:30:00', '13:30:00', 'Festival Pandal to Lake', 'event', true, 2),
('Visarjan Prasadam Distribution', 'Special sweets and snacks served along the procession route.', '2026-09-16', '13:30:00', '15:30:00', 'Procession Route', 'prasadam', true, 3),
('Eco-Friendly Idol Visarjan Ritual', 'Sacred immersion ceremony at lakefront with floral tributes and Ganapathi Bappa Morya chants.', '2026-09-16', '17:00:00', '19:30:00', 'Holy Lake Front', 'aarti', true, 4)
ON CONFLICT DO NOTHING;
