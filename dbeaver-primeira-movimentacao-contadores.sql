-- Comandos de apoio para DBeaver (PostgreSQL)
-- Cenário: validar a regra da primeira movimentação com contadores anteriores

-- 1) Verificar se a máquina já possui histórico (antes do teste)
-- Substitua :maquina_id pelo UUID da máquina
SELECT
  m.id,
  m.nome,
  COUNT(mov.id) AS total_movimentacoes
FROM maquinas m
LEFT JOIN movimentacoes mov ON mov."maquinaId" = m.id
WHERE m.id = :maquina_id
GROUP BY m.id, m.nome;

-- 2) Conferir as últimas movimentações da máquina (após o POST)
SELECT
  id,
  "maquinaId",
  "usuarioId",
  "dataColeta",
  contador_in,
  contador_out,
  "totalPre",
  sairam,
  abastecidas,
  "totalPos",
  fichas,
  "valorFaturado",
  "createdAt"
FROM movimentacoes
WHERE "maquinaId" = :maquina_id
ORDER BY "createdAt" DESC
LIMIT 5;

-- 3) Validar se as 2 primeiras movimentações foram criadas no primeiro lançamento
-- Esperado para máquina nova: total_movimentacoes = 2 após o primeiro POST
SELECT
  "maquinaId",
  COUNT(*) AS total_movimentacoes
FROM movimentacoes
WHERE "maquinaId" = :maquina_id
GROUP BY "maquinaId";

-- 4) Conferir diferenças de contadores entre as 2 últimas movimentações
WITH ultimas AS (
  SELECT
    id,
    "maquinaId",
    contador_in,
    contador_out,
    "createdAt",
    ROW_NUMBER() OVER (PARTITION BY "maquinaId" ORDER BY "createdAt" DESC) AS rn
  FROM movimentacoes
  WHERE "maquinaId" = :maquina_id
)
SELECT
  u1.id AS mov_atual_id,
  u2.id AS mov_anterior_id,
  u1.contador_in AS in_atual,
  u2.contador_in AS in_anterior,
  u1.contador_out AS out_atual,
  u2.contador_out AS out_anterior,
  (u1.contador_in - u2.contador_in) AS diff_in,
  (u1.contador_out - u2.contador_out) AS diff_out
FROM ultimas u1
JOIN ultimas u2 ON u1."maquinaId" = u2."maquinaId"
WHERE u1.rn = 1 AND u2.rn = 2;
