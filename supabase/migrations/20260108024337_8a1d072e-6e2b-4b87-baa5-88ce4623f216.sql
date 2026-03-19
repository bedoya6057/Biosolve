-- Add general observations column for vehicle registration
ALTER TABLE public.vehiculos ADD COLUMN IF NOT EXISTS observations text;