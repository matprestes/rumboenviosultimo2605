
-- supabase/migrations/0002_seed_data_large.sql

-- Clean up existing data in reverse order of foreign key dependencies
RAISE NOTICE 'Starting data cleanup...';
DELETE FROM public.paradas_reparto;
RAISE NOTICE 'Deleted from paradas_reparto.';
DELETE FROM public.repartos;
RAISE NOTICE 'Deleted from repartos.';
DELETE FROM public.envios;
RAISE NOTICE 'Deleted from envios.';
DELETE FROM public.tarifas_distancia_calculadora;
RAISE NOTICE 'Deleted from tarifas_distancia_calculadora.';
DELETE FROM public.tipos_servicio;
RAISE NOTICE 'Deleted from tipos_servicio.';
DELETE FROM public.tipos_paquete;
RAISE NOTICE 'Deleted from tipos_paquete.';
DELETE FROM public.clientes;
RAISE NOTICE 'Deleted from clientes.';
DELETE FROM public.empresas;
RAISE NOTICE 'Deleted from empresas.';
DELETE FROM public.repartidores;
RAISE NOTICE 'Deleted from repartidores. Data cleanup complete.';

DO $$
DECLARE
    -- Empresa IDs
    empresa_farma_sur_id UUID := uuid_generate_v4();
    empresa_libros_mdp_id UUID := uuid_generate_v4();
    empresa_delicias_mar_id UUID := uuid_generate_v4();
    empresa_tecno_global_id UUID := uuid_generate_v4();
    empresa_ropa_urbana_id UUID := uuid_generate_v4();
    empresa_cafe_colonial_id UUID := uuid_generate_v4();
    empresa_flores_del_puerto_id UUID := uuid_generate_v4();

    -- Cliente IDs (some linked to empresas, some individual)
    cliente_pablo_g_id UUID := uuid_generate_v4();
    cliente_laura_m_id UUID := uuid_generate_v4();
    cliente_martin_r_id UUID := uuid_generate_v4();
    cliente_sofia_c_id UUID := uuid_generate_v4();
    cliente_diego_l_id UUID := uuid_generate_v4();
    cliente_valentina_s_id UUID := uuid_generate_v4();
    cliente_julian_b_id UUID := uuid_generate_v4();
    cliente_camila_v_id UUID := uuid_generate_v4();
    cliente_facundo_a_id UUID := uuid_generate_v4();
    cliente_luciana_p_id UUID := uuid_generate_v4();
    -- More individual clientes
    cliente_indiv_1_id UUID := uuid_generate_v4();
    cliente_indiv_2_id UUID := uuid_generate_v4();
    cliente_indiv_3_id UUID := uuid_generate_v4();
    cliente_indiv_4_id UUID := uuid_generate_v4();
    cliente_indiv_5_id UUID := uuid_generate_v4();


    -- Repartidor IDs
    repartidor_juan_p_id UUID := uuid_generate_v4();
    repartidor_ana_g_id UUID := uuid_generate_v4();
    repartidor_luis_s_id UUID := uuid_generate_v4();
    repartidor_sofia_r_id UUID := uuid_generate_v4();
    repartidor_miguel_c_id UUID := uuid_generate_v4();

    -- Tipo Paquete IDs
    tp_sobre_id UUID := uuid_generate_v4();
    tp_caja_xs_id UUID := uuid_generate_v4();
    tp_caja_s_id UUID := uuid_generate_v4();
    tp_caja_m_id UUID := uuid_generate_v4();
    tp_caja_l_id UUID := uuid_generate_v4();

    -- Tipo Servicio IDs
    ts_standard_id UUID := uuid_generate_v4();
    ts_express_id UUID := uuid_generate_v4();
    ts_programado_id UUID := uuid_generate_v4();
    ts_same_day_id UUID := uuid_generate_v4();

    -- Envio IDs (declare some for specific linking)
    envio_1_id UUID := uuid_generate_v4();
    envio_2_id UUID := uuid_generate_v4();
    envio_3_id UUID := uuid_generate_v4();
    envio_4_id UUID := uuid_generate_v4();
    envio_5_id UUID := uuid_generate_v4();
    envio_6_id UUID := uuid_generate_v4();
    envio_7_id UUID := uuid_generate_v4();
    envio_8_id UUID := uuid_generate_v4();
    envio_9_id UUID := uuid_generate_v4();
    envio_10_id UUID := uuid_generate_v4();
    envio_11_id UUID := uuid_generate_v4();
    envio_12_id UUID := uuid_generate_v4();
    envio_13_id UUID := uuid_generate_v4();
    envio_14_id UUID := uuid_generate_v4();
    envio_15_id UUID := uuid_generate_v4();
    envio_16_id UUID := uuid_generate_v4();
    envio_17_id UUID := uuid_generate_v4();
    envio_18_id UUID := uuid_generate_v4();
    envio_19_id UUID := uuid_generate_v4();
    envio_20_id UUID := uuid_generate_v4();
    envio_21_id UUID := uuid_generate_v4();
    envio_22_id UUID := uuid_generate_v4();
    envio_23_id UUID := uuid_generate_v4();
    envio_24_id UUID := uuid_generate_v4();
    envio_25_id UUID := uuid_generate_v4();


    -- Reparto IDs
    reparto_a_id UUID := uuid_generate_v4();
    reparto_b_id UUID := uuid_generate_v4();
    reparto_c_id UUID := uuid_generate_v4();
    reparto_d_id UUID := uuid_generate_v4();
    reparto_e_id UUID := uuid_generate_v4();
    reparto_f_id UUID := uuid_generate_v4();
    reparto_g_id UUID := uuid_generate_v4();

