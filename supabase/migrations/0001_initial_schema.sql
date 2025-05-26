
-- Create ENUM types
CREATE TYPE public.estado_opciones AS ENUM ('activo', 'inactivo');
CREATE TYPE public.estado_repartidor_opciones AS ENUM ('activo', 'inactivo', 'en_descanso');
CREATE TYPE public.estado_envio_opciones AS ENUM ('pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado', 'fallido');
CREATE TYPE public.estado_reparto_opciones AS ENUM ('planificado', 'en_curso', 'completado', 'cancelado');
CREATE TYPE public.estado_parada_opciones AS ENUM ('pendiente', 'visitada_exitosa', 'visitada_fallida');

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion_calle TEXT,
  direccion_ciudad TEXT,
  direccion_codigo_postal TEXT,
  direccion_pais TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  telefono TEXT,
  email TEXT UNIQUE,
  notas TEXT,
  estado estado_opciones DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_empresas
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  direccion_calle TEXT,
  direccion_ciudad TEXT,
  direccion_codigo_postal TEXT,
  direccion_pais TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  telefono TEXT,
  email TEXT UNIQUE,
  notas TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  estado estado_opciones DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_clientes
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on clientes"
ON public.clientes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: repartidores
CREATE TABLE public.repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  estado estado_repartidor_opciones DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_repartidores
BEFORE UPDATE ON public.repartidores
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on repartidores"
ON public.repartidores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: tipos_servicio
CREATE TABLE public.tipos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  precio_base NUMERIC(10, 2) NOT NULL CHECK (precio_base >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_tipos_servicio
BEFORE UPDATE ON public.tipos_servicio
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.tipos_servicio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on tipos_servicio"
ON public.tipos_servicio
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: tipos_paquete
CREATE TABLE public.tipos_paquete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_tipos_paquete
BEFORE UPDATE ON public.tipos_paquete
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.tipos_paquete ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on tipos_paquete"
ON public.tipos_paquete
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: envios
CREATE TABLE public.envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_temporal_nombre TEXT,
  origen_direccion_calle TEXT NOT NULL,
  origen_direccion_ciudad TEXT NOT NULL,
  origen_direccion_codigo_postal TEXT,
  origen_direccion_pais TEXT,
  origen_latitud DOUBLE PRECISION,
  origen_longitud DOUBLE PRECISION,
  destino_direccion_calle TEXT NOT NULL,
  destino_direccion_ciudad TEXT NOT NULL,
  destino_direccion_codigo_postal TEXT,
  destino_direccion_pais TEXT,
  destino_latitud DOUBLE PRECISION,
  destino_longitud DOUBLE PRECISION,
  tipo_paquete_id UUID NOT NULL REFERENCES public.tipos_paquete(id) ON DELETE RESTRICT,
  peso_kg NUMERIC(6, 2) CHECK (peso_kg > 0),
  tipo_servicio_id UUID NOT NULL REFERENCES public.tipos_servicio(id) ON DELETE RESTRICT,
  precio_calculado NUMERIC(10, 2) NOT NULL CHECK (precio_calculado >= 0),
  estado_envio estado_envio_opciones DEFAULT 'pendiente',
  notas_envio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_cliente_o_temporal CHECK ( (cliente_id IS NOT NULL AND cliente_temporal_nombre IS NULL) OR (cliente_id IS NULL) )
);
CREATE TRIGGER set_timestamp_envios
BEFORE UPDATE ON public.envios
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on envios"
ON public.envios
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: repartos
CREATE TABLE public.repartos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id UUID NOT NULL REFERENCES public.repartidores(id) ON DELETE RESTRICT,
  fecha_reparto DATE NOT NULL,
  estado_reparto estado_reparto_opciones DEFAULT 'planificado',
  notas_reparto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_repartos
BEFORE UPDATE ON public.repartos
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on repartos"
ON public.repartos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: paradas_reparto
CREATE TABLE public.paradas_reparto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reparto_id UUID NOT NULL REFERENCES public.repartos(id) ON DELETE CASCADE,
  envio_id UUID NOT NULL REFERENCES public.envios(id) ON DELETE CASCADE,
  orden_parada INTEGER NOT NULL CHECK (orden_parada > 0),
  estado_parada estado_parada_opciones DEFAULT 'pendiente',
  hora_estimada_llegada TIME WITH TIME ZONE,
  hora_real_llegada TIME WITH TIME ZONE,
  notas_parada TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (reparto_id, envio_id),
  UNIQUE (reparto_id, orden_parada)
);
CREATE TRIGGER set_timestamp_paradas_reparto
BEFORE UPDATE ON public.paradas_reparto
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.paradas_reparto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on paradas_reparto"
ON public.paradas_reparto
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table: tarifas_distancia_calculadora
CREATE TABLE public.tarifas_distancia_calculadora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_servicio_id UUID NOT NULL REFERENCES public.tipos_servicio(id) ON DELETE CASCADE,
  costo_por_km NUMERIC(8, 2) NOT NULL CHECK (costo_por_km >= 0),
  distancia_min_km NUMERIC(6, 2) DEFAULT 0 CHECK (distancia_min_km >=0),
  distancia_max_km NUMERIC(6, 2),
  valido_desde DATE DEFAULT CURRENT_DATE,
  valido_hasta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tipo_servicio_id, distancia_min_km, valido_desde),
  CONSTRAINT chk_distancia_max CHECK (distancia_max_km IS NULL OR distancia_max_km > distancia_min_km),
  CONSTRAINT chk_valido_hasta CHECK (valido_hasta IS NULL OR valido_hasta >= valido_desde)
);
CREATE TRIGGER set_timestamp_tarifas_distancia
BEFORE UPDATE ON public.tarifas_distancia_calculadora
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
ALTER TABLE public.tarifas_distancia_calculadora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can perform all operations on tarifas_distancia_calculadora"
ON public.tarifas_distancia_calculadora
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed initial data for some tables (optional, but helpful)
INSERT INTO public.tipos_servicio (nombre, descripcion, precio_base) VALUES
('Express', 'Entrega rápida en menos de X horas.', 150.00),
('LowCost', 'Entrega económica en 24-48 horas.', 80.00),
('Programado', 'Entrega en fecha y hora específica.', 120.00);

INSERT INTO public.tipos_paquete (nombre, descripcion) VALUES
('Sobre', 'Documentos o items pequeños en sobre.'),
('Paquete Pequeño', 'Caja pequeña, hasta 2kg.'),
('Paquete Mediano', 'Caja mediana, hasta 5kg.'),
('Paquete Grande', 'Caja grande, hasta 10kg.');
