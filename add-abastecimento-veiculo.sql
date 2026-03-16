-- =============================================================
-- Migration: Abastecimento de Veículos
-- =============================================================
-- ATENÇÃO: O comando ALTER TYPE não pode rodar dentro de
-- bloco BEGIN/COMMIT no PostgreSQL. Execute cada bloco separado.
-- =============================================================

-- PASSO 1: Adicionar 'abastecimento' ao ENUM do tipo de movimentação
-- Execute este comando sozinho (fora de transação):
ALTER TYPE "enum_movimentacoes_veiculos_tipo" ADD VALUE IF NOT EXISTS 'abastecimento';

-- PASSO 2: Adicionar novas colunas (pode rodar normalmente)
ALTER TABLE movimentacoes_veiculos
  ADD COLUMN IF NOT EXISTS litros DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "roteiroId" UUID REFERENCES roteiros(id) ON DELETE SET NULL;

-- Índice para facilitar listagem por tipo (abastecimento)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_veiculos_tipo
  ON movimentacoes_veiculos(tipo);

-- Índice para busca por roteiroId
CREATE INDEX IF NOT EXISTS idx_movimentacoes_veiculos_roteiroId
  ON movimentacoes_veiculos("roteiroId");
