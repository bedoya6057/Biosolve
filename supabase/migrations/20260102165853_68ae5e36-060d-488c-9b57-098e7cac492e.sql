-- Create proyectos table
CREATE TABLE public.proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID NOT NULL,
  equipment TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create empresas table to store companies
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key from proyectos to empresas
ALTER TABLE public.proyectos
ADD CONSTRAINT fk_proyectos_empresa
FOREIGN KEY (company_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Enable RLS (policies allow public access for now since no auth)
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for proyectos (no auth required for MVP)
CREATE POLICY "Allow public read proyectos"
ON public.proyectos FOR SELECT
USING (true);

CREATE POLICY "Allow public insert proyectos"
ON public.proyectos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update proyectos"
ON public.proyectos FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete proyectos"
ON public.proyectos FOR DELETE
USING (true);

-- Allow public read/write for empresas
CREATE POLICY "Allow public read empresas"
ON public.empresas FOR SELECT
USING (true);

CREATE POLICY "Allow public insert empresas"
ON public.empresas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update empresas"
ON public.empresas FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete empresas"
ON public.empresas FOR DELETE
USING (true);