
-- Drop existing objects in reverse order of creation or with CASCADE for dependencies

-- Drop triggers first if they exist (not strictly necessary with DROP TABLE ... CASCADE but good for clarity)
-- Example: ALTER TABLE public.paradas_reparto DROP TRIGGER IF EXISTS on_updated_at ON public.paradas_reparto; (repeat for all tables)
-- However, the trigger function itself being dropped will handle this.

-- Drop tables
DROP TABLE IF EXISTS public.paradas_reparto CASCADE;
DROP TABLE IF EXISTS public.envios CASCADE;
DROP TABLE IF EXISTS public.repartos CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.repartidores CASCADE;
DROP TABLE IF EXISTS public.tipos_servicio CASCADE;
DROP TABLE IF EXISTS public.tipos_paquete CASCADE;
DROP TABLE IF EXISTS public.tarifas_distancia_calculadora CASCADE;

-- Drop enums
DROP TYPE IF EXISTS public.estado_general_enum;
DROP TYPE IF EXISTS public.tipo_servicio_calculadora_enum;
DROP TYPE IF EXISTS public.estado_envio_enum;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Create custom ENUM types
CREATE TYPE public.estado_general_enum AS ENUM ('activo', 'inactivo', 'pendiente');
CREATE TYPE public.tipo_servicio_calculadora_enum AS ENUM ('express', 'lowcost');
CREATE TYPE public.estado_envio_enum AS ENUM (
  'pendiente_asignacion', 
  'asignado', 
  'en_camino', 
  'entregado', 
  'no_entregado', 
  'cancelado'
);

-- Function to update 'updated_at' timestamp
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
  nombre TEXT NOT NULL,
  direccion TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  telefono TEXT,
  email TEXT UNIQUE,
  notas TEXT,
  estado public.estado_general_enum DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
COMMENT ON COLUMN public.empresas.nombre IS 'Nombre de la empresa';
COMMENT ON COLUMN public.empresas.direccion IS 'Dirección física de la empresa';
COMMENT ON COLUMN public.empresas.latitud IS 'Latitud geocodificada';
COMMENT ON COLUMN public.empresas.longitud IS 'Longitud geocodificada';
COMMENT ON COLUMN public.empresas.estado IS 'Estado de la empresa (activo/inactivo)';

CREATE TRIGGER on_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT,
  direccion TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  telefono TEXT,
  email TEXT UNIQUE,
  notas TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  estado public.estado_general_enum DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
COMMENT ON COLUMN public.clientes.empresa_id IS 'Empresa asociada al cliente (opcional)';

CREATE TRIGGER on_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: repartidores
CREATE TABLE public.repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  estado public.estado_general_enum DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
COMMENT ON COLUMN public.repartidores.nombre IS 'Nombre del repartidor';

CREATE TRIGGER on_repartidores_updated_at
BEFORE UPDATE ON public.repartidores
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: tipos_servicio
CREATE TABLE public.tipos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  precio_base NUMERIC(10, 2) DEFAULT 0.00,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
COMMENT ON COLUMN public.tipos_servicio.precio_base IS 'Precio base para este tipo de servicio';

CREATE TRIGGER on_tipos_servicio_updated_at
BEFORE UPDATE ON public.tipos_servicio
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: tipos_paquete
CREATE TABLE public.tipos_paquete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE TRIGGER on_tipos_paquete_updated_at
BEFORE UPDATE ON public.tipos_paquete
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: envios
CREATE TABLE public.envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_temporal_nombre TEXT, -- Para envíos sin cliente registrado
  cliente_temporal_telefono TEXT,
  direccion_origen TEXT NOT NULL,
  latitud_origen DOUBLE PRECISION,
  longitud_origen DOUBLE PRECISION,
  direccion_destino TEXT NOT NULL,
  latitud_destino DOUBLE PRECISION,
  longitud_destino DOUBLE PRECISION,
  empresa_origen_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  empresa_destino_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  tipo_paquete_id UUID REFERENCES public.tipos_paquete(id),
  peso_kg NUMERIC(6, 2),
  tipo_servicio_id UUID REFERENCES public.tipos_servicio(id),
  precio NUMERIC(10, 2) NOT NULL,
  notas_conductor TEXT,
  estado public.estado_envio_enum DEFAULT 'pendiente_asignacion',
  fecha_estimada_entrega DATE,
  repartidor_asignado_id UUID REFERENCES public.repartidores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  CONSTRAINT chk_cliente_o_temporal CHECK (
    (cliente_id IS NOT NULL AND cliente_temporal_nombre IS NULL AND cliente_temporal_telefono IS NULL) OR
    (cliente_id IS NULL AND cliente_temporal_nombre IS NOT NULL)
  )
);
COMMENT ON COLUMN public.envios.precio IS 'Precio final del envío';
COMMENT ON COLUMN public.envios.repartidor_asignado_id IS 'Repartidor al que se asignó este envío directamente (si no es parte de un reparto formal)';

