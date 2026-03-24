-- Adiciona suporte a quantidade real de peca usada na conclusao de manutencao
-- Banco: PostgreSQL (DBeaver)

ALTER TABLE manutencoes
ADD COLUMN IF NOT EXISTS "quantidadePecaUsada" INTEGER NULL;
