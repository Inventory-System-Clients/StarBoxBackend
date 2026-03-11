-- =====================================================
-- MIGRATION: Adicionar coluna valor_esperado na tabela fluxo_caixa
-- Data: 11/03/2026
-- Descrição: Adiciona campo valor_esperado editável
-- =====================================================

-- Adicionar coluna valor_esperado
ALTER TABLE fluxo_caixa
ADD COLUMN valor_esperado DECIMAL(10, 2) DEFAULT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN fluxo_caixa.valor_esperado IS 'Valor esperado (editável, padrão é o valorFaturado da movimentação)';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- VERIFICAÇÃO: Execute o comando abaixo para verificar se a coluna foi adicionada

-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'fluxo_caixa' AND column_name = 'valor_esperado';
