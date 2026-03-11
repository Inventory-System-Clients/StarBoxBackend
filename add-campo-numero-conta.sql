-- ============================================
-- Script para adicionar campo NÚMERO na tabela contas_financeiro
-- Número do documento/boleto/conta
-- Data: 11/03/2026
-- ============================================

-- ============================================
-- PASSO 1: Adicionar coluna numero
-- ============================================

-- Adicionar coluna 'numero' (número do documento, boleto ou conta)
ALTER TABLE contas_financeiro 
ADD COLUMN numero VARCHAR(100) NULL;

-- ============================================
-- PASSO 2: Verificar se foi criada
-- ============================================

-- Ver estrutura da tabela
SELECT 
  column_name as "Coluna",
  data_type as "Tipo",
  character_maximum_length as "Tamanho",
  is_nullable as "Permite NULL"
FROM information_schema.columns
WHERE table_name = 'contas_financeiro'
  AND column_name = 'numero';

-- ============================================
-- PASSO 3: Ver contas existentes
-- ============================================

SELECT 
  id,
  name as "Nome",
  numero as "Número",
  value as "Valor",
  due_date as "Vencimento",
  beneficiario as "Beneficiário"
FROM contas_financeiro
ORDER BY id DESC
LIMIT 10;

-- ============================================
-- INFORMAÇÕES IMPORTANTES:
-- ============================================

/**
 * CAMPO: numero
 * 
 * Usado para armazenar:
 * - Número do boleto
 * - Número da conta
 * - Número do documento
 * - Código de referência
 * - Qualquer identificador numérico/alfanumérico
 * 
 * Exemplo de valores:
 * - "12345678901234567890" (código de barras boleto)
 * - "001234" (número da conta)
 * - "NF-2026-001" (número da nota fiscal)
 * - "REF-12345" (código de referência)
 */

-- ============================================
-- EXEMPLOS DE ATUALIZAÇÃO:
-- ============================================

-- Atualizar uma conta específica com número:
-- UPDATE contas_financeiro 
-- SET numero = '12345678901234567890'
-- WHERE id = 11;

-- ============================================
-- Como executar no DBeaver:
-- ============================================
-- 1. Abra o DBeaver e conecte ao seu banco de dados
-- 2. Copie e cole este script na janela SQL
-- 3. Execute PASSO A PASSO (selecione cada bloco e Ctrl+Enter)
-- 4. Verifique se a coluna foi criada com a query de verificação
-- ============================================
