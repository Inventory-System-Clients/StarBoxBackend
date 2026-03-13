-- Execute no DBeaver (PostgreSQL)
-- 1) Adiciona coluna de observacao no cadastro de roteiros
ALTER TABLE "Roteiros"
ADD COLUMN IF NOT EXISTS "observacao" TEXT;

-- 2) (Opcional) Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Roteiros'
  AND column_name = 'observacao';

-- 3) (Opcional) Preencher observacao para roteiros antigos sem texto
-- UPDATE "Roteiros"
-- SET "observacao" = 'Sem observações'
-- WHERE "observacao" IS NULL;
