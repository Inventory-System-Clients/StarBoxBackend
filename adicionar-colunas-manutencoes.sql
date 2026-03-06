-- =====================================================
-- SQL para adicionar colunas de manutenções no roteiro
-- Execute no DBeaver conectado ao banco de dados
-- Data: 06/03/2026
-- =====================================================

-- 1. Adicionar coluna explicacao_nao_fazer
ALTER TABLE manutencoes 
ADD COLUMN explicacao_nao_fazer VARCHAR(100) NULL 
COMMENT 'Explicação do funcionário de porque não fez a manutenção';

-- 2. Adicionar coluna explicacao_sem_peca
ALTER TABLE manutencoes 
ADD COLUMN explicacao_sem_peca VARCHAR(100) NULL 
COMMENT 'Explicação do funcionário de porque não usou peças';

-- 3. Adicionar coluna verificadoPorId (FK para usuarios)
ALTER TABLE manutencoes 
ADD COLUMN "verificadoPorId" UUID NULL;

-- 4. Adicionar coluna verificadoEm
ALTER TABLE manutencoes 
ADD COLUMN "verificadoEm" TIMESTAMP NULL 
COMMENT 'Data/hora que o funcionário optou por não fazer';

-- 5. Adicionar coluna pecaUsadaId (FK para pecas)
ALTER TABLE manutencoes 
ADD COLUMN "pecaUsadaId" UUID NULL;

-- 6. Adicionar foreign key verificadoPorId -> usuarios
ALTER TABLE manutencoes 
ADD CONSTRAINT fk_manutencoes_verificado_por 
FOREIGN KEY ("verificadoPorId") 
REFERENCES usuarios(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- 7. Adicionar foreign key pecaUsadaId -> pecas
ALTER TABLE manutencoes 
ADD CONSTRAINT fk_manutencoes_peca_usada 
FOREIGN KEY ("pecaUsadaId") 
REFERENCES pecas(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- =====================================================
-- VERIFICAÇÃO: Execute este SELECT para confirmar
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'manutencoes'
  AND column_name IN (
      'explicacao_nao_fazer',
      'explicacao_sem_peca',
      'verificadoPorId',
      'verificadoEm',
      'pecaUsadaId'
  )
ORDER BY ordinal_position;

-- =====================================================
-- ROLLBACK (caso precise desfazer)
-- =====================================================
/*
ALTER TABLE manutencoes DROP CONSTRAINT IF EXISTS fk_manutencoes_peca_usada;
ALTER TABLE manutencoes DROP CONSTRAINT IF EXISTS fk_manutencoes_verificado_por;
ALTER TABLE manutencoes DROP COLUMN IF EXISTS "pecaUsadaId";
ALTER TABLE manutencoes DROP COLUMN IF EXISTS "verificadoEm";
ALTER TABLE manutencoes DROP COLUMN IF EXISTS "verificadoPorId";
ALTER TABLE manutencoes DROP COLUMN IF EXISTS explicacao_sem_peca;
ALTER TABLE manutencoes DROP COLUMN IF EXISTS explicacao_nao_fazer;
*/