BEGIN

RAISE NOTICE 'Inserting empresas...';
INSERT INTO public.empresas (id, nombre, direccion, latitud, longitud, telefono, email, estado, notas) VALUES
(empresa_farma_sur_id, 'Farmacia Sur MDP', 'Av. Juan B. Justo 2500, Mar del Plata', -38.0285, -57.5700, '2234801122', 'pedidos@farmasurmdp.com', 'activo', 'Entrega de medicamentos y perfumería.'),
(empresa_libros_mdp_id, 'Libros del Puerto', '12 de Octubre 3200, Mar del Plata', -38.0190, -57.5330, '2234895566', 'ventas@librosdelpuerto.com.ar', 'activo', 'Librería especializada en temas náuticos.'),
(empresa_delicias_mar_id, 'Delicias del Mar Congelados', 'Av. Vertiz 5500, Mar del Plata', -38.0350, -57.5850, '2235671234', 'info@deliciasmar.com', 'activo', 'Productos congelados, requieren frío.'),
(empresa_tecno_global_id, 'TecnoGlobal Componentes', 'Av. Colón 1800, Mar del Plata', -38.0045, -57.5485, '2234958877', 'soporte@tecnoglobal.com.ar', 'activo', 'Importador de electrónica.'),
(empresa_ropa_urbana_id, 'Ropa Urbana Outlet', 'San Juan 1750, Mar del Plata', -38.0015, -57.5505, '2236012345', 'outlet@ropaurbana.com', 'inactivo', 'Outlet de ropa, cerrado por temporada baja.'),
(empresa_cafe_colonial_id, 'Café Colonial Tradicional', 'Hipólito Yrigoyen 1700, Mar del Plata', -38.0052, -57.5558, '2234750011', 'reservas@cafecolonial.com', 'activo', 'Cafetería y panadería artesanal.'),
(empresa_flores_del_puerto_id, 'Flores del Puerto MDP', 'Rondeau 450, Mar del Plata', -38.0211, -57.5301, '2235050505', 'floreria@delpuerto.com', 'activo', 'Arreglos florales y plantas.');
RAISE NOTICE 'Empresas inserted.';

