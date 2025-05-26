
-- Drop existing objects to ensure idempotency
DROP TABLE IF EXISTS public.paradas_reparto CASCADE;
DROP TABLE IF EXISTS public.repartos CASCADE;
DROP TABLE IF EXISTS public.envios CASCADE;
DROP TABLE IF EXISTS public.tipos_servicio CASCADE;
DROP TABLE IF EXISTS public.tipos_paquete CASCADE;
DROP TABLE IF EXISTS public.repartidores CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.tarifas_distancia_calculadora CASCADE;

DROP TYPE IF EXISTS public.estado_general_enum CASCADE;
DROP TYPE IF EXISTS public.estado_envio_enum CASCADE;
DROP TYPE IF EXISTS public.tipo_servicio_calculadora_enum CASCADE;

DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE;


-- Create ENUM types
CREATE TYPE public.estado_general_enum AS ENUM (
  'activo',
  'inactivo',
  'pendiente'
);

CREATE TYPE public.estado_envio_enum AS ENUM (
  'pendiente_asignacion',
  'asignado',
  'en_camino',
  'entregado',
  'no_entregado',
  'cancelado'
);

CREATE TYPE public.tipo_servicio_calculadora_enum AS ENUM (
    'express',
    'lowcost'
);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Table: empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) >= 2),
  direccion TEXT NOT NULL CHECK (char_length(direccion) >= 5),
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  telefono TEXT,
  email TEXT CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  notas TEXT,
  estado estado_general_enum DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID -- For RLS, assuming users table exists or will be managed by Supabase Auth
);
CREATE TRIGGER on_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage empresas" ON public.empresas
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) >= 2),
  apellido TEXT NOT NULL CHECK (char_length(apellido) >= 2),
  direccion TEXT NOT NULL CHECK (char_length(direccion) >= 5),
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  telefono TEXT,
  email TEXT CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  notas TEXT,
  estado estado_general_enum DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);
CREATE TRIGGER on_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage clientes" ON public.clientes
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: repartidores
CREATE TABLE public.repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) >= 3),
  estado estado_general_enum DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);
CREATE TRIGGER on_repartidores_updated_at
  BEFORE UPDATE ON public.repartidores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage repartidores" ON public.repartidores
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: tipos_paquete
CREATE TABLE public.tipos_paquete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) >= 3),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);
CREATE TRIGGER on_tipos_paquete_updated_at
  BEFORE UPDATE ON public.tipos_paquete
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.tipos_paquete ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tipos_paquete" ON public.tipos_paquete
  FOR ALL USING (auth.role() = 'authenticated');

-- Table: tipos_servicio
CREATE TABLE public.tipos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) >= 3),
  descripcion TEXT,
  precio_base NUMERIC(10, 2) CHECK (precio_base >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);
CREATE TRIGGER on_tipos_servicio_updated_at
  BEFORE UPDATE ON public.tipos_servicio
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.tipos_servicio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tipos_servicio" ON public.tipos_servicio
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: envios
CREATE TABLE public.envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remitente_cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL, -- Renamed from cliente_id
  -- Fields for "DosRuedas" form type (recipient is not an existing client)
  nombre_destinatario TEXT,
  telefono_destinatario TEXT,
  -- Fields for "DosRuedas" form type (time windows)
  horario_retiro_desde TEXT, -- Store as TEXT e.g., "09:00" or "14:30"
  horario_entrega_hasta TEXT, -- Store as TEXT
  -- General details for both form types
  direccion_origen TEXT NOT NULL,
  latitud_origen DOUBLE PRECISION,
  longitud_origen DOUBLE PRECISION,
  empresa_origen_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  direccion_destino TEXT NOT NULL,
  latitud_destino DOUBLE PRECISION,
  longitud_destino DOUBLE PRECISION,
  empresa_destino_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  tipo_paquete_id UUID REFERENCES public.tipos_paquete(id),
  peso_kg NUMERIC(7,2) CHECK (peso_kg > 0),
  tipo_servicio_id UUID REFERENCES public.tipos_servicio(id),
  precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
  estado estado_envio_enum DEFAULT 'pendiente_asignacion',
  fecha_estimada_entrega DATE,
  repartidor_asignado_id UUID REFERENCES public.repartidores(id) ON DELETE SET NULL,
  -- Note fields, distinguishing general from specific
  detalles_adicionales TEXT, -- For "DosRuedas" general notes
  notas_origen TEXT, -- For internal form
  notas_destino TEXT, -- For internal form
  notas_conductor TEXT, -- For internal form, general notes to driver
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);
CREATE TRIGGER on_envios_updated_at
  BEFORE UPDATE ON public.envios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage envios" ON public.envios
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: repartos
CREATE TABLE public.repartos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_reparto DATE NOT NULL,
  repartidor_id UUID NOT NULL REFERENCES public.repartidores(id) ON DELETE RESTRICT,
  empresa_asociada_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL, -- For filtering repartos by company
  estado estado_general_enum DEFAULT 'pendiente', -- e.g. planificado, en_curso, completado
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);
CREATE TRIGGER on_repartos_updated_at
  BEFORE UPDATE ON public.repartos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage repartos" ON public.repartos
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: paradas_reparto (Junction table for envios in a reparto)
CREATE TABLE public.paradas_reparto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reparto_id UUID NOT NULL REFERENCES public.repartos(id) ON DELETE CASCADE,
  envio_id UUID NOT NULL REFERENCES public.envios(id) ON DELETE CASCADE,
  orden_visita INTEGER CHECK (orden_visita > 0),
  estado_parada estado_envio_enum DEFAULT 'asignado', -- Status of this specific stop
  hora_estimada_llegada TIME,
  hora_real_llegada TIME,
  notas_parada TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID,
  UNIQUE (reparto_id, envio_id) -- An envio can only be in a reparto once
);
CREATE TRIGGER on_paradas_reparto_updated_at
  BEFORE UPDATE ON public.paradas_reparto
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.paradas_reparto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage paradas_reparto" ON public.paradas_reparto
  FOR ALL USING (auth.role() = 'authenticated');


-- Table: tarifas_distancia_calculadora
CREATE TABLE public.tarifas_distancia_calculadora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_servicio tipo_servicio_calculadora_enum NOT NULL,
    distancia_min_km NUMERIC(7,2) NOT NULL CHECK (distancia_min_km >= 0),
    distancia_max_km NUMERIC(7,2) NOT NULL CHECK (distancia_max_km > distancia_min_km),
    precio_por_km NUMERIC(10,2) NOT NULL CHECK (precio_por_km >= 0),
    precio_base NUMERIC(10,2) CHECK (precio_base >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID,
    UNIQUE (tipo_servicio, distancia_min_km, distancia_max_km) -- Ensure ranges don't overlap ambiguously for same service type
);
CREATE TRIGGER on_tarifas_distancia_updated_at
  BEFORE UPDATE ON public.tarifas_distancia_calculadora
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.tarifas_distancia_calculadora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tarifas_distancia" ON public.tarifas_distancia_calculadora
  FOR ALL USING (auth.role() = 'authenticated');
