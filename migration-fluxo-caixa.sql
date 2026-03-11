-- =====================================================
-- MIGRATION: Adicionar Sistema de Fluxo de Caixa (PostgreSQL)
-- Data: 11/03/2026
-- Descrição: Adiciona campo retirada_dinheiro na tabela
--           movimentacoes e cria tabela fluxo_caixa para
--           controlar retiradas de dinheiro das máquinas
-- =====================================================

-- 1. Adicionar campo retirada_dinheiro na tabela movimentacoes
ALTER TABLE movimentacoes
ADD COLUMN retirada_dinheiro BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN movimentacoes.retirada_dinheiro IS 'Indica se é uma retirada de dinheiro que deve aparecer no fluxo de caixa';

-- 2. Criar tipo ENUM para conferencia (se ainda não existir)
DO $$ BEGIN
    CREATE TYPE conferencia_status AS ENUM ('pendente', 'bateu', 'nao_bateu');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Criar tabela fluxo_caixa (remove se já existir para garantir tipos corretos)
DROP TABLE IF EXISTS fluxo_caixa CASCADE;

CREATE TABLE fluxo_caixa (
  id UUID PRIMARY KEY,
  movimentacao_id UUID NOT NULL UNIQUE,
  valor_retirado DECIMAL(10, 2) DEFAULT NULL,
  conferencia conferencia_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT DEFAULT NULL,
  conferido_por UUID DEFAULT NULL,
  data_conferencia TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Comentários nas colunas
COMMENT ON TABLE fluxo_caixa IS 'Controle de fluxo de caixa para retiradas de dinheiro das máquinas';
COMMENT ON COLUMN fluxo_caixa.valor_retirado IS 'Valor real de dinheiro retirado/trazido da máquina';
COMMENT ON COLUMN fluxo_caixa.conferencia IS 'Se o valor retirado bateu com o esperado';
COMMENT ON COLUMN fluxo_caixa.observacoes IS 'Observações sobre a conferência';
COMMENT ON COLUMN fluxo_caixa.conferido_por IS 'Usuário que conferiu o valor (admin)';
COMMENT ON COLUMN fluxo_caixa.data_conferencia IS 'Data/hora em que foi conferido';

-- 4. Criar índices para melhor performance
CREATE INDEX idx_fluxo_caixa_movimentacao ON fluxo_caixa(movimentacao_id);
CREATE INDEX idx_fluxo_caixa_conferencia ON fluxo_caixa(conferencia);
CREATE INDEX idx_fluxo_caixa_data_conferencia ON fluxo_caixa(data_conferencia);

-- 5. Criar foreign keys (adicionadas após a criação da tabela)
ALTER TABLE fluxo_caixa
ADD CONSTRAINT fk_fluxo_caixa_movimentacao 
  FOREIGN KEY (movimentacao_id) 
  REFERENCES movimentacoes(id) 
  ON DELETE CASCADE;

ALTER TABLE fluxo_caixa
ADD CONSTRAINT fk_fluxo_caixa_conferido_por 
  FOREIGN KEY (conferido_por) 
  REFERENCES usuarios(id) 
  ON DELETE SET NULL;

-- 6. Criar índice no campo retirada_dinheiro para otimizar buscas
CREATE INDEX idx_movimentacoes_retirada_dinheiro ON movimentacoes(retirada_dinheiro);

-- 7. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_fluxo_caixa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fluxo_caixa_updated_at
    BEFORE UPDATE ON fluxo_caixa
    FOR EACH ROW
    EXECUTE FUNCTION update_fluxo_caixa_updated_at();

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- VERIFICAÇÃO: Execute os comandos abaixo para verificar se a migration foi aplicada corretamente

-- Verificar se a coluna foi adicionada
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'movimentacoes' AND column_name = 'retirada_dinheiro';

-- Verificar se a tabela foi criada
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'fluxo_caixa';

-- Verificar estrutura da tabela fluxo_caixa
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'fluxo_caixa' 
-- ORDER BY ordinal_position;

-- Verificar índices
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'movimentacoes' AND indexname = 'idx_movimentacoes_retirada_dinheiro';

-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'fluxo_caixa';

-- Verificar trigger
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'fluxo_caixa';
