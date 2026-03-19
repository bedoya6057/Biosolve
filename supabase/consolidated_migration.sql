-- ================================================================
-- CAMIONETA BUDDY - Consolidated Database Schema
-- Run this script in the new Supabase project SQL Editor
-- ================================================================

-- =============================================
-- 1. FUNCTIONS & TYPES
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Roles enum (admin, registrador, tecnico, auditor)
CREATE TYPE public.app_role AS ENUM ('admin', 'registrador', 'tecnico', 'auditor');

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if any users exist (for setup/bootstrap)
CREATE OR REPLACE FUNCTION public.has_any_users()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios LIMIT 1)
$$;

-- =============================================
-- 2. TABLES
-- =============================================

-- Empresas (Companies)
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ruc TEXT,
  contact TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proyectos (Projects)
CREATE TABLE public.proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipment TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehiculos (Vehicles)
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
  delivery_person_name TEXT,
  delivery_person_position TEXT,
  delivery_person_dni TEXT,
  delivery_signature TEXT,
  cochera TEXT,
  observations TEXT,
  dealer_sheet_photo TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instalaciones (Equipment Installations)
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

-- Vehiculos Entregados (Delivered Vehicles)
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

-- Usuarios (User Profiles)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Auditorias (Audits)
CREATE TABLE public.auditorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT true,
  observation TEXT,
  auditor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipamiento (Equipment Catalog)
CREATE TABLE public.equipamiento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 3. INDEXES
-- =============================================

CREATE INDEX idx_auditorias_vehicle_id ON public.auditorias(vehicle_id);

-- =============================================
-- 4. TRIGGERS
-- =============================================

CREATE TRIGGER update_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instalaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos_entregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamiento ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS POLICIES - Business Tables
-- (authenticated can read/insert/update, only admin can delete)
-- =============================================

-- EMPRESAS
CREATE POLICY "Allow authenticated read empresas" ON public.empresas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert empresas" ON public.empresas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update empresas" ON public.empresas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin delete empresas" ON public.empresas FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- PROYECTOS
CREATE POLICY "Allow authenticated read proyectos" ON public.proyectos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert proyectos" ON public.proyectos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update proyectos" ON public.proyectos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin delete proyectos" ON public.proyectos FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- VEHICULOS
CREATE POLICY "Allow authenticated read vehiculos" ON public.vehiculos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert vehiculos" ON public.vehiculos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update vehiculos" ON public.vehiculos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin delete vehiculos" ON public.vehiculos FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- INSTALACIONES
CREATE POLICY "Allow authenticated read instalaciones" ON public.instalaciones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert instalaciones" ON public.instalaciones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update instalaciones" ON public.instalaciones FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin delete instalaciones" ON public.instalaciones FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- VEHICULOS_ENTREGADOS
CREATE POLICY "Allow authenticated read vehiculos_entregados" ON public.vehiculos_entregados FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert vehiculos_entregados" ON public.vehiculos_entregados FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update vehiculos_entregados" ON public.vehiculos_entregados FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin delete vehiculos_entregados" ON public.vehiculos_entregados FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- AUDITORIAS
CREATE POLICY "Allow authenticated read auditorias" ON public.auditorias FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert auditorias" ON public.auditorias FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update auditorias" ON public.auditorias FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin delete auditorias" ON public.auditorias FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- EQUIPAMIENTO
CREATE POLICY "Allow authenticated read equipamiento" ON public.equipamiento FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admin insert equipamiento" ON public.equipamiento FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow admin update equipamiento" ON public.equipamiento FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow admin delete equipamiento" ON public.equipamiento FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 7. RLS POLICIES - Auth Tables
-- =============================================

-- USUARIOS
CREATE POLICY "Users can view own profile" ON public.usuarios FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins or bootstrap can insert usuarios" ON public.usuarios FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR NOT EXISTS (SELECT 1 FROM public.usuarios LIMIT 1));

CREATE POLICY "Admins can update usuarios" ON public.usuarios FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete usuarios" ON public.usuarios FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins or bootstrap can insert roles" ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1));

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 8. GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION public.has_any_users() TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_users() TO authenticated;

-- =============================================
-- 9. EQUIPMENT CATALOG DATA
-- =============================================

