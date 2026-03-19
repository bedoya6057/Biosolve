-- Add DNI column for delivery person
ALTER TABLE public.vehiculos ADD COLUMN IF NOT EXISTS delivery_person_dni text;