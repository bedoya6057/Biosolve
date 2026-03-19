-- Create auditoría table for vehicle equipment audits
CREATE TABLE public.auditorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT true,
  observation TEXT,
  auditor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auditorias ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow public read auditorias" ON public.auditorias FOR SELECT USING (true);
CREATE POLICY "Allow public insert auditorias" ON public.auditorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update auditorias" ON public.auditorias FOR UPDATE USING (true);
CREATE POLICY "Allow public delete auditorias" ON public.auditorias FOR DELETE USING (true);

-- Create index for faster queries
CREATE INDEX idx_auditorias_vehicle_id ON public.auditorias(vehicle_id);