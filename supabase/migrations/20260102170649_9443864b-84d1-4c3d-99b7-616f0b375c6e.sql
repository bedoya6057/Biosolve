-- Add RUC column to empresas table
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS ruc TEXT;