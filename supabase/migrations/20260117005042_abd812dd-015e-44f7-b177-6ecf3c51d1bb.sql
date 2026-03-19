-- =================================================
-- Fix RLS Policies for Business Tables
-- =================================================
-- All business tables currently allow public access via USING (true).
-- This migration restricts access to authenticated users only,
-- with delete operations reserved for admin role.
-- Pattern follows the equipamiento table (correctly implemented).
-- =================================================

-- =============================================
-- 1. EMPRESAS TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow public read empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow public insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow public update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow public delete empresas" ON public.empresas;

CREATE POLICY "Allow authenticated read empresas" 
ON public.empresas FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert empresas" 
ON public.empresas FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update empresas" 
ON public.empresas FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin delete empresas" 
ON public.empresas FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. PROYECTOS TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow public read proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Allow public insert proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Allow public update proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Allow public delete proyectos" ON public.proyectos;

CREATE POLICY "Allow authenticated read proyectos" 
ON public.proyectos FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert proyectos" 
ON public.proyectos FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update proyectos" 
ON public.proyectos FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin delete proyectos" 
ON public.proyectos FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. VEHICULOS TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow public read vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow public insert vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow public update vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow public delete vehiculos" ON public.vehiculos;

CREATE POLICY "Allow authenticated read vehiculos" 
ON public.vehiculos FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert vehiculos" 
ON public.vehiculos FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update vehiculos" 
ON public.vehiculos FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin delete vehiculos" 
ON public.vehiculos FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. INSTALACIONES TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow public read instalaciones" ON public.instalaciones;
DROP POLICY IF EXISTS "Allow public insert instalaciones" ON public.instalaciones;
DROP POLICY IF EXISTS "Allow public update instalaciones" ON public.instalaciones;
DROP POLICY IF EXISTS "Allow public delete instalaciones" ON public.instalaciones;

CREATE POLICY "Allow authenticated read instalaciones" 
ON public.instalaciones FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert instalaciones" 
ON public.instalaciones FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update instalaciones" 
ON public.instalaciones FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin delete instalaciones" 
ON public.instalaciones FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 5. AUDITORIAS TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow public read auditorias" ON public.auditorias;
DROP POLICY IF EXISTS "Allow public insert auditorias" ON public.auditorias;
DROP POLICY IF EXISTS "Allow public update auditorias" ON public.auditorias;
DROP POLICY IF EXISTS "Allow public delete auditorias" ON public.auditorias;

CREATE POLICY "Allow authenticated read auditorias" 
ON public.auditorias FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert auditorias" 
ON public.auditorias FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update auditorias" 
ON public.auditorias FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin delete auditorias" 
ON public.auditorias FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 6. VEHICULOS_ENTREGADOS TABLE
-- =============================================
DROP POLICY IF EXISTS "Allow public read vehiculos_entregados" ON public.vehiculos_entregados;
DROP POLICY IF EXISTS "Allow public insert vehiculos_entregados" ON public.vehiculos_entregados;
DROP POLICY IF EXISTS "Allow public update vehiculos_entregados" ON public.vehiculos_entregados;
DROP POLICY IF EXISTS "Allow public delete vehiculos_entregados" ON public.vehiculos_entregados;

CREATE POLICY "Allow authenticated read vehiculos_entregados" 
ON public.vehiculos_entregados FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert vehiculos_entregados" 
ON public.vehiculos_entregados FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update vehiculos_entregados" 
ON public.vehiculos_entregados FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin delete vehiculos_entregados" 
ON public.vehiculos_entregados FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));