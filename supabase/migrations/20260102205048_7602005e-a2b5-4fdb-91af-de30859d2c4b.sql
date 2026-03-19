-- Create table for delivered vehicles
CREATE TABLE public.vehiculos_entregados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  delivery_date TEXT NOT NULL,
  delivery_time TEXT NOT NULL,
  km_exit TEXT NOT NULL,
  check_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  photos TEXT[] NOT NULL DEFAULT '{}'::text[],
  receiver_name TEXT NOT NULL,
  receiver_position TEXT NOT NULL,
  receiver_signature TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehiculos_entregados ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read vehiculos_entregados" 
ON public.vehiculos_entregados 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert vehiculos_entregados" 
ON public.vehiculos_entregados 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update vehiculos_entregados" 
ON public.vehiculos_entregados 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete vehiculos_entregados" 
ON public.vehiculos_entregados 
FOR DELETE 
USING (true);