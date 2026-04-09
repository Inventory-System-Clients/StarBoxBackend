-- ============================================
-- Script DBeaver - Bases Secundarias no Dashboard
-- Objetivo: controle informativo de bases secundarias
-- sem qualquer impacto na logica de estoque principal/usuarios
-- Data: 09/04/2026
-- ============================================

-- PostgreSQL: habilitar geracao de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PASSO 1: Criar tabela dedicada e isolada
-- ============================================
CREATE TABLE IF NOT EXISTS bases_secundarias_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_base VARCHAR(120) NOT NULL UNIQUE,
  quantidade_produtos INTEGER NOT NULL DEFAULT 0,
  modelos_produtos TEXT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_bases_secundarias_quantidade_non_negative CHECK (quantidade_produtos >= 0)
);

-- ============================================
-- PASSO 2: (Opcional) Inserir duas bases iniciais
-- ============================================
INSERT INTO bases_secundarias_dashboard (
  nome_base,
  quantidade_produtos,
  modelos_produtos,
  ativo
)
VALUES
  ('Base Secundaria 01', 0, NULL, TRUE),
  ('Base Secundaria 02', 0, NULL, TRUE)
ON CONFLICT (nome_base) DO NOTHING;

-- ============================================
-- PASSO 3: Verificacao
-- ============================================
SELECT
  id,
  nome_base,
  quantidade_produtos,
  modelos_produtos,
  ativo,
  "createdAt",
  "updatedAt"
FROM bases_secundarias_dashboard
WHERE ativo = TRUE
ORDER BY nome_base;

-- ============================================
-- REGRAS DE NEGOCIO (IMPORTANTE)
-- ============================================
-- 1) Esta tabela e APENAS informativa para dashboard.
-- 2) Nao desconta do deposito principal.
-- 3) Nao desconta do estoque de usuarios.
-- 4) Nao altera fluxo atual de estoque_lojas/estoque_usuarios.
-- ============================================
