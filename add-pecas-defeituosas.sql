-- =====================================================
-- Pecas defeituosas: pendencias por funcionario + base
-- Banco: PostgreSQL (rodar no DBeaver)
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS pecas_defeituosas_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuarioId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "manutencaoId" UUID NULL REFERENCES manutencoes(id) ON DELETE SET NULL,
  "pecaOriginalId" UUID NULL REFERENCES pecas(id) ON DELETE SET NULL,
  "nomePecaOriginal" VARCHAR(100) NOT NULL,
  "nomePecaDefeituosa" VARCHAR(120) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pecas_defeituosas_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuarioId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "confirmadoPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "manutencaoId" UUID NULL REFERENCES manutencoes(id) ON DELETE SET NULL,
  "pecaOriginalId" UUID NULL REFERENCES pecas(id) ON DELETE SET NULL,
  "nomePecaOriginal" VARCHAR(100) NOT NULL,
  "nomePecaDefeituosa" VARCHAR(120) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  "confirmadoEm" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pecas_def_pend_usuario
  ON pecas_defeituosas_pendentes ("usuarioId");

CREATE INDEX IF NOT EXISTS idx_pecas_def_base_usuario
  ON pecas_defeituosas_base ("usuarioId");

CREATE INDEX IF NOT EXISTS idx_pecas_def_base_confirmado_em
  ON pecas_defeituosas_base ("confirmadoEm");

COMMIT;

-- =====================================================
-- NOTAS
-- 1) Se o banco nao tiver pgcrypto, rode antes:
--    CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- 2) O backend tambem cria as tabelas via sequelize.sync(),
--    mas este script te da controle manual no DBeaver.
-- =====================================================
