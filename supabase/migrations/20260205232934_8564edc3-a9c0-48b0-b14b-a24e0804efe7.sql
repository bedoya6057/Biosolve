-- Add column for dealer sheet photo (optional)
ALTER TABLE public.vehiculos 
ADD COLUMN dealer_sheet_photo text DEFAULT NULL;