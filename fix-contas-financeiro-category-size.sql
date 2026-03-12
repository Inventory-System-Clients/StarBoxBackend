-- ============================================
-- Aumentar tamanho dos campos de contas_financeiro
-- Data: 12/03/2026
-- Tabela: contas_financeiro
-- Problema: Campo category estava limitado a 50 caracteres
-- Solução: Aumentar campos para tamanhos adequados
-- ============================================

-- Aumentar tamanho dos campos
ALTER TABLE contas_financeiro 
ALTER COLUMN name TYPE VARCHAR(150);

ALTER TABLE contas_financeiro 
ALTER COLUMN category TYPE VARCHAR(100);

ALTER TABLE contas_financeiro 
ALTER COLUMN city TYPE VARCHAR(100);

ALTER TABLE contas_financeiro 
ALTER COLUMN status TYPE VARCHAR(50);

ALTER TABLE contas_financeiro 
ALTER COLUMN bill_type TYPE VARCHAR(50);

ALTER TABLE contas_financeiro 
ALTER COLUMN payment_method TYPE VARCHAR(50);

-- Verificar alterações
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'contas_financeiro'
AND column_name IN ('name', 'category', 'city', 'status', 'bill_type', 'payment_method')
ORDER BY column_name;

-- Resultado esperado:
-- bill_type      | character varying | 50
-- category       | character varying | 100
-- city           | character varying | 100
-- name           | character varying | 150
-- payment_method | character varying | 50
-- status         | character varying | 50
