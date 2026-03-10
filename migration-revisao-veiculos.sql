-- ============================================
-- MIGRATION: Adicionar Colunas de Revisão
-- Data: 10/03/2026
-- Tabela: veiculos
-- ============================================

-- 1. Adicionar coluna km_inicial_cadastro
ALTER TABLE veiculos 
ADD COLUMN IF NOT EXISTS km_inicial_cadastro INTEGER;

COMMENT ON COLUMN veiculos.km_inicial_cadastro IS 'KM do veículo quando foi cadastrado no sistema';

-- 2. Adicionar coluna proxima_revisao_km
ALTER TABLE veiculos 
ADD COLUMN IF NOT EXISTS proxima_revisao_km INTEGER;

COMMENT ON COLUMN veiculos.proxima_revisao_km IS 'Próximo KM que o veículo deve fazer revisão (múltiplo de 10.000)';

-- 3. Adicionar coluna ultima_revisao_km
ALTER TABLE veiculos 
ADD COLUMN IF NOT EXISTS ultima_revisao_km INTEGER;

COMMENT ON COLUMN veiculos.ultima_revisao_km IS 'Último KM em que foi feita revisão';

-- ============================================
-- Inicializar valores para veículos existentes
-- ============================================

-- Preencher km_inicial_cadastro com km atual (para veículos já cadastrados)
-- Calcular proxima_revisao_km baseado no km atual
UPDATE veiculos 
SET 
  km_inicial_cadastro = COALESCE(km_inicial_cadastro, km),
  proxima_revisao_km = COALESCE(proxima_revisao_km, ((km / 10000) + 1) * 10000)
WHERE km_inicial_cadastro IS NULL OR proxima_revisao_km IS NULL;

-- ============================================
-- Verificar se as colunas foram criadas
-- ============================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'veiculos' 
  AND column_name IN ('km_inicial_cadastro', 'proxima_revisao_km', 'ultima_revisao_km')
ORDER BY column_name;

-- ============================================
-- Verificar dados dos veículos
-- ============================================

SELECT 
  id,
  nome,
  modelo,
  km as km_atual,
  km_inicial_cadastro,
  proxima_revisao_km,
  ultima_revisao_km,
  CASE 
    WHEN km >= proxima_revisao_km THEN '⚠️ PRECISA REVISÃO'
    ELSE '✅ OK'
  END as status_revisao
FROM veiculos
ORDER BY nome;
