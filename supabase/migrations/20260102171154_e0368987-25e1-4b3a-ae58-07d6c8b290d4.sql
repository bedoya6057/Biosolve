-- Create vehiculos table
CREATE TABLE public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  vin TEXT NOT NULL,
  plate TEXT,
  color TEXT NOT NULL,
  model TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  delivery_time TEXT NOT NULL,
  km_entry TEXT NOT NULL,
  check_items JSONB NOT NULL DEFAULT '[]',
  photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for vehiculos
CREATE POLICY "Allow public read vehiculos"
ON public.vehiculos FOR SELECT
USING (true);

CREATE POLICY "Allow public insert vehiculos"
ON public.vehiculos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update vehiculos"
ON public.vehiculos FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete vehiculos"
ON public.vehiculos FOR DELETE
USING (true);

-- Create instalaciones table for equipment tracking
CREATE TABLE public.instalaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  installed BOOLEAN NOT NULL DEFAULT false,
  installed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, equipment_id)
);

-- Enable RLS
ALTER TABLE public.instalaciones ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for instalaciones
CREATE POLICY "Allow public read instalaciones"
ON public.instalaciones FOR SELECT
USING (true);

CREATE POLICY "Allow public insert instalaciones"
ON public.instalaciones FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update instalaciones"
ON public.instalaciones FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete instalaciones"
ON public.instalaciones FOR DELETE
USING (true);