RAISE NOTICE 'Inserting clientes...';
INSERT INTO public.clientes (id, nombre, apellido, direccion, latitud, longitud, telefono, email, empresa_id, estado, notas) VALUES
(cliente_pablo_g_id, 'Pablo', 'Gonzalez', 'Alvarado 2950, Mar del Plata', -38.0060, -57.5485, '2235001111', 'pablo.g@email.com', empresa_farma_sur_id, 'activo', 'Recibe medicamentos crónicos.'),
(cliente_laura_m_id, 'Laura', 'Martinez', 'Peña 3800, Mar del Plata', -37.9915, -57.5605, '2235002222', 'laura.m@email.com', empresa_libros_mdp_id, 'activo', 'Coleccionista de libros náuticos.'),
(cliente_martin_r_id, 'Martín', 'Rodriguez', 'Castelli 950, Mar del Plata', -38.0105, -57.5595, '2235003333', 'martin.r@email.com', NULL, 'activo', 'Dejar en portería si no está.'),
(cliente_sofia_c_id, 'Sofía', 'Castro', 'Garay 1230, Mar del Plata', -38.0080, -57.5575, '2235004444', 'sofia.c@email.com', empresa_delicias_mar_id, 'activo', 'Avisar 30 min antes de llegar.'),
(cliente_diego_l_id, 'Diego', 'Lopez', 'Moreno 2200, Mar del Plata', -38.0030, -57.5460, '2235005555', 'diego.l@email.com', empresa_tecno_global_id, 'inactivo', 'Se mudó fuera de la ciudad.'),
(cliente_valentina_s_id, 'Valentina', 'Sanchez', 'Formosa 650, Mar del Plata', -38.0128, -57.5630, '2235006666', 'valentina.s@email.com', NULL, 'activo', 'Timbre A, planta baja.'),
(cliente_julian_b_id, 'Julián', 'Benitez', 'San Lorenzo 3300, Mar del Plata', -38.0035, -57.5495, '2235007777', 'julian.b@email.com', empresa_cafe_colonial_id, 'activo', 'Pide croissants los sábados.'),
(cliente_camila_v_id, 'Camila', 'Vega', 'Brown 1550, Mar del Plata', -38.0062, -57.5515, '2235008888', 'camila.v@email.com', NULL, 'activo', NULL),
(cliente_facundo_a_id, 'Facundo', 'Alvarez', 'Saavedra 2020, Mar del Plata', -38.0008, -57.5608, '2235009999', 'facundo.a@email.com', empresa_flores_del_puerto_id, 'activo', 'Envío de flores semanal.'),
(cliente_luciana_p_id, 'Luciana', 'Peralta', 'Roca 1890, Mar del Plata', -38.0055, -57.5535, '2235000000', 'luciana.p@email.com', NULL, 'activo', 'Horario de entrega preferido: tarde.');

INSERT INTO public.clientes (id, nombre, apellido, direccion, latitud, longitud, telefono, email, estado) VALUES
(cliente_indiv_1_id, 'Ricardo', 'Juarez', 'Av. Paso 2500, Mar del Plata', -38.0108, -57.5472, '2235110011', 'ricardo.j@email.com', 'activo'),
(cliente_indiv_2_id, 'Florencia', 'Gimenez', 'Matheu 1250, Mar del Plata', -38.0132, -57.5548, '2235110022', 'flor.g@email.com', 'activo'),
(cliente_indiv_3_id, 'Esteban', 'Diaz', 'Olazábal 880, Mar del Plata', -38.0115, -57.5612, '2235110033', 'esteban.d@email.com', 'activo'),
(cliente_indiv_4_id, 'Micaela', 'Fernandez', 'Rawson 2210, Mar del Plata', -38.0068, -57.5523, '2235110044', 'mica.f@email.com', 'activo'),
(cliente_indiv_5_id, 'Hernan', 'Sosa', 'Guido 1570, Mar del Plata', -38.0075, -57.5560, '2235110055', 'hernan.s@email.com', 'inactivo');
RAISE NOTICE 'Clientes inserted.';

RAISE NOTICE 'Inserting repartidores...';
INSERT INTO public.repartidores (id, nombre, estado) VALUES
(repartidor_juan_p_id, 'Juan Perez', 'activo'),
(repartidor_ana_g_id, 'Ana Gomez', 'activo'),
(repartidor_luis_s_id, 'Luis Sanchez', 'inactivo'),
(repartidor_sofia_r_id, 'Sofia Ramirez', 'activo'),
(repartidor_miguel_c_id, 'Miguel Castro', 'activo'),
(uuid_generate_v4(), 'Pedro Alonso', 'activo'),
(uuid_generate_v4(), 'Carla Diaz', 'activo');
RAISE NOTICE 'Repartidores inserted.';

RAISE NOTICE 'Inserting tipos_paquete...';
INSERT INTO public.tipos_paquete (id, nombre, descripcion) VALUES
(tp_sobre_id, 'Sobre Documentación', 'Hasta 0.5kg, documentos o items muy delgados.'),
(tp_caja_xs_id, 'Paquete Extra Pequeño', 'Hasta 20x15x10 cm, hasta 1kg.'),
(tp_caja_s_id, 'Paquete Pequeño', 'Hasta 30x20x15 cm, hasta 3kg.'),
(tp_caja_m_id, 'Paquete Mediano', 'Hasta 50x40x30 cm, hasta 8kg.'),
(tp_caja_l_id, 'Paquete Grande', 'Hasta 80x60x50 cm, hasta 15kg.');
RAISE NOTICE 'Tipos_paquete inserted.';

RAISE NOTICE 'Inserting tipos_servicio...';
INSERT INTO public.tipos_servicio (id, nombre, descripcion, precio_base) VALUES
(ts_standard_id, 'Estándar MDP', 'Entrega dentro de Mar del Plata en 24-48hs.', 250.00),
(ts_express_id, 'Express MDP', 'Entrega en Mar del Plata en menos de 3 horas.', 500.00),
(ts_programado_id, 'Programado MDP', 'Entrega en fecha y franja horaria específica.', 350.00),
(ts_same_day_id, 'Mismo Día MDP', 'Entrega durante el día, solicitado antes de las 12 PM.', 400.00);
RAISE NOTICE 'Tipos_servicio inserted.';

RAISE NOTICE 'Inserting tarifas_distancia_calculadora...';
INSERT INTO public.tarifas_distancia_calculadora (tipo_servicio, distancia_min_km, distancia_max_km, precio_base, precio_por_km) VALUES
('express', 0, 3, 250.00, 80.00),
('express', 3.01, 7, 250.00, 70.00),
('express', 7.01, 15, 250.00, 60.00),
('express', 15.01, 999, 250.00, 55.00),
('lowcost', 0, 3, 120.00, 40.00),
('lowcost', 3.01, 7, 120.00, 35.00),
('lowcost', 7.01, 15, 120.00, 30.00),
('lowcost', 15.01, 999, 120.00, 25.00);
RAISE NOTICE 'Tarifas_distancia_calculadora inserted.';

RAISE NOTICE 'Inserting envios...';
INSERT INTO public.envios (id, remitente_cliente_id, nombre_destinatario, telefono_destinatario, direccion_origen, latitud_origen, longitud_origen, direccion_destino, latitud_destino, longitud_destino, tipo_paquete_id, peso_kg, tipo_servicio_id, precio, estado, fecha_estimada_entrega, notas_conductor, horario_retiro_desde, horario_entrega_hasta, detalles_adicionales) VALUES
(envio_1_id, cliente_pablo_g_id, 'Mariana Lopez', '2236112233', (SELECT direccion FROM clientes WHERE id = cliente_pablo_g_id), (SELECT latitud FROM clientes WHERE id = cliente_pablo_g_id), (SELECT longitud FROM clientes WHERE id = cliente_pablo_g_id), 'Av. Constitución 5500, Mar del Plata', -37.9720, -57.5730, tp_sobre_id, 0.2, ts_express_id, 550.00, 'pendiente_asignacion', (NOW() + interval '0 day')::DATE, 'Urgente, entregar antes de las 14hs', '09:00', '14:00', 'Sobre con documentos importantes'),
(envio_2_id, cliente_laura_m_id, 'Carlos Benitez', '2236223344', (SELECT direccion FROM clientes WHERE id = cliente_laura_m_id), (SELECT latitud FROM clientes WHERE id = cliente_laura_m_id), (SELECT longitud FROM clientes WHERE id = cliente_laura_m_id), 'Alvear 400, Mar del Plata', -38.0165, -57.5420, tp_caja_s_id, 2.5, ts_standard_id, 320.00, 'pendiente_asignacion', (NOW() + interval '1 day')::DATE, NULL, '10:00', '18:00', 'Libro frágil, envolver bien.'),
(envio_3_id, NULL, 'Javier Rodriguez (Dest.)', '2236334455', (SELECT direccion FROM empresas WHERE id = empresa_delicias_mar_id), (SELECT latitud FROM empresas WHERE id = empresa_delicias_mar_id), (SELECT longitud FROM empresas WHERE id = empresa_delicias_mar_id), 'San Luis 1800, Mar del Plata', -38.0048, -57.5500, tp_caja_m_id, 6.0, ts_programado_id, 450.00, 'asignado', (NOW() + interval '2 day')::DATE, 'Confirmar horario con Javier.', '14:00', '17:00', 'Pedido de congelados, mantener cadena de frío.'),
(envio_4_id, cliente_martin_r_id, 'Oficina TecnoGlobal', '2234958877', (SELECT direccion FROM clientes WHERE id = cliente_martin_r_id), (SELECT latitud FROM clientes WHERE id = cliente_martin_r_id), (SELECT longitud FROM clientes WHERE id = cliente_martin_r_id), (SELECT direccion FROM empresas WHERE id = empresa_tecno_global_id), (SELECT latitud FROM empresas WHERE id = empresa_tecno_global_id), (SELECT longitud FROM empresas WHERE id = empresa_tecno_global_id), tp_caja_xs_id, 0.8, ts_same_day_id, 420.00, 'en_camino', (NOW() + interval '0 day')::DATE, 'Entregar en recepción, preguntar por Sra. Alonso.', '09:30', '16:00', NULL),
(envio_5_id, cliente_sofia_c_id, 'Ana Clara', '2236556677', (SELECT direccion FROM clientes WHERE id = cliente_sofia_c_id), (SELECT latitud FROM clientes WHERE id = cliente_sofia_c_id), (SELECT longitud FROM clientes WHERE id = cliente_sofia_c_id), 'Bolivar 2900, Mar del Plata', -37.9990, -57.5470, tp_caja_l_id, 12.0, ts_standard_id, 700.00, 'entregado', (NOW() - interval '1 day')::DATE, NULL, '11:00', '19:00', 'Caja grande con varios artículos.'),
(envio_6_id, cliente_indiv_1_id, 'Ferreteria "El Clavo"', '2234809988', (SELECT direccion FROM clientes WHERE id = cliente_indiv_1_id), (SELECT latitud FROM clientes WHERE id = cliente_indiv_1_id), (SELECT longitud FROM clientes WHERE id = cliente_indiv_1_id), 'Av. Luro 5500, Mar del Plata', -37.9850, -57.5650, tp_caja_m_id, 5.5, ts_standard_id, 380.00, 'no_entregado', (NOW() - interval '2 day')::DATE, 'Local cerrado. Intentar mañana.', '10:00', '17:00', 'Herramientas varias.'),
(envio_7_id, cliente_indiv_2_id, 'Paula Gomez', '2234778899', (SELECT direccion FROM clientes WHERE id = cliente_indiv_2_id), (SELECT latitud FROM clientes WHERE id = cliente_indiv_2_id), (SELECT longitud FROM clientes WHERE id = cliente_indiv_2_id), 'Santiago del Estero 2200, Mar del Plata', -38.0028, -57.5528, tp_sobre_id, 0.1, ts_express_id, 520.00, 'cancelado', (NOW() - interval '3 day')::DATE, 'Cliente canceló el pedido.', '15:00', '17:00', 'Contrato legal.'),
(envio_8_id, cliente_julian_b_id, 'Vecino Sr. Rodriguez', '2236121212', (SELECT direccion FROM clientes WHERE id = cliente_julian_b_id), (SELECT latitud FROM clientes WHERE id = cliente_julian_b_id), (SELECT longitud FROM clientes WHERE id = cliente_julian_b_id), 'Corrientes 1900, Mar del Plata', -38.0040, -57.5465, tp_caja_xs_id, 0.7, ts_programado_id, 300.00, 'pendiente_asignacion', (NOW() + interval '3 day')::DATE, 'Dejar al encargado del edificio si no está.', '16:00', '19:00', 'Pequeño regalo.'),
(envio_9_id, NULL, 'Pablo Gonzalez (Dest.)', '2235001111', (SELECT direccion FROM empresas WHERE id = empresa_cafe_colonial_id), (SELECT latitud FROM empresas WHERE id = empresa_cafe_colonial_id), (SELECT longitud FROM empresas WHERE id = empresa_cafe_colonial_id), (SELECT direccion FROM clientes WHERE id = cliente_pablo_g_id), (SELECT latitud FROM clientes WHERE id = cliente_pablo_g_id), (SELECT longitud FROM clientes WHERE id = cliente_pablo_g_id), tp_caja_s_id, 1.2, ts_same_day_id, 400.00, 'pendiente_asignacion', (NOW() + interval '0 day')::DATE, NULL, '10:00', '15:00', 'Pedido de café y medialunas.'),
(envio_10_id, cliente_facundo_a_id, 'Tienda de Mascotas "Guau"', '2234445566', (SELECT direccion FROM clientes WHERE id = cliente_facundo_a_id), (SELECT latitud FROM clientes WHERE id = cliente_facundo_a_id), (SELECT longitud FROM clientes WHERE id = cliente_facundo_a_id), 'San Martin 2800, Mar del Plata', -37.9988, -57.5478, tp_caja_m_id, 7.0, ts_standard_id, 480.00, 'pendiente_asignacion', (NOW() + interval '1 day')::DATE, 'Alimento para perro, bolsa grande.', '10:00', '18:00', NULL),
(envio_11_id, cliente_indiv_3_id, 'Mamá de Esteban', '2236998877', (SELECT direccion FROM clientes WHERE id = cliente_indiv_3_id), (SELECT latitud FROM clientes WHERE id = cliente_indiv_3_id), (SELECT longitud FROM clientes WHERE id = cliente_indiv_3_id), 'Av. Tejedor 150, Mar del Plata', -37.9550, -57.5780, tp_caja_xs_id, 1.0, ts_express_id, 580.00, 'asignado', (NOW() + interval '0 day')::DATE, NULL, '09:00', '12:00', 'Flores y bombones.'),
(envio_12_id, cliente_indiv_4_id, 'Consultorio Dra. Paz', '2234221133', (SELECT direccion FROM clientes WHERE id = cliente_indiv_4_id), (SELECT latitud FROM clientes WHERE id = cliente_indiv_4_id), (SELECT longitud FROM clientes WHERE id = cliente_indiv_4_id), 'Salta 2100, Mar del Plata', -38.0032, -57.5545, tp_sobre_id, 0.3, ts_programado_id, 330.00, 'en_camino', (NOW() + interval '0 day')::DATE, 'Entregar a secretaria, piso 3, of. B.', '14:00', '16:00', 'Resultados médicos.'),
(envio_13_id, NULL, 'Recepción Hotel Provincial', '2234910001', (SELECT direccion FROM empresas WHERE id = empresa_flores_del_puerto_id), (SELECT latitud FROM empresas WHERE id = empresa_flores_del_puerto_id), (SELECT longitud FROM empresas WHERE id = empresa_flores_del_puerto_id), 'Patricio Peralta Ramos 2502, Mar del Plata', -38.0042, -57.5395, tp_caja_s_id, 2.2, ts_standard_id, 310.00, 'entregado', (NOW() - interval '4 day')::DATE, NULL, NULL, NULL, 'Arreglo floral para evento.'),
(envio_14_id, cliente_pablo_g_id, 'Hermana de Pablo', '2236767676', (SELECT direccion FROM clientes WHERE id = cliente_pablo_g_id), (SELECT latitud FROM clientes WHERE id = cliente_pablo_g_id), (SELECT longitud FROM clientes WHERE id = cliente_pablo_g_id), 'Dorrego 2800, Mar del Plata', -37.9972, -57.5625, tp_caja_xs_id, 0.9, ts_same_day_id, 390.00, 'no_entregado', (NOW() - interval '1 day')::DATE, 'No atendieron. Reintentar.', '10:00', '13:00', NULL),
(envio_15_id, cliente_laura_m_id, 'Club de Lectura', '2235252525', (SELECT direccion FROM clientes WHERE id = cliente_laura_m_id), (SELECT latitud FROM clientes WHERE id = cliente_laura_m_id), (SELECT longitud FROM clientes WHERE id = cliente_laura_m_id), 'Almafuerte 300, Mar del Plata', -38.0170, -57.5400, tp_caja_m_id, 4.5, ts_standard_id, 360.00, 'pendiente_asignacion', (NOW() + interval '2 day')::DATE, NULL, '15:00', '19:00', 'Varios ejemplares para el club.'),
(envio_16_id, NULL, 'Kiosco "El Sol"', '2234101010', (SELECT direccion FROM empresas WHERE id = empresa_libros_mdp_id), (SELECT latitud FROM empresas WHERE id = empresa_libros_mdp_id), (SELECT longitud FROM empresas WHERE id = empresa_libros_mdp_id), 'Av. Independencia 2000, Mar del Plata', -37.9998, -57.5550, tp_caja_s_id, 2.0, ts_express_id, 480.00, 'cancelado', (NOW() - interval '5 day')::DATE, 'Pedido cancelado por el cliente.', '11:00', '14:00', NULL),
(envio_17_id, cliente_martin_r_id, 'Abuela de Martín', '2235887766', (SELECT direccion FROM clientes WHERE id = cliente_martin_r_id), (SELECT latitud FROM clientes WHERE id = cliente_martin_r_id), (SELECT longitud FROM clientes WHERE id = cliente_martin_r_id), 'Catamarca 3300, Mar del Plata', -37.9930, -57.5590, tp_caja_xs_id, 1.1, ts_programado_id, 290.00, 'asignado', (NOW() + interval '1 day')::DATE, 'Dejar con encargado si no está.', '10:00', '12:00', 'Compra pequeña de supermercado.'),
(envio_18_id, cliente_sofia_c_id, 'Imprenta Grafica MDP', '2234765432', (SELECT direccion FROM clientes WHERE id = cliente_sofia_c_id), (SELECT latitud FROM clientes WHERE id = cliente_sofia_c_id), (SELECT longitud FROM clientes WHERE id = cliente_sofia_c_id), 'Belgrano 4500, Mar del Plata', -37.9900, -57.5635, tp_caja_l_id, 9.5, ts_standard_id, 650.00, 'pendiente_asignacion', (NOW() + interval '2 day')::DATE, 'Cajas con folletos.', '09:00', '17:00', NULL),
(envio_19_id, NULL, 'Taller Mecánico "El Piston"', '2235151515', (SELECT direccion FROM empresas WHERE id = empresa_tecno_global_id), (SELECT latitud FROM empresas WHERE id = empresa_tecno_global_id), (SELECT longitud FROM empresas WHERE id = empresa_tecno_global_id), 'Av. Champagnat 1200, Mar del Plata', -37.9880, -57.5750, tp_caja_m_id, 5.0, ts_same_day_id, 460.00, 'pendiente_asignacion', (NOW() + interval '0 day')::DATE, NULL, NULL, NULL, 'Repuestos urgentes.'),
(envio_20_id, cliente_valentina_s_id, 'Estudio Contable Integral', '2234321098', (SELECT direccion FROM clientes WHERE id = cliente_valentina_s_id), (SELECT latitud FROM clientes WHERE id = cliente_valentina_s_id), (SELECT longitud FROM clientes WHERE id = cliente_valentina_s_id), '20 de Septiembre 1500, Mar del Plata', -38.0072, -57.5588, tp_sobre_id, 0.4, ts_express_id, 500.00, 'en_camino', (NOW() + interval '0 day')::DATE, 'Preguntar por Dra. Gomez.', '10:00', '13:00', 'Balance anual.'),
(envio_21_id, cliente_indiv_5_id, 'Restaurante "La Cantina"', '2236102030', (SELECT direccion FROM clientes WHERE id = cliente_indiv_5_id), (SELECT latitud FROM clientes WHERE id = cliente_indiv_5_id), (SELECT longitud FROM clientes WHERE id = cliente_indiv_5_id), 'Olavarría 2800, Mar del Plata', -38.0002, -57.5455, tp_caja_s_id, 2.8, ts_standard_id, 310.00, 'entregado', (NOW() - interval '1 day')::DATE, NULL, '12:00', '15:00', 'Insumos para cocina.'),
(envio_22_id, cliente_pablo_g_id, 'Otro Destino Pablo G', '2236102031', (SELECT direccion FROM clientes WHERE id = cliente_pablo_g_id), (SELECT latitud FROM clientes WHERE id = cliente_pablo_g_id), (SELECT longitud FROM clientes WHERE id = cliente_pablo_g_id), 'Gascón 2500, Mar del Plata', -38.0058, -57.5562, tp_caja_xs_id, 0.5, ts_express_id, 500.00, 'pendiente_asignacion', (NOW())::DATE, NULL, '10:00', '12:00', NULL),
(envio_23_id, cliente_laura_m_id, 'Tercer Destino Laura M', '2236102032', (SELECT direccion FROM clientes WHERE id = cliente_laura_m_id), (SELECT latitud FROM clientes WHERE id = cliente_laura_m_id), (SELECT longitud FROM clientes WHERE id = cliente_laura_m_id), 'Brown 300, Mar del Plata', -38.0150, -57.5430, tp_caja_s_id, 1.5, ts_standard_id, 280.00, 'pendiente_asignacion', (NOW() + interval '1 day')::DATE, NULL, NULL, NULL, NULL),
(envio_24_id, NULL, 'Regalería "Detalles"', '2236102033', (SELECT direccion FROM empresas WHERE id = empresa_cafe_colonial_id), (SELECT latitud FROM empresas WHERE id = empresa_cafe_colonial_id), (SELECT longitud FROM empresas WHERE id = empresa_cafe_colonial_id), 'Sarmiento 2700, Mar del Plata', -38.0000, -57.5495, tp_caja_m_id, 3.0, ts_programado_id, 380.00, 'pendiente_asignacion', (NOW() + interval '2 day')::DATE, 'Entrega por la tarde.', '15:00', '18:00', NULL),
(envio_25_id, cliente_martin_r_id, 'Casa de Electrodomésticos', '2236102034', (SELECT direccion FROM clientes WHERE id = cliente_martin_r_id), (SELECT latitud FROM clientes WHERE id = cliente_martin_r_id), (SELECT longitud FROM clientes WHERE id = cliente_martin_r_id), 'Av. Jara 1500, Mar del Plata', -38.0100, -57.5680, tp_caja_l_id, 10.0, ts_standard_id, 600.00, 'pendiente_asignacion', (NOW() + interval '1 day')::DATE, NULL, NULL, NULL, 'Producto pesado.');
RAISE NOTICE 'Envios inserted.';

RAISE NOTICE 'Inserting repartos...';
INSERT INTO public.repartos (id, fecha_reparto, repartidor_id, empresa_asociada_id, estado, notas) VALUES
(reparto_a_id, (NOW() + interval '0 day')::DATE, repartidor_juan_p_id, NULL, 'planificado', 'Zona Centro y La Perla.'),
(reparto_b_id, (NOW() + interval '0 day')::DATE, repartidor_ana_g_id, empresa_farma_sur_id, 'planificado', 'Entregas de Farmacia Sur.'),
(reparto_c_id, (NOW() - interval '1 day')::DATE, repartidor_luis_s_id, NULL, 'completado', 'Repartos de ayer, todo OK.'),
(reparto_d_id, (NOW() + interval '1 day')::DATE, repartidor_sofia_r_id, empresa_libros_mdp_id, 'planificado', 'Pedidos de Libros del Puerto para mañana.'),
(reparto_e_id, (NOW() - interval '2 day')::DATE, repartidor_miguel_c_id, NULL, 'cancelado', 'Cancelado por falta de móvil.'),
(reparto_f_id, (NOW() + interval '0 day')::DATE, repartidor_juan_p_id, NULL, 'en_curso', 'Reparto de tarde, zona Puerto.'),
(reparto_g_id, (NOW() + interval '1 day')::DATE, (SELECT id FROM repartidores WHERE nombre = 'Pedro Alonso'), NULL, 'planificado', 'Entregas varias zona norte.');
RAISE NOTICE 'Repartos inserted.';

