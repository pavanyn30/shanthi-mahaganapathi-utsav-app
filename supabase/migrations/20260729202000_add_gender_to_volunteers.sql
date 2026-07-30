-- Add gender column to volunteers table
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Male';
