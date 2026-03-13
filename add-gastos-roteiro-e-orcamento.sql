-- Execute no DBeaver (PostgreSQL)
-- Feature: Gastos diários no executar roteiro + orçamento diário editável pelo admin

-- 0) (Opcional) garantir função gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Adicionar orçamento diário no cadastro de roteiros
ALTER TABLE "Roteiros"
ADD COLUMN IF NOT EXISTS "orcamento_diario" DECIMAL(10,2) NOT NULL DEFAULT 2000.00;

-- 2) Criar tabela de gastos diários do roteiro
CREATE TABLE IF NOT EXISTS gastos_roteiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roteiro_id UUID NOT NULL
    REFERENCES "Roteiros"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  usuario_id UUID NOT NULL
    REFERENCES usuarios(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  categoria VARCHAR(30) NOT NULL
    CHECK (categoria IN ('transporte','estadia','abastecimento','alimentacao','outros')),
  valor DECIMAL(10,2) NOT NULL
    CHECK (valor > 0),
  observacao TEXT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Índices para performance
CREATE INDEX IF NOT EXISTS idx_gastos_roteiro_roteiro_id ON gastos_roteiro(roteiro_id);
CREATE INDEX IF NOT EXISTS idx_gastos_roteiro_usuario_id ON gastos_roteiro(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gastos_roteiro_data_hora ON gastos_roteiro(data_hora);

-- 4) Verificações rápidas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Roteiros'
  AND column_name = 'orcamento_diario';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gastos_roteiro'
ORDER BY ordinal_position;
