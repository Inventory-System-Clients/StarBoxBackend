-- ============================================
-- Script para criar LOJA PRINCIPAL (Depósito)
-- Sistema de controle de estoque centralizado
-- Data: 11/03/2026
-- ============================================

-- ============================================
-- PASSO 1: Adicionar campo na tabela lojas
-- ============================================

-- Adicionar coluna 'is_deposito_principal' (marca loja como depósito central)
ALTER TABLE lojas 
ADD COLUMN is_deposito_principal BOOLEAN DEFAULT FALSE 
COMMENT 'Indica se esta loja é o depósito principal que distribui para todas as outras';

-- ============================================
-- PASSO 2: Criar a loja "StarBox depósito"
-- ============================================

-- Inserir loja principal/depósito
INSERT INTO lojas (
  id,
  nome,
  endereco,
  numero,
  bairro,
  cidade,
  estado,
  responsavel,
  telefone,
  ativo,
  is_deposito_principal,
  createdAt,
  updatedAt
) VALUES (
  UUID(),
  'StarBox Depósito',
  'Rua do Depósito Central',
  'S/N',
  'Centro',
  'São Paulo',
  'SP',
  'Administração',
  '(11) 0000-0000',
  TRUE,
  TRUE,
  NOW(),
  NOW()
);

-- ============================================
-- PASSO 3: Verificar se foi criada
-- ============================================

SELECT 
  id,
  nome,
  cidade,
  is_deposito_principal as "É Depósito Principal?",
  ativo,
  createdAt
FROM lojas 
WHERE is_deposito_principal = TRUE;

-- ============================================
-- INFORMAÇÕES IMPORTANTES:
-- ============================================

/**
 * COMO FUNCIONA O SISTEMA:
 * 
 * 1. LOJA PRINCIPAL (StarBox Depósito)
 *    - Flag: is_deposito_principal = TRUE
 *    - Fonte de todo o estoque do sistema
 *    - Não depende de outras lojas
 * 
 * 2. QUANDO ADICIONAR ESTOQUE EM OUTRA LOJA (entrada):
 *    - Sistema automaticamente DESCONTA da loja principal
 *    - Exemplo: +100 unidades em "Loja Centro" → -100 na "StarBox Depósito"
 * 
 * 3. QUANDO ADICIONAR ESTOQUE PARA FUNCIONÁRIO (entrada):
 *    - Sistema automaticamente DESCONTA da loja principal
 *    - Exemplo: +50 unidades para "João Silva" → -50 na "StarBox Depósito"
 * 
 * 4. QUANDO FAZER SAÍDA:
 *    - Saída de loja: apenas registra saída normal
 *    - Saída de funcionário: apenas registra saída normal
 *    - Não afeta loja principal
 */

-- ============================================
-- QUERIES ÚTEIS:
-- ============================================

-- Ver estoque da loja principal:
SELECT 
  l.nome as "Loja",
  p.nome as "Produto",
  el.quantidade as "Qtd em Estoque",
  el."estoqueMinimo" as "Estoque Mínimo"
FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.is_deposito_principal = TRUE
ORDER BY p.nome;

-- Ver todas as lojas e qual é o depósito:
SELECT 
  nome,
  cidade,
  CASE 
    WHEN is_deposito_principal = TRUE THEN '🏭 DEPÓSITO PRINCIPAL'
    ELSE '🏪 Loja Normal'
  END as "Tipo",
  ativo
FROM lojas
ORDER BY is_deposito_principal DESC, nome;

-- Ver movimentações de estoque de todas as lojas:
SELECT 
  l.nome as "Loja",
  u.nome as "Usuário",
  mel.observacao,
  mel."dataMovimentacao",
  p.nome as "Produto",
  melp.quantidade,
  melp."tipoMovimentacao"
FROM movimentacao_estoque_lojas mel
JOIN lojas l ON mel."lojaId" = l.id
JOIN usuarios u ON mel."usuarioId" = u.id
JOIN movimentacao_estoque_loja_produtos melp ON melp."movimentacaoEstoqueLojaId" = mel.id
JOIN produtos p ON melp."produtoId" = p.id
ORDER BY mel."dataMovimentacao" DESC
LIMIT 50;

-- ============================================
-- REGRA DE NEGÓCIO:
-- ============================================

/**
 * APENAS UMA LOJA pode ser marcada como depósito principal.
 * Se precisar mudar, primeiro execute:
 * 
 * UPDATE lojas SET is_deposito_principal = FALSE WHERE is_deposito_principal = TRUE;
 * UPDATE lojas SET is_deposito_principal = TRUE WHERE nome = 'Nova Loja Principal';
 */

-- ============================================
-- Como executar no DBeaver:
-- ============================================
-- 1. Abra o DBeaver e conecte ao seu banco de dados
-- 2. Copie e cole este script na janela SQL
-- 3. Execute PASSO A PASSO (selecione cada bloco e Ctrl+Enter)
-- 4. Verifique se a loja foi criada com a query de verificação
-- ============================================
