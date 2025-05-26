
-- Clear existing data in reverse order of dependencies (or use TRUNCATE ... CASCADE if preferred and safe for your setup)
DELETE FROM public.paradas_reparto;
DELETE FROM public.envios;
DELETE FROM public.repartos;
DELETE FROM public.clientes;
DELETE FROM public.empresas;
DELETE FROM public.repartidores;
DELETE FROM public.tipos_paquete;
DELETE FROM public.tipos_servicio;
DELETE FROM public.tarifas_distancia_calculadora;

-- Pre-defined UUIDs for easier referencing
DO $$
DECLARE
    empresa_id_1 UUID := 'a1b2c3d4-e5f6-7777-8888-999999990001';
    empresa_id_2 UUID := 'a1b2c3d4-e5f6-7777-8888-999999990002';

    cliente_id_1 UUID := 'b1c2d3e4-f5a6-1111-2222-333333330001'; -- Belongs to empresa_id_1
    cliente_id_2 UUID := 'b1c2d3e4-f5a6-1111-2222-333333330002'; -- No empresa
    cliente_id_3 UUID := 'b1c2d3e4-f5a6-1111-2222-333333330003'; -- Belongs to empresa_id_2

    repartidor_id_1 UUID := 'c1d2e3f4-a5b6-2222-3333-444444440001';
    repartidor_id_2 UUID := 'c1d2e3f4-a5b6-2222-3333-444444440002';

    tipo_paquete_id_sobre UUID := 'd1e2f3a4-b5c6-3333-4444-555555550001';
    tipo_paquete_id_caja_p UUID := 'd1e2f3a4-b5c6-3333-4444-555555550002';

    tipo_servicio_id_estandar UUID := 'e1f2a3b4-c5d6-4444-5555-666666660001';
    tipo_servicio_id_express UUID := 'e1f2a3b4-c5d6-4444-5555-666666660002';

    envio_id_1 UUID := 'f1a2b3c4-d5e6-5555-6666-777777770001';
    envio_id_2 UUID := 'f1a2b3c4-d5e6-5555-6666-777777770002';
    envio_id_3 UUID := 'f1a2b3c4-d5e6-5555-6666-777777770003';
    envio_id_4 UUID := 'f1a2b3c4-d5e6-5555-6666-777777770004'; -- For Dos Ruedas

    reparto_id_1 UUID := 'a1a2b3c4-d5e6-7777-8888-999999990001';
    reparto_id_2 UUID := 'a1a2b3c4-d5e6-7777-8888-999999990002';

BEGIN

-- Insert data into empresas
INSERT INTO public.empresas (id, nombre, direccion, latitud, longitud, telefono, email, notas, estado, user_id) VALUES
(empresa_id_1, 'Logística Total MDP', 'Av. Colón 1234, Mar del Plata', -38.00547, -57.54261, '2235550101', 'contacto@logisticatotal.com', 'Cliente corporativo grande, entregas diarias.', 'activo', NULL),
(empresa_id_2, 'Distribuciones Sur', 'Juan B. Justo 5678, Mar del Plata', -38.0352, -57.5648, '2235550102', 'ventas@distrisur.com.ar', 'Requiere confirmación previa para retiros.', 'activo', NULL),
(uuid_generate_v4(), 'Comercio El Rápido', 'San Martín 3010, Mar del Plata', -37.9988, -57.5491, '2235550103', 'elrapido@comercio.com', NULL, 'inactivo', NULL);

-- Insert data into clientes
INSERT INTO public.clientes (id, nombre, apellido, direccion, latitud, longitud, telefono, email, empresa_id, notas, estado, user_id) VALUES
(cliente_id_1, 'Ana', 'García', 'Alberti 2345, Mar del Plata', -38.0021, -57.5535, '2234567890', 'ana.garcia@email.com', empresa_id_1, 'Dejar en portería si no está.', 'activo', NULL),
(cliente_id_2, 'Carlos', 'Rodríguez', 'Independencia 3456, Mar del Plata', -37.9934, -57.5521, '2235678901', 'carlos.r@email.net', NULL, 'Llamar antes de llegar.', 'activo', NULL),
(cliente_id_3, 'Laura', 'Martínez', 'Moreno 4567, Mar del Plata', -37.9967, -57.5465, '2236789012', 'laura.martinez@example.com', empresa_id_2, NULL, 'activo', NULL),
(uuid_generate_v4(), 'Pedro', 'Gómez', 'Belgrano 5678, Mar del Plata', -38.0092, -57.5389, '2233001122', 'pedro.g@email.com', NULL, 'Cliente frecuente.', 'inactivo', NULL);

