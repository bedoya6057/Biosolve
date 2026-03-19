-- Crear tabla de equipamiento
CREATE TABLE public.equipamiento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipamiento ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para todos los usuarios autenticados
CREATE POLICY "Allow authenticated read equipamiento" 
ON public.equipamiento 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin insert equipamiento" 
ON public.equipamiento 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow admin update equipamiento" 
ON public.equipamiento 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow admin delete equipamiento" 
ON public.equipamiento 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insertar equipamiento inicial desde el catálogo existente
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