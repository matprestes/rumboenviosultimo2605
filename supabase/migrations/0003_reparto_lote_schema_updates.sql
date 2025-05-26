
-- Migration for "Reparto por Lote" feature

-- 1. Make envio_id nullable in paradas_reparto
ALTER TABLE public.paradas_reparto
ALTER COLUMN envio_id DROP NOT NULL;

-- 2. Add descripcion_parada to paradas_reparto
ALTER TABLE public.paradas_reparto
ADD COLUMN descripcion_parada TEXT NULL;

-- Optional: Add a comment to the new column for clarity
COMMENT ON COLUMN public.paradas_reparto.descripcion_parada IS 'Description for the stop, e.g., "Retiro en Empresa X" or specific delivery instructions if not tied to an envío.';

-- You might need to update RLS policies if they specifically relied on envio_id being NOT NULL,
-- but the current generic policies should still work.
-- No new enums or tables needed for this specific schema update.

-- Important: After running this migration, regenerate your Supabase TypeScript types:
-- npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/lib/supabase/database.types.ts
