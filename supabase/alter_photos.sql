-- Alter vehiculos table
ALTER TABLE public.vehiculos 
DROP COLUMN IF EXISTS photos;

ALTER TABLE public.vehiculos 
ADD COLUMN foto_1 text,
ADD COLUMN foto_2 text,
ADD COLUMN foto_3 text,
ADD COLUMN foto_4 text;

-- Alter entregas table
ALTER TABLE public.entregas 
DROP COLUMN IF EXISTS photos;

ALTER TABLE public.entregas 
ADD COLUMN foto_1 text,
ADD COLUMN foto_2 text,
ADD COLUMN foto_3 text,
ADD COLUMN foto_4 text;
