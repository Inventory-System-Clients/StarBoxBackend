-- Script pronto para DBeaver
-- Objetivo: separar valor retirado em fisico e digital no fluxo de caixa
-- Execute no banco da aplicacao

BEGIN;

ALTER TABLE fluxo_caixa
  ADD COLUMN IF NOT EXISTS valor_retirado_fisico DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS valor_retirado_digital DECIMAL(10,2);

-- Backfill seguro:
-- Se ja existia valor_retirado antigo, assume inicialmente tudo como fisico
-- e digital zerado para preservar historico.
UPDATE fluxo_caixa
SET
  valor_retirado_fisico = COALESCE(valor_retirado_fisico, valor_retirado),
  valor_retirado_digital = COALESCE(valor_retirado_digital, 0)
WHERE
  valor_retirado_fisico IS NULL
  OR valor_retirado_digital IS NULL;

-- Garante consistencia do total legado como soma de fisico + digital
UPDATE fluxo_caixa
SET valor_retirado = COALESCE(valor_retirado_fisico, 0) + COALESCE(valor_retirado_digital, 0)
WHERE valor_retirado_fisico IS NOT NULL OR valor_retirado_digital IS NOT NULL;

COMMIT;

-- Verificar colunas novas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fluxo_caixa'
  AND column_name IN (
    'valor_retirado',
    'valor_retirado_fisico',
    'valor_retirado_digital'
  )
ORDER BY ordinal_position;

-- Verificar consistencia amostral do total
SELECT
  id,
  valor_esperado,
  valor_retirado,
  valor_retirado_fisico,
  valor_retirado_digital,
  (COALESCE(valor_retirado_fisico, 0) + COALESCE(valor_retirado_digital, 0)) AS valor_retirado_recalculado
FROM fluxo_caixa
ORDER BY updated_at DESC
LIMIT 50;
