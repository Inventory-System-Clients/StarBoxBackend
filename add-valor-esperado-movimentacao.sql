-- Migration: criar tabela valor_esperado_movimentacao
-- Salva o valor esperado automaticamente no momento da movimentação
-- com lojaId, maquinaId e roteiroId para facilitar filtros nos relatórios

CREATE TABLE IF NOT EXISTS valor_esperado_movimentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL UNIQUE,
  maquina_id UUID NOT NULL,
  loja_id UUID NOT NULL,
  roteiro_id UUID NULL,
  valor_esperado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  data_coleta TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_vem_movimentacao
    FOREIGN KEY (movimentacao_id) REFERENCES movimentacoes(id) ON DELETE CASCADE,

  CONSTRAINT fk_vem_maquina
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE,

  CONSTRAINT fk_vem_loja
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE,

  CONSTRAINT fk_vem_roteiro
    FOREIGN KEY (roteiro_id) REFERENCES roteiros(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vem_loja_data ON valor_esperado_movimentacao(loja_id, data_coleta);
CREATE INDEX IF NOT EXISTS idx_vem_roteiro ON valor_esperado_movimentacao(roteiro_id);
CREATE INDEX IF NOT EXISTS idx_vem_maquina ON valor_esperado_movimentacao(maquina_id);
CREATE INDEX IF NOT EXISTS idx_vem_movimentacao ON valor_esperado_movimentacao(movimentacao_id);