CREATE TRIGGER on_envios_updated_at
BEFORE UPDATE ON public.envios
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: repartos (hojas de ruta)
CREATE TABLE public.repartos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id UUID NOT NULL REFERENCES public.repartidores(id),
  fecha_reparto DATE NOT NULL DEFAULT CURRENT_DATE,
  empresa_asociada_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL, -- Para repartos de una empresa específica
  estado public.estado_general_enum DEFAULT 'pendiente', -- pendiente, en_curso, completado, cancelado
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);
COMMENT ON COLUMN public.repartos.estado IS 'Estado general de la hoja de ruta';

CREATE TRIGGER on_repartos_updated_at
BEFORE UPDATE ON public.repartos
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: paradas_reparto (junction table for envios and repartos)
CREATE TABLE public.paradas_reparto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reparto_id UUID NOT NULL REFERENCES public.repartos(id) ON DELETE CASCADE,
  envio_id UUID NOT NULL REFERENCES public.envios(id) ON DELETE CASCADE,
  orden_visita INTEGER, -- Orden en que se deben visitar las paradas
  hora_estimada_llegada TIME,
  hora_real_llegada TIME,
  estado_parada public.estado_envio_enum DEFAULT 'asignado', -- Puede reflejar el estado del envío en esta parada
  notas_parada TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  UNIQUE (reparto_id, envio_id),
  UNIQUE (reparto_id, orden_visita) -- Un envío no puede tener dos órdenes en el mismo reparto
);
COMMENT ON COLUMN public.paradas_reparto.orden_visita IS 'Define el orden de las paradas dentro de la hoja de ruta';

CREATE TRIGGER on_paradas_reparto_updated_at
BEFORE UPDATE ON public.paradas_reparto
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: tarifas_distancia_calculadora
CREATE TABLE public.tarifas_distancia_calculadora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_servicio public.tipo_servicio_calculadora_enum NOT NULL,
  distancia_min_km NUMERIC(6,2) NOT NULL,
  distancia_max_km NUMERIC(6,2) NOT NULL,
  precio_por_km NUMERIC(10,2) NOT NULL,
  precio_base NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  CONSTRAINT chk_distancia_range CHECK (distancia_min_km < distancia_max_km),
  UNIQUE (tipo_servicio, distancia_min_km, distancia_max_km) -- Evita solapamientos exactos
);
COMMENT ON TABLE public.tarifas_distancia_calculadora IS 'Tarifas para el cotizador de envíos por distancia';

CREATE TRIGGER on_tarifas_distancia_calculadora_updated_at
BEFORE UPDATE ON public.tarifas_distancia_calculadora
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS for all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_paquete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paradas_reparto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas_distancia_calculadora ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic: allow all for authenticated users, refine later)
CREATE POLICY "Allow all for authenticated users on empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on clientes"
ON public.clientes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on repartidores"
ON public.repartidores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on tipos_servicio"
ON public.tipos_servicio
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on tipos_paquete"
ON public.tipos_paquete
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on envios"
ON public.envios
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on repartos"
ON public.repartos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on paradas_reparto"
ON public.paradas_reparto
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on tarifas_distancia_calculadora"
ON public.tarifas_distancia_calculadora
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
