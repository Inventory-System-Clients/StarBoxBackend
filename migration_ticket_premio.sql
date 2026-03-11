-- Migração de apoio ao relatório de Ticket por Prêmio
-- Compatível com PostgreSQL
-- Objetivo: melhorar performance e oferecer uma view pronta para análises de ticket

BEGIN;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_datacoleta_maquina
  ON movimentacoes ("dataColeta", "maquinaId");

CREATE INDEX IF NOT EXISTS idx_movimentacoes_maquina
  ON movimentacoes ("maquinaId");

CREATE INDEX IF NOT EXISTS idx_movimentacao_produtos_movimentacao
  ON movimentacao_produtos ("movimentacaoId");

CREATE OR REPLACE VIEW vw_ticket_premio_diario_maquina AS
SELECT
  maq."lojaId" AS loja_id,
  mov."maquinaId" AS maquina_id,
  DATE(mov."dataColeta") AS dia,
  SUM(
    COALESCE(mov.fichas, 0) * COALESCE(maq."valorFicha", 0) +
    COALESCE(mov.quantidade_notas_entrada, 0) +
    COALESCE(mov.valor_entrada_maquininha_pix, 0)
  ) AS faturamento_bruto,
  SUM(COALESCE(mov.sairam, 0)) AS premios_sairam,
  CASE
    WHEN SUM(COALESCE(mov.sairam, 0)) > 0 THEN
      SUM(
        COALESCE(mov.fichas, 0) * COALESCE(maq."valorFicha", 0) +
        COALESCE(mov.quantidade_notas_entrada, 0) +
        COALESCE(mov.valor_entrada_maquininha_pix, 0)
      ) / SUM(COALESCE(mov.sairam, 0))
    ELSE 0
  END AS ticket_por_premio
FROM movimentacoes mov
INNER JOIN maquinas maq ON maq.id = mov."maquinaId"
GROUP BY
  maq."lojaId",
  mov."maquinaId",
  DATE(mov."dataColeta");

COMMIT;
