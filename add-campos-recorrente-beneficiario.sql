-- ============================================
-- Script para adicionar campos RECORRENTE e BENEFICIÁRIO
-- Tabela: contas_financeiro
-- Data: 11/03/2026
-- ============================================

-- Adicionar coluna 'recorrente' (indica se a conta se repete todo mês)
ALTER TABLE contas_financeiro 
ADD COLUMN recorrente BOOLEAN DEFAULT FALSE 
COMMENT 'Indica se a conta se repete todos os meses na mesma data';

-- Adicionar coluna 'beneficiario' (nome de quem receberá o pagamento)
ALTER TABLE contas_financeiro 
ADD COLUMN beneficiario VARCHAR(255) NULL 
COMMENT 'Nome da pessoa ou empresa que receberá o pagamento';

-- ============================================
-- Como executar no DBeaver:
-- 1. Abra o DBeaver e conecte ao seu banco de dados
-- 2. Copie e cole este script na janela SQL
-- 3. Execute (Ctrl+Enter ou botão Execute)
-- 4. Verifique a estrutura da tabela:
--    SELECT * FROM information_schema.COLUMNS 
--    WHERE TABLE_NAME = 'contas_financeiro';
-- ============================================

-- ============================================
-- Exemplo de uso:
-- ============================================
-- INSERT INTO contas_financeiro 
-- (name, status, value, due_date, category, city, bill_type, 
--  recorrente, beneficiario, observations)
-- VALUES 
-- ('Aluguel Escritório', 'pending', 3500.00, '2026-03-15', 
--  'Aluguel', 'São Paulo', 'business', 
--  TRUE, 'Imobiliária XYZ Ltda', 'Aluguel mensal - Vencimento dia 15');
-- ============================================
