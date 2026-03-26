-- Migration: Add equipment_observations to vehiculos table
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS equipment_observations TEXT;
