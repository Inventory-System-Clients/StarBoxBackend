-- Regressao de calculo de valorEsperadoCalculado (PostgreSQL)
-- Regra obrigatoria: valorEsperadoCalculado = baseDelta / valorFicha
-- Prioridade: deltaIn, fallback deltaOut

-- =========================
-- 1) Testes unitarios da formula (A/B/C/D)
-- =========================
WITH cenarios AS (
  SELECT 'A'::text AS cenario, 7000::int AS in_base, 8000::int AS in_atual, NULL::int AS out_base, NULL::int AS out_atual, 2::numeric AS valor_ficha
  UNION ALL
  SELECT 'B', 7000, 8000, NULL, NULL, 5::numeric
  UNION ALL
  SELECT 'C', NULL, NULL, 400::int, 520::int, 2::numeric
  UNION ALL
  SELECT 'D', NULL, NULL, NULL, NULL, 2::numeric
), calc AS (
  SELECT
    cenario,
    in_base,
    in_atual,
    out_base,
    out_atual,
    valor_ficha,
    CASE WHEN in_base IS NOT NULL AND in_atual IS NOT NULL THEN GREATEST(0, in_atual - in_base) END AS delta_in,
    CASE WHEN out_base IS NOT NULL AND out_atual IS NOT NULL THEN GREATEST(0, out_atual - out_base) END AS delta_out
  FROM cenarios
)
SELECT
  cenario,
  delta_in,
  delta_out,
  valor_ficha,
  CASE
    WHEN valor_ficha > 0 AND delta_in IS NOT NULL THEN ROUND((delta_in::numeric / valor_ficha), 2)
    WHEN valor_ficha > 0 AND delta_out IS NOT NULL THEN ROUND((delta_out::numeric / valor_ficha), 2)
    ELSE NULL
  END AS valor_esperado_calculado,
  CASE cenario
    WHEN 'A' THEN 500::numeric
    WHEN 'B' THEN 200::numeric
    WHEN 'C' THEN 60::numeric
    WHEN 'D' THEN NULL::numeric
  END AS esperado
FROM calc
ORDER BY cenario;

-- =========================
-- 2) Auditoria real de uma maquina no banco
-- =========================
-- Substituir :maquina_id por UUID da maquina
WITH fluxos_maquina AS (
  SELECT
    fc.id AS fluxo_id,
    fc.valor_esperado,
    m.id AS movimentacao_id,
    m."maquinaId" AS maquina_id,
    m."dataColeta" AS data_coleta,
    m."createdAt" AS mov_created_at,
    m.contador_in,
    m.contador_out,
    maq."valorFicha"::numeric AS valor_ficha,
    LAG(m.contador_in) OVER (PARTITION BY m."maquinaId" ORDER BY m."dataColeta", m."createdAt") AS in_base,
    LAG(m.contador_out) OVER (PARTITION BY m."maquinaId" ORDER BY m."dataColeta", m."createdAt") AS out_base
  FROM fluxo_caixa fc
  JOIN movimentacoes m ON m.id = fc.movimentacao_id
  JOIN maquinas maq ON maq.id = m."maquinaId"
  WHERE m."maquinaId" = :maquina_id
)
SELECT
  fluxo_id,
  valor_esperado,
  movimentacao_id,
  maquina_id,
  data_coleta,
  contador_in,
  contador_out,
  in_base,
  out_base,
  CASE WHEN contador_in IS NOT NULL AND in_base IS NOT NULL THEN GREATEST(0, contador_in - in_base) END AS delta_in,
  CASE WHEN contador_out IS NOT NULL AND out_base IS NOT NULL THEN GREATEST(0, contador_out - out_base) END AS delta_out,
  valor_ficha,
  CASE
    WHEN valor_ficha > 0 AND contador_in IS NOT NULL AND in_base IS NOT NULL
      THEN ROUND((GREATEST(0, contador_in - in_base)::numeric / valor_ficha), 2)
    WHEN valor_ficha > 0 AND contador_out IS NOT NULL AND out_base IS NOT NULL
      THEN ROUND((GREATEST(0, contador_out - out_base)::numeric / valor_ficha), 2)
    ELSE NULL
  END AS valor_esperado_calculado_regra
FROM fluxos_maquina
ORDER BY data_coleta DESC, mov_created_at DESC;
