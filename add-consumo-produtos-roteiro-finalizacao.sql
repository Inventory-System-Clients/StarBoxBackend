-- Migration SQL (DBeaver)
-- Objetivo: guardar estoque inicial/final e consumo de produtos por finalizacao diaria de roteiro

ALTER TABLE roteiro_finalizacao_diaria
  ADD COLUMN IF NOT EXISTS estoque_inicial_total INTEGER,
  ADD COLUMN IF NOT EXISTS estoque_final_total INTEGER,
  ADD COLUMN IF NOT EXISTS consumo_total_produtos INTEGER;

-- Consulta de validacao
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'roteiro_finalizacao_diaria'
  AND column_name IN (
    'estoque_inicial_total',
    'estoque_final_total',
    'consumo_total_produtos'
  )
ORDER BY column_name;
