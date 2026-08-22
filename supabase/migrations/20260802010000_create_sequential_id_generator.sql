-- ==============================================================================
-- Migration: Atomic Sequential ID Counter Table & Function
-- Enables automatic formatted IDs (DON-000001, REG-000001, VOL-000001, EVT-000001, etc.)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sequential_counters (
  prefix VARCHAR(20) PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sequential_counters ENABLE ROW LEVEL SECURITY;

-- Allow read/write access to counters
CREATE POLICY "Allow public counter access" ON public.sequential_counters
  FOR ALL USING (true) WITH CHECK (true);

-- Atomic SQL function to generate and return next formatted ID
CREATE OR REPLACE FUNCTION public.get_next_sequential_id(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_val BIGINT;
  v_result TEXT;
BEGIN
  INSERT INTO public.sequential_counters (prefix, last_value, updated_at)
  VALUES (UPPER(p_prefix), 1, NOW())
  ON CONFLICT (prefix)
  DO UPDATE SET
    last_value = public.sequential_counters.last_value + 1,
    updated_at = NOW()
  RETURNING last_value INTO v_next_val;

  v_result := UPPER(p_prefix) || '-' || LPAD(v_next_val::TEXT, 6, '0');
  RETURN v_result;
END;
$$;

-- Grant execution to all users
GRANT EXECUTE ON FUNCTION public.get_next_sequential_id(TEXT) TO anon, authenticated, service_role;