INSERT INTO public.equipamiento (name, category) VALUES
('Alarma de Seguridad - con llavero', 'Seguridad'),
('Alarma de Seguridad - integrada', 'Seguridad'),
('Alarma de retroceso', 'Seguridad'),
('Aldaba de seguridad para panel (2 UNIDADES)', 'Seguridad'),
('Base de Extintor de 2kg', 'Extintores'),
('Base de Extintor de 6kg', 'Extintores'),
('Extintor de 2 kg', 'Extintores'),
('Extintor de 6 kg', 'Extintores'),
('Barra antivuelco ext c/malla fija a piso de tolva con accesorios', 'Estructura'),
('Barra antivuelco ext c/malla fija al filo de la tolva con accesorios', 'Estructura'),
('Cámara de retroceso en pantalla Original', 'Electrónico'),
('Cámara de retroceso en espejo', 'Electrónico'),
('Cintas reflectivas 3M - 9 Pzas-MTC - ROJO Y BLANCO', 'Señalización'),
('Cintas reflectivas 3M - ROJO Y BLANCO TODO EL CONTORNO', 'Señalización'),
('Cintas reflectivas 3M - VERDE LIMON TODO EL CONTORNO', 'Señalización'),
('Circulina estroboscópica fija (Incluye Capuchon)', 'Iluminación'),
('Circulina estroboscópica imantada', 'Iluminación'),
('Cajonera herramientas pick up metal', 'Accesorios'),
('Estribos laterales pick up - tubo estructual negro de 2.5 pulgadas', 'Estructura'),
('Faros neblineros LED de 21 Leds ambar', 'Iluminación'),
('Faro Neblinero Hella 1000 ambar', 'Iluminación'),
('Faro pirata LED (UNIDAD)', 'Iluminación'),
('Faro pirata LED (PAR)', 'Iluminación'),
('Funda de asientos (2 asientos-PANEL)', 'Interior'),
('Funda de asientos pick up', 'Interior'),
('Funda de asientos 3 Filas', 'Interior'),
('Forro de pisos (2 asientos-PANEL)', 'Interior'),
('Forro de piso para zona de carga panel', 'Interior'),
('Forro de pisos pick up (Piso bus)', 'Interior'),
('Forro protector de techo para pick up', 'Interior'),
('Jaula antivuelco int. con certificación SCHEDULE 40', 'Estructura'),
('Jaula Skrivens con certificación', 'Estructura'),
('Lámina de seg. transparente (8micras)', 'Láminas'),
('Lámina de seg. Transparente (12 micras)', 'Láminas'),
('Lámina polarizada charcoal 5 - 8 micras', 'Láminas'),
('Lámina polarizada charcoal 20 - 8 micras', 'Láminas'),
('Kit de Prefiltro (pick up, SUV)', 'Accesorios'),
('Parachoque posterior tubular', 'Estructura'),
('Pértiga de 08 pies con banderín-Americana', 'Señalización'),
('Pértiga de 10 pies con banderín-Americana', 'Señalización'),
('Pértiga de 12 pies con banderín-Americana', 'Señalización'),
('Pico y Pala', 'Herramientas'),
('Pisos de Jebe - Auto, Pick up (3 piezas)', 'Interior'),
('Pintado de placas con pesos y medidas 3 pzas para pickup', 'Señalización'),
('Porta escalera furgoneta', 'Accesorios'),
('Porta escalera pick up c/cúpula', 'Accesorios'),
('Porta escalera pick up s/cúpula (TUBO 1.5 X 2MM)', 'Accesorios'),
('Porta llanta anclado en tolva', 'Accesorios'),
('Portafaros tipo U', 'Iluminación'),
('Portafaros tipo L', 'Iluminación'),
('Porta Pico y pala en barra antivuelco', 'Accesorios'),
('Porta Pico y pala en tolva', 'Accesorios'),
('Porta Tacos para Tacos de Madera', 'Accesorios'),
('Porta Tacos para Tacos de Poliuretano', 'Accesorios'),
('Protector de carter y caja metálico', 'Protección'),
('Seguro de direccionales', 'Seguridad'),
('Seguro de llanta de repuesto con cadena y candado', 'Seguridad'),
('Seguro de llanta de repuesto con dado', 'Seguridad'),
('Seguro de Faros delantero y posterior', 'Seguridad'),
('Seguro de emblemas', 'Seguridad'),
('Seguro de espejo', 'Seguridad'),
('Seguro trabatuercas PICK UP - Tipo Corona', 'Seguridad'),
('Seguro trabatuercas PICK UP - Tipo Gota', 'Seguridad'),
('Sensor de retroceso', 'Electrónico'),
('Set de Chapas Yale', 'Seguridad'),
('Tacos de madera con soporte', 'Accesorios'),
('Tacos de poliuretano certificado con soporte', 'Accesorios'),
('Tapasol franja polarizada', 'Interior'),
('Tiro de remolque Pick Up - Bola', 'Accesorios'),
('Tiro de remolque Pick Up - PIN', 'Accesorios'),
('Undercoating (pick up - SIKA)', 'Protección'),
('Undercoating (pick up - ANYPSA)', 'Protección'),
('Medidor de Aire', 'Herramientas'),
('Triángulo de seguridad - Caja Azul - Par', 'Señalización'),
('Triángulo de seguridad - Caja Roja - Unidad', 'Señalización'),
('Conos de Seguridad - 18 pulgadas', 'Señalización'),
('Conos de Seguridad - 28 pulgadas', 'Señalización'),
('Conos de Seguridad - 36 pulgadas', 'Señalización'),
('Cable de Remolque - 3 toneladas', 'Herramientas'),
('Cable de Remolque - 5 toneladas', 'Herramientas'),
('Cable de Remolque - 7 toneladas', 'Herramientas'),
('Cable de Bateria', 'Herramientas'),
('Linterna de mano - con baterias', 'Herramientas'),
('Linterna de mano - recargable', 'Herramientas'),
('Seguro de tuercas - Tipo Gota', 'Seguridad'),
('Seguro de tuercas - Corona', 'Seguridad'),
('Seguro de Rueda', 'Seguridad'),
('Botiquin primeros auxilios MTC - Neceser tela', 'Primeros Auxilios'),
('Botiquin primeros auxilios - a solicitud', 'Primeros Auxilios');
