-- Add delivery person columns to vehiculos table
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS delivery_person_name text,
ADD COLUMN IF NOT EXISTS delivery_person_position text,
ADD COLUMN IF NOT EXISTS delivery_signature text;