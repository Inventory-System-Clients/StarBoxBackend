-- ============================================
-- Adicionar campo de alerta de revisão pendente
-- Data: 10/03/2026
-- Tabela: veiculos
-- ============================================

-- Adicionar coluna alerta_revisao_pendente
ALTER TABLE veiculos 
ADD COLUMN IF NOT EXISTS alerta_revisao_pendente BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN veiculos.alerta_revisao_pendente IS 'Se o veículo tem alerta de revisão não reconhecido pelo usuário';

-- Marcar como pendente os veículos que já precisam de revisão
UPDATE veiculos 
SET alerta_revisao_pendente = TRUE
WHERE km >= proxima_revisao_km AND alerta_revisao_pendente = FALSE;

-- Verificar
SELECT 
  id,
  nome,
  km,
  proxima_revisao_km,
  alerta_revisao_pendente,
  CASE 
    WHEN alerta_revisao_pendente THEN '⚠️ ALERTA ATIVO'
    ELSE '✅ OK'
  END as status
FROM veiculos
ORDER BY alerta_revisao_pendente DESC, nome;
