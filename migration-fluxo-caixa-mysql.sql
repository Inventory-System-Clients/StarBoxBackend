-- =====================================================
-- MIGRATION: Adicionar Sistema de Fluxo de Caixa (MySQL)
-- Data: 11/03/2026
-- Descrição: Adiciona campo retirada_dinheiro na tabela
--           movimentacoes e cria tabela fluxo_caixa para
--           controlar retiradas de dinheiro das máquinas
-- =====================================================

-- 1. Adicionar campo retirada_dinheiro na tabela movimentacoes
ALTER TABLE movimentacoes
ADD COLUMN retirada_dinheiro BOOLEAN NOT NULL DEFAULT false
COMMENT 'Indica se é uma retirada de dinheiro que deve aparecer no fluxo de caixa';

-- 2. Criar tabela fluxo_caixa
CREATE TABLE fluxo_caixa (
  id CHAR(36) PRIMARY KEY,
  movimentacaoId CHAR(36) NOT NULL UNIQUE,
  valorRetirado DECIMAL(10, 2) DEFAULT NULL COMMENT 'Valor real de dinheiro retirado/trazido da máquina',
  conferencia ENUM('pendente', 'bateu', 'nao_bateu') NOT NULL DEFAULT 'pendente' COMMENT 'Se o valor retirado bateu com o esperado',
  observacoes TEXT DEFAULT NULL COMMENT 'Observações sobre a conferência',
  conferidoPor CHAR(36) DEFAULT NULL COMMENT 'Usuário que conferiu o valor (admin)',
  dataConferencia DATETIME DEFAULT NULL COMMENT 'Data/hora em que foi conferido',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_fluxo_caixa_movimentacao 
    FOREIGN KEY (movimentacaoId) 
    REFERENCES movimentacoes(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_fluxo_caixa_conferido_por 
    FOREIGN KEY (conferidoPor) 
    REFERENCES usuarios(id) 
    ON DELETE SET NULL,
  
  -- Índices para melhor performance
  INDEX idx_fluxo_caixa_movimentacao (movimentacaoId),
  INDEX idx_fluxo_caixa_conferencia (conferencia),
  INDEX idx_fluxo_caixa_data_conferencia (dataConferencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Controle de fluxo de caixa para retiradas de dinheiro das máquinas';

-- 3. Criar índice no campo retirada_dinheiro para otimizar buscas
CREATE INDEX idx_movimentacoes_retirada_dinheiro 
ON movimentacoes(retirada_dinheiro);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- VERIFICAÇÃO: Execute os comandos abaixo para verificar se a migration foi aplicada corretamente

-- Verificar se a coluna foi adicionada
-- SHOW COLUMNS FROM movimentacoes LIKE 'retirada_dinheiro';

-- Verificar se a tabela foi criada
-- SHOW TABLES LIKE 'fluxo_caixa';

-- Verificar estrutura da tabela fluxo_caixa
-- DESCRIBE fluxo_caixa;

-- Verificar índices
-- SHOW INDEX FROM movimentacoes WHERE Key_name = 'idx_movimentacoes_retirada_dinheiro';
-- SHOW INDEX FROM fluxo_caixa;
