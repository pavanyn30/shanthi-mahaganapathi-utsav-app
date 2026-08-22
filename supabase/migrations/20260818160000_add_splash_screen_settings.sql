-- Migration: Add Splash Screen customizable settings to festival_settings
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS splash_screen_url text;
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS splash_screen_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS splash_screen_duration integer NOT NULL DEFAULT 3000;
ALTER TABLE public.festival_settings ADD COLUMN IF NOT EXISTS splash_screen_redirect_url text DEFAULT 'https://pyn-technologies.web.app/';