-- Insert data into repartidores
INSERT INTO public.repartidores (id, nombre, estado, user_id) VALUES
(repartidor_id_1, 'Juan Perez', 'activo', NULL),
(repartidor_id_2, 'Maria Lopez', 'activo', NULL),
(uuid_generate_v4(), 'Luis Fernandez', 'inactivo', NULL);

-- Insert data into tipos_paquete
INSERT INTO public.tipos_paquete (id, nombre, descripcion, user_id) VALUES
(tipo_paquete_id_sobre, 'Sobre Documentación', 'Hasta 0.5 kg, tamaño A4.', NULL),
(tipo_paquete_id_caja_p, 'Caja Pequeña', 'Hasta 2 kg, max 30x20x10 cm.', NULL),
(uuid_generate_v4(), 'Caja Mediana', 'Hasta 5 kg, max 40x30x20 cm.', NULL);

-- Insert data into tipos_servicio
INSERT INTO public.tipos_servicio (id, nombre, descripcion, precio_base, user_id) VALUES
(tipo_servicio_id_estandar, 'Estándar', 'Entrega en 24-48hs.', 500.00, NULL),
(tipo_servicio_id_express, 'Express', 'Entrega en menos de 3hs.', 1200.00, NULL),
(uuid_generate_v4(), 'Programado', 'Entrega en fecha y hora específica.', 800.00, NULL);

-- Insert data into tarifas_distancia_calculadora
INSERT INTO public.tarifas_distancia_calculadora (distancia_min_km, distancia_max_km, precio_por_km, tipo_servicio, precio_base, user_id) VALUES
(0, 5, 150.00, 'express', 300.00, NULL),
(5, 10, 120.00, 'express', 300.00, NULL),
(10, 999, 100.00, 'express', 300.00, NULL),
(0, 5, 80.00, 'lowcost', 150.00, NULL),
(5, 10, 70.00, 'lowcost', 150.00, NULL),
(10, 999, 60.00, 'lowcost', 150.00, NULL);

-- Insert data into envios
-- Envio 1: Cliente existente, origen su dirección, destino específico
INSERT INTO public.envios (id, remitente_cliente_id, direccion_origen, latitud_origen, longitud_origen, empresa_origen_id, notas_origen, nombre_destinatario, telefono_destinatario, direccion_destino, latitud_destino, longitud_destino, empresa_destino_id, notas_destino, tipo_paquete_id, peso_kg, tipo_servicio_id, precio, estado, fecha_estimada_entrega, repartidor_asignado_id, notas_conductor, detalles_adicionales, horario_retiro_desde, horario_entrega_hasta, user_id) VALUES
(envio_id_1, cliente_id_1, 'Alberti 2345, Mar del Plata', -38.0021, -57.5535, NULL, 'Retirar de 9 a 12hs', 'Supermercado Vea', '2231112233', 'Av. Pedro Luro 3200, Mar del Plata', -37.9965, -57.5503, NULL, 'Entregar en caja central', tipo_paquete_id_caja_p, 1.8, tipo_servicio_id_estandar, 750.00, 'pendiente_asignacion', (NOW() + interval '1 day')::DATE, NULL, NULL, NULL, '09:00', '18:00', NULL);

