-- PostgreSQL / DBeaver
-- 1) Adiciona coluna para produto predominante na maquina na data da movimentacao
ALTER TABLE movimentacoes
ADD COLUMN IF NOT EXISTS produto_na_maquina_id UUID NULL;

-- 2) Cria FK para produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_movimentacoes_produto_na_maquina'
  ) THEN
    ALTER TABLE movimentacoes
    ADD CONSTRAINT fk_movimentacoes_produto_na_maquina
    FOREIGN KEY (produto_na_maquina_id)
    REFERENCES produtos(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
  END IF;
END$$;

-- 3) Cria indice para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_na_maquina_id
  ON movimentacoes(produto_na_maquina_id);
