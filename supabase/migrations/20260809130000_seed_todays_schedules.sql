-- Seed Today's Festival Schedule (Aug 9, 2026)
INSERT INTO public.festival_schedules (
  title,
  description,
  schedule_date,
  start_time,
  venue,
  category,
  is_published,
  sort_order
) VALUES
('Ganapathi Sthapana', 'Welcome Lord Ganesha with traditional rituals and prayers.', '2026-08-09', '13:30:00', 'Main Pandal', 'pooja', true, 1),
('Ganapathi Pooja', 'Perform a special pooja and seek Lord Ganesha''s blessings.', '2026-08-09', '14:00:00', 'Main Sanctum', 'pooja', true, 2),
('Sankalpa & Aarti', 'Join devotional prayers and offer aarti to Lord Ganesha.', '2026-08-09', '14:30:00', 'Main Sanctum', 'aarti', true, 3),
('Modaka Offering', 'Offer delicious traditional modakas as a special offering.', '2026-08-09', '15:00:00', 'Main Sanctum', 'prasadam', true, 4),
('Ganapathi Bhajane', 'Enjoy devotional bhajans and songs dedicated to Lord Ganesha.', '2026-08-09', '15:30:00', 'Cultural Stage', 'cultural', true, 5),
('Children''s Program', 'Fun games, activities, and cultural programs for children.', '2026-08-09', '16:00:00', 'Community Hall', 'cultural', true, 6),
('Cultural Program', 'Experience traditional music, dance, and cultural performances.', '2026-08-09', '16:30:00', 'Main Stage', 'cultural', true, 7),
('Annadana Seva', 'Join the community meal service and share food with devotees.', '2026-08-09', '17:30:00', 'Annadana Hall', 'prasadam', true, 8),
('Maha Aarti', 'Participate in the grand evening aarti and seek divine blessings.', '2026-08-09', '18:30:00', 'Main Sanctum', 'aarti', true, 9),
('Prasada Distribution', 'Receive prasada and conclude the day''s celebrations with blessings.', '2026-08-09', '19:30:00', 'Main Pandal', 'prasadam', true, 10)
ON CONFLICT DO NOTHING;