-- Envio 2: Cliente existente (sin empresa), origen su dirección, destino específico
INSERT INTO public.envios (id, remitente_cliente_id, direccion_origen, latitud_origen, longitud_origen, empresa_origen_id, notas_origen, nombre_destinatario, telefono_destinatario, direccion_destino, latitud_destino, longitud_destino, empresa_destino_id, notas_destino, tipo_paquete_id, peso_kg, tipo_servicio_id, precio, estado, fecha_estimada_entrega, repartidor_asignado_id, notas_conductor, detalles_adicionales, horario_retiro_desde, horario_entrega_hasta, user_id) VALUES
(envio_id_2, cliente_id_2, 'Independencia 3456, Mar del Plata', -37.9934, -57.5521, NULL, NULL, 'Farmacia Central', '2239876543', 'Rivadavia 2500, Mar del Plata', -38.0001, -57.5452, NULL, 'Urgente', tipo_paquete_id_sobre, 0.2, tipo_servicio_id_express, 1500.00, 'asignado', (NOW() + interval '3 hours')::DATE, repartidor_id_1, 'Llamar al llegar', NULL, '14:00', '17:00', NULL);

-- Envio 3: Origen empresa, destino cliente específico
INSERT INTO public.envios (id, remitente_cliente_id, direccion_origen, latitud_origen, longitud_origen, empresa_origen_id, notas_origen, nombre_destinatario, telefono_destinatario, direccion_destino, latitud_destino, longitud_destino, empresa_destino_id, notas_destino, tipo_paquete_id, peso_kg, tipo_servicio_id, precio, estado, fecha_estimada_entrega, repartidor_asignado_id, notas_conductor, detalles_adicionales, horario_retiro_desde, horario_entrega_hasta, user_id) VALUES
(envio_id_3, NULL, 'Av. Colón 1234, Mar del Plata', -38.00547, -57.54261, empresa_id_1, 'Retirar pedido #4050', 'Laura Martínez', (SELECT telefono FROM public.clientes WHERE id = cliente_id_3), (SELECT direccion FROM public.clientes WHERE id = cliente_id_3), (SELECT latitud FROM public.clientes WHERE id = cliente_id_3), (SELECT longitud FROM public.clientes WHERE id = cliente_id_3), NULL, 'Es un regalo, no mostrar factura', tipo_paquete_id_caja_p, 3.0, tipo_servicio_id_estandar, 900.00, 'en_camino', (NOW() + interval '2 days')::DATE, repartidor_id_2, 'Manejar con cuidado, frágil', NULL, NULL, NULL, NULL);

-- Envio 4: "Dos Ruedas" style - remitente es un cliente existente, destino manual
INSERT INTO public.envios (id, remitente_cliente_id, direccion_origen, latitud_origen, longitud_origen, nombre_destinatario, telefono_destinatario, direccion_destino, latitud_destino, longitud_destino, tipo_paquete_id, tipo_servicio_id, precio, estado, detalles_adicionales, horario_retiro_desde, horario_entrega_hasta, user_id) VALUES
(envio_id_4, cliente_id_1, (SELECT direccion FROM public.clientes WHERE id = cliente_id_1), (SELECT latitud FROM public.clientes WHERE id = cliente_id_1), (SELECT longitud FROM public.clientes WHERE id = cliente_id_1), 'Pedro Rodriguez', '2236000000', 'Santiago del Estero 2255, Mar del Plata', -38.0008, -57.5477, tipo_paquete_id_sobre, tipo_servicio_id_express, 1250.75, 'pendiente_asignacion', 'Es un sobre con papeles importantes. Tocar timbre depto 3A.', '10:00', '13:00', NULL);


-- Insert data into repartos
INSERT INTO public.repartos (id, fecha_reparto, repartidor_id, empresa_asociada_id, estado, notas, user_id) VALUES
(reparto_id_1, (NOW() + interval '1 day')::DATE, repartidor_id_1, NULL, 'planificado', 'Ruta zona centro y sur.', NULL),
(reparto_id_2, (NOW() + interval '2 days')::DATE, repartidor_id_2, empresa_id_1, 'planificado', 'Entregas de Logística Total.', NULL);

-- Insert data into paradas_reparto
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, user_id) VALUES
(reparto_id_1, envio_id_2, 1, 'asignado', NULL), -- Envio Express asignado a Juan Perez
(reparto_id_2, envio_id_3, 1, 'asignado', NULL); -- Envio de Logistica Total asignado a Maria Lopez

END $$;
    