
-- Drop existing objects in reverse order of creation, if they exist
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.tarifas_distancia_calculadora;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.paradas_reparto;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.repartos;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.envios;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.tipos_servicio;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.tipos_paquete;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.repartidores;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.clientes;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.empresas;

DROP TABLE IF EXISTS public.tarifas_distancia_calculadora CASCADE;
DROP TABLE IF EXISTS public.paradas_reparto CASCADE;
DROP TABLE IF EXISTS public.repartos CASCADE;
DROP TABLE IF EXISTS public.envios CASCADE;
DROP TABLE IF EXISTS public.tipos_servicio CASCADE;
DROP TABLE IF EXISTS public.tipos_paquete CASCADE;
DROP TABLE IF EXISTS public.repartidores CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;

DROP FUNCTION IF EXISTS public.handle_updated_at();

DROP TYPE IF EXISTS public.estado_general_enum;
DROP TYPE IF EXISTS public.estado_envio_enum;
DROP TYPE IF EXISTS public.estado_reparto_enum;
DROP TYPE IF EXISTS public.tipo_servicio_calculadora_enum;

-- Create ENUM types
CREATE TYPE estado_general_enum AS ENUM ('activo', 'inactivo', 'pendiente', 'planificado');
CREATE TYPE estado_envio_enum AS ENUM ('pendiente_asignacion', 'asignado', 'en_camino', 'entregado', 'no_entregado', 'cancelado');
CREATE TYPE estado_reparto_enum AS ENUM ('planificado', 'en_curso', 'completado', 'cancelado');
CREATE TYPE tipo_servicio_calculadora_enum AS ENUM ('express', 'lowcost');


-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Empresas Table
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    telefono TEXT,
    email TEXT,
    notas TEXT,
    estado estado_general_enum DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID -- REFERENCES auth.users(id) ON DELETE SET NULL -- Placeholder for future auth integration
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage empresas" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Clientes Table
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    direccion TEXT NOT NULL,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    telefono TEXT,
    email TEXT,
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    notas TEXT,
    estado estado_general_enum DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID -- REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Repartidores Table
CREATE TABLE repartidores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    estado estado_general_enum DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID -- REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.repartidores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage repartidores" ON public.repartidores FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- TiposPaquete Table
CREATE TABLE tipos_paquete (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID -- REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.tipos_paquete FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.tipos_paquete ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tipos_paquete" ON public.tipos_paquete FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- TiposServicio Table
CREATE TABLE tipos_servicio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    precio_base DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID -- REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.tipos_servicio FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.tipos_servicio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tipos_servicio" ON public.tipos_servicio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Envios Table
CREATE TABLE envios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remitente_cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    nombre_destinatario TEXT,
    telefono_destinatario TEXT,
    cliente_temporal_nombre TEXT, -- ADDED
    cliente_temporal_telefono TEXT, -- ADDED
    direccion_origen TEXT NOT NULL,
    latitud_origen DOUBLE PRECISION,
    longitud_origen DOUBLE PRECISION,
    empresa_origen_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    notas_origen TEXT,
    direccion_destino TEXT NOT NULL,
    latitud_destino DOUBLE PRECISION,
    longitud_destino DOUBLE PRECISION,
    empresa_destino_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    notas_destino TEXT,
    tipo_paquete_id UUID REFERENCES tipos_paquete(id) ON DELETE SET NULL,
    peso_kg DECIMAL(10, 2),
    tipo_servicio_id UUID REFERENCES tipos_servicio(id) ON DELETE SET NULL,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    estado estado_envio_enum DEFAULT 'pendiente_asignacion',
    fecha_estimada_entrega DATE,
    horario_retiro_desde TEXT,
    horario_entrega_hasta TEXT,
    repartidor_asignado_id UUID REFERENCES repartidores(id) ON DELETE SET NULL,
    notas_conductor TEXT,
    detalles_adicionales TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.envios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage envios" ON public.envios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Repartos Table
CREATE TABLE repartos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_reparto DATE NOT NULL,
    repartidor_id UUID NOT NULL REFERENCES repartidores(id) ON DELETE RESTRICT,
    empresa_asociada_id UUID REFERENCES empresas(id) ON DELETE SET NULL, -- For "Reparto por Lote"
    estado estado_reparto_enum DEFAULT 'planificado',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.repartos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage repartos" ON public.repartos FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ParadasReparto Table (Join table for Repartos and Envios)
CREATE TABLE paradas_reparto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reparto_id UUID NOT NULL REFERENCES repartos(id) ON DELETE CASCADE,
    envio_id UUID REFERENCES envios(id) ON DELETE CASCADE, -- Nullable for "retiro en empresa"
    descripcion_parada TEXT, -- For stops not tied to an envio (e.g. "Retiro en Empresa X")
    orden_visita INTEGER,
    estado_parada estado_envio_enum DEFAULT 'asignado', -- Re-uses estado_envio_enum
    hora_estimada_llegada TIME,
    hora_real_llegada TIME,
    notas_parada TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.paradas_reparto FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.paradas_reparto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage paradas_reparto" ON public.paradas_reparto FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_paradas_reparto_reparto_id ON paradas_reparto(reparto_id);
CREATE INDEX idx_paradas_reparto_envio_id ON paradas_reparto(envio_id);


-- TarifasDistanciaCalculadora Table
CREATE TABLE tarifas_distancia_calculadora (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_servicio tipo_servicio_calculadora_enum NOT NULL,
    distancia_min_km DECIMAL(10,2) NOT NULL,
    distancia_max_km DECIMAL(10,2) NOT NULL,
    precio_base DECIMAL(10,2),
    precio_por_km DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id UUID
);
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.tarifas_distancia_calculadora FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.tarifas_distancia_calculadora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tarifas_distancia" ON public.tarifas_distancia_calculadora FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add CHECK constraint to ensure min_km < max_km
ALTER TABLE tarifas_distancia_calculadora ADD CONSTRAINT chk_distancia_min_max CHECK (distancia_min_km < distancia_max_km);

-- Add UNIQUE constraint to prevent overlapping ranges for the same service type (basic version)
-- More complex overlap prevention might require triggers or procedural logic
ALTER TABLE tarifas_distancia_calculadora ADD CONSTRAINT uq_tarifas_servicio_rango UNIQUE (tipo_servicio, distancia_min_km, distancia_max_km);

-- Ensure 'user_id' columns in other tables if they are intended to be linked to auth.users
-- This script assumes 'user_id' is for general auditing or future use and not strictly enforced as FK to auth.users yet.
-- If strict FK to auth.users is needed, uncomment and adapt:
-- ALTER TABLE public.empresas ADD CONSTRAINT fk_empresas_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- (repeat for other tables: clientes, repartidores, tipos_paquete, tipos_servicio, envios, repartos, paradas_reparto, tarifas_distancia_calculadora)
-- Note: RLS policies are already in place assuming authenticated access.
