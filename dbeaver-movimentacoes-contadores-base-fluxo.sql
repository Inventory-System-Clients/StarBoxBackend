-- Script pronto para DBeaver
-- Objetivo: garantir colunas de contadores (digital/anterior)
-- para calculo correto de valor esperado no fluxo de caixa

BEGIN;

ALTER TABLE movimentacoes
  ADD COLUMN IF NOT EXISTS contador_in_digital INTEGER,
  ADD COLUMN IF NOT EXISTS contador_out_digital INTEGER,
  ADD COLUMN IF NOT EXISTS contador_in_anterior INTEGER,
  ADD COLUMN IF NOT EXISTS contador_out_anterior INTEGER;

-- Backfill seguro para nao deixar base vazia em registros antigos.
-- Se nao houver valor anterior persistido, assume o proprio contador atual.
UPDATE movimentacoes
SET
  contador_in_digital = COALESCE(contador_in_digital, contador_in),
  contador_out_digital = COALESCE(contador_out_digital, contador_out),
  contador_in_anterior = COALESCE(contador_in_anterior, contador_in),
  contador_out_anterior = COALESCE(contador_out_anterior, contador_out)
WHERE
  contador_in_digital IS NULL
  OR contador_out_digital IS NULL
  OR contador_in_anterior IS NULL
  OR contador_out_anterior IS NULL;

COMMIT;

-- Verificacao de schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'movimentacoes'
  AND column_name IN (
    'contador_in',
    'contador_in_digital',
    'contador_in_anterior',
    'contador_out',
    'contador_out_digital',
    'contador_out_anterior'
  )
ORDER BY ordinal_position;

-- Verificacao amostral
SELECT
  id,
  maquina_id,
  data_coleta,
  created_at,
  contador_in,
  contador_in_digital,
  contador_in_anterior,
  contador_out,
  contador_out_digital,
  contador_out_anterior
FROM movimentacoes
ORDER BY created_at DESC
LIMIT 50;