RAISE NOTICE 'Inserting paradas_reparto...';
-- Reparto A (Juan P - Centro/La Perla)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, descripcion_parada) VALUES
(reparto_a_id, envio_1_id, 1, 'asignado', NULL),
(reparto_a_id, envio_2_id, 2, 'asignado', NULL),
(reparto_a_id, envio_22_id, 3, 'asignado', NULL);

-- Reparto B (Ana G - Farmacia Sur Lote)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, descripcion_parada) VALUES
(reparto_b_id, NULL, 1, 'asignado', 'Retiro en Farmacia Sur MDP'),
(reparto_b_id, envio_5_id, 2, 'asignado', NULL), 
(reparto_b_id, envio_11_id, 3, 'asignado', NULL);

-- Reparto C (Luis S - Completado)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, descripcion_parada) VALUES
(reparto_c_id, envio_13_id, 1, 'entregado', 'Entrega OK en Hotel Provincial.'),
(reparto_c_id, envio_21_id, 2, 'entregado', 'Cliente recibió conforme.');

-- Reparto D (Sofia R - Libros del Puerto Lote)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, descripcion_parada) VALUES
(reparto_d_id, NULL, 1, 'asignado', 'Retiro en Libros del Puerto'),
(reparto_d_id, envio_15_id, 2, 'asignado', NULL),
(reparto_d_id, envio_23_id, 3, 'asignado', NULL);

-- Reparto F (Juan P - En Curso, Zona Puerto)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, descripcion_parada) VALUES
(reparto_f_id, envio_9_id, 1, 'en_camino', NULL),
(reparto_f_id, envio_18_id, 2, 'en_camino', 'Llamar al llegar al edificio.'),
(reparto_f_id, envio_20_id, 3, 'asignado', NULL); 

-- Reparto G (Pedro Alonso - Zona Norte Mañana)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden_visita, estado_parada, descripcion_parada) VALUES
(reparto_g_id, envio_12_id, 1, 'asignado', NULL),
(reparto_g_id, envio_17_id, 2, 'asignado', NULL),
(reparto_g_id, envio_25_id, 3, 'asignado', 'Caja pesada, llevar carrito.'),
(reparto_g_id, envio_24_id, 4, 'asignado', NULL);
RAISE NOTICE 'Paradas_reparto inserted.';

RAISE NOTICE 'Seed data insertion process finished.';

END $$;

    