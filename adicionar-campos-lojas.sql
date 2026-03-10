-- ========================================
-- Adicionar campos NUMERO e BAIRRO na tabela LOJAS
-- Data: 10/03/2026
-- ========================================

-- 1. Adicionar coluna NUMERO (número do endereço)
ALTER TABLE lojas 
ADD COLUMN numero VARCHAR(20);

-- 2. Adicionar coluna BAIRRO
ALTER TABLE lojas 
ADD COLUMN bairro VARCHAR(100);

-- ========================================
-- VERIFICAÇÃO (execute após as alterações acima)
-- ========================================

-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lojas' 
  AND column_name IN ('numero', 'bairro')
ORDER BY column_name;

-- Visualizar estrutura completa da tabela lojas
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lojas'
ORDER BY ordinal_position;
