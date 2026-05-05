-- =============================================================
-- FIX: Marcar pontos (lojas) manualmente como FEITO
-- Tabela: movimentacao_status_diario
-- Um ponto é considerado "feito" quando suas máquinas têm concluida = true
-- =============================================================

-- PASSO 1: Ver todos os roteiros ativos hoje com seus pontos e status atual
-- (substitua a data se necessário)
SELECT
  r.id          AS roteiro_id,
  r.nome        AS roteiro_nome,
  l.id          AS loja_id,
  l.nome        AS loja_nome,
  m.id          AS maquina_id,
  m.nome        AS maquina_nome,
  COALESCE(sd.concluida, FALSE) AS concluida,
  sd.data
FROM "Roteiros" r
JOIN "RoteiroLojas" rl ON rl."RoteiroId" = r.id
JOIN lojas l ON l.id = rl."LojaId"
JOIN maquinas m ON m.loja_id = l.id
LEFT JOIN movimentacao_status_diario sd
  ON sd.maquina_id = m.id
  AND sd.roteiro_id = r.id
  AND sd.data = CURRENT_DATE
ORDER BY r.nome, l.nome, m.nome;


-- =============================================================
-- PASSO 2: Marcar TODAS as máquinas de UM roteiro específico como feitas
-- Substitua 'SEU_ROTEIRO_ID_AQUI' pelo ID real do roteiro
-- =============================================================
INSERT INTO movimentacao_status_diario (id, maquina_id, roteiro_id, data, concluida)
SELECT
  gen_random_uuid(),
  m.id,
  r.id,
  CURRENT_DATE,
  TRUE
FROM "Roteiros" r
JOIN "RoteiroLojas" rl ON rl."RoteiroId" = r.id
JOIN maquinas m ON m."lojaId" = rl."LojaId"
WHERE r.id = 'SEU_ROTEIRO_ID_AQUI'
ON CONFLICT (maquina_id, roteiro_id, data)
DO UPDATE SET concluida = TRUE;


-- =============================================================
-- PASSO 3: Marcar máquinas de LOJAS ESPECÍFICAS de um roteiro como feitas
-- Substitua os IDs conforme necessário
-- =============================================================
INSERT INTO movimentacao_status_diario (id, maquina_id, roteiro_id, data, concluida)
SELECT
  gen_random_uuid(),
  m.id,
  'SEU_ROTEIRO_ID_AQUI',
  CURRENT_DATE,
  TRUE
FROM maquinas m
WHERE m.loja_id IN (
  'LOJA_ID_1',
  'LOJA_ID_2',
  'LOJA_ID_3'
  -- adicione mais IDs conforme necessário
)
ON CONFLICT (maquina_id, roteiro_id, data)
DO UPDATE SET concluida = TRUE;


-- =============================================================
-- PASSO 4: Reverter — marcar como NÃO FEITO (se precisar desfazer)
-- =============================================================
UPDATE movimentacao_status_diario
SET concluida = FALSE
WHERE roteiro_id = 'SEU_ROTEIRO_ID_AQUI'
  AND data = CURRENT_DATE;


-- =============================================================
-- PASSO 5: Ver IDs dos roteiros (para encontrar o ID correto)
-- =============================================================
SELECT id, nome, status FROM "Roteiros" ORDER BY nome;


-- =============================================================
-- PASSO 6: Ver IDs das lojas de um roteiro específico
-- =============================================================
SELECT
  l.id   AS loja_id,
  l.nome AS loja_nome
FROM "RoteiroLojas" rl
JOIN lojas l ON l.id = rl."LojaId"
WHERE rl."RoteiroId" = 'SEU_ROTEIRO_ID_AQUI'
ORDER BY l.nome;


-- =============================================================
-- PASSO 7: Marcar TODAS as máquinas que tiveram MOVIMENTO HOJE como feitas
-- Encontra máquinas com movimentação em CURRENT_DATE e marca como concluída
-- =============================================================
INSERT INTO movimentacao_status_diario (id, maquina_id, roteiro_id, data, concluida)
SELECT DISTINCT
  gen_random_uuid(),
  m.id,
  r.id,
  CURRENT_DATE,
  TRUE
FROM movimentacoes mov
JOIN maquinas m ON m.id = mov."maquinaId"
JOIN lojas l ON l.id = m."lojaId"
JOIN "RoteiroLojas" rl ON rl."LojaId" = l.id
JOIN "Roteiros" r ON r.id = rl."RoteiroId"
WHERE DATE(mov."dataColeta") = CURRENT_DATE
ON CONFLICT (maquina_id, roteiro_id, data)
DO UPDATE SET concluida = TRUE;


-- =============================================================
-- PASSO 8: Marcar máquinas com movimento em uma DATA ESPECÍFICA
-- Troque '2026-05-04' pela data desejada
-- =============================================================
INSERT INTO movimentacao_status_diario (id, maquina_id, roteiro_id, data, concluida)
SELECT DISTINCT
  gen_random_uuid(),
  m.id,
  r.id,
  '2026-05-04'::date,   -- <-- troque a data aqui
  TRUE
FROM movimentacoes mov
JOIN maquinas m ON m.id = mov."maquinaId"
JOIN lojas l ON l.id = m."lojaId"
JOIN "RoteiroLojas" rl ON rl."LojaId" = l.id
JOIN "Roteiros" r ON r.id = rl."RoteiroId"
WHERE DATE(mov."dataColeta") = '2026-05-04'::date  -- <-- e aqui também
ON CONFLICT (maquina_id, roteiro_id, data)
DO UPDATE SET concluida = TRUE;


-- =============================================================
-- CONFERIR: Ver máquinas que foram marcadas como feitas hoje
-- =============================================================
SELECT
  sd.maquina_id,
  m.nome AS maquina_nome,
  l.nome AS loja_nome,
  sd.roteiro_id,
  r.nome AS roteiro_nome,
  sd.data,
  sd.concluida
FROM movimentacao_status_diario sd
JOIN maquinas m ON m.id = sd.maquina_id
JOIN lojas l ON l.id = m."lojaId"
JOIN "Roteiros" r ON r.id = sd.roteiro_id
WHERE sd.data = CURRENT_DATE
  AND sd.concluida = TRUE
ORDER BY r.nome, l.nome, m.nome;
