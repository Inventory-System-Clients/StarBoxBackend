# 🔍 Verificação e Troubleshooting - Sistema de Depósito Principal

## ⚠️ Problema Reportado
Ao adicionar produtos no estoque de uma loja (que não é o depósito), o sistema **não está descontando** automaticamente do estoque da loja principal (depósito).

---

## ✅ Checklist de Verificação

### 1. Verificar se a coluna foi criada no banco de dados

Execute no DBeaver:

```sql
-- Verificar se a coluna existe
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'lojas' 
  AND column_name = 'is_deposito_principal';
```

**Resultado esperado:** 1 linha mostrando a coluna `is_deposito_principal` (BOOLEAN)

**Se não retornar nada:** Execute o arquivo `add-loja-deposito-principal.sql` (PASSO 1)

---

### 2. Verificar se existe uma loja marcada como depósito principal

```sql
-- Ver todas as lojas e qual é o depósito
SELECT 
  id,
  nome,
  cidade,
  is_deposito_principal,
  ativo,
  "createdAt"
FROM lojas
ORDER BY is_deposito_principal DESC;
```

**Resultado esperado:** Pelo menos 1 loja com `is_deposito_principal = TRUE`

**Se não houver nenhuma:** Execute o arquivo `add-loja-deposito-principal.sql` (PASSO 2)

---

### 3. Verificar o estoque atual do depósito principal

```sql
-- Ver estoque da loja principal
SELECT 
  l.nome as "Loja",
  l.is_deposito_principal as "É Depósito?",
  p.nome as "Produto",
  el.quantidade as "Qtd em Estoque"
FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.is_deposito_principal = TRUE
ORDER BY p.nome;
```

**Resultado esperado:** Ver todos os produtos disponíveis no depósito principal

**Se estiver vazio:** O depósito não tem estoque para distribuir

---

### 4. Testar uma movimentação com logs no console

Após executar uma movimentação de entrada em uma loja normal, verifique os logs no terminal do backend.

Você deve ver algo como:

```
📍 Loja destino: Loja Centro, isDepositoPrincipal: false
🏭 Depósito principal encontrado: StarBox Depósito (ID: abc-123)
🏭 [DESCONTO DEPÓSITO] Produto: Rolamento 6203
   - Loja destino: Loja Centro (não é depósito)
   - Quantidade a descontar: 10
   - Estoque atual no depósito: 50
✅ [SUCESSO] Estoque depósito atualizado: 50 → 40
```

---

## 🔧 Soluções para Problemas Comuns

### ⚠️ Problema: Coluna `is_deposito_principal` não existe

**Solução:** Execute a migration SQL

```sql
-- No DBeaver, execute:
ALTER TABLE lojas 
ADD COLUMN is_deposito_principal BOOLEAN DEFAULT FALSE;
```

---

### ⚠️ Problema: Nenhuma loja marcada como depósito

**Solução:** Crie ou marque uma loja existente como depósito

**Opção 1 - Criar nova loja "StarBox Depósito":**

```sql
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
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
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
```

**Opção 2 - Marcar uma loja existente como depósito:**

```sql
-- Ver lojas disponíveis
SELECT id, nome, cidade FROM lojas WHERE ativo = TRUE;

-- Marcar uma loja específica (substitua 'abc-123' pelo ID real)
UPDATE lojas 
SET is_deposito_principal = TRUE 
WHERE id = 'abc-123';
```

⚠️ **IMPORTANTE:** Apenas UMA loja pode ser depósito principal!

---

### ⚠️ Problema: Depósito não tem estoque do produto

**Causa:** Você tentou adicionar um produto na loja, mas o depósito não tem esse produto em estoque.

**Solução:** Adicione estoque no depósito primeiro

```sql
-- Ver qual é o ID do depósito
SELECT id, nome FROM lojas WHERE is_deposito_principal = TRUE;

-- Ver produtos disponíveis
SELECT id, nome, quantidade FROM produtos;

-- Adicionar estoque no depósito (example)
INSERT INTO estoque_lojas ("lojaId", "produtoId", quantidade, "createdAt", "updatedAt")
VALUES (
  'id-do-deposito-aqui',
  'id-do-produto-aqui',
  100,  -- quantidade inicial
  NOW(),
  NOW()
)
ON CONFLICT ("lojaId", "produtoId") 
DO UPDATE SET quantidade = estoque_lojas.quantidade + 100;
```

---

### ⚠️ Problema: Sistema não está descontando

**Verificação:**

1. ✅ Coluna `is_deposito_principal` existe?
2. ✅ Existe uma loja com `is_deposito_principal = TRUE`?
3. ✅ A loja destino é DIFERENTE do depósito?
4. ✅ O tipo da movimentação é `"entrada"`?
5. ✅ O depósito tem o produto em estoque?

**Reinicie o servidor backend:**

```bash
# No terminal do backend
npm run dev
```

O servidor precisa ser reiniciado após mudanças no banco de dados para carregar o modelo atualizado.

---

## 🧪 Teste Completo Passo a Passo

### Cenário: Adicionar 10 rolamentos na "Loja Centro"

**1. Verificar estoque atual:**

```sql
-- Estoque no depósito
SELECT quantidade FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.is_deposito_principal = TRUE 
  AND p.nome = 'Rolamento 6203';
-- Exemplo: 100 unidades

-- Estoque na Loja Centro
SELECT quantidade FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.nome = 'Loja Centro' 
  AND p.nome = 'Rolamento 6203';
-- Exemplo: 20 unidades
```

**2. Fazer movimentação via API (ou frontend):**

```javascript
POST /api/movimentacao-estoque-lojas

{
  "lojaId": "id-da-loja-centro",
  "produtos": [
    {
      "produtoId": "id-do-rolamento",
      "quantidade": 10,
      "tipoMovimentacao": "entrada"
    }
  ],
  "observacao": "Teste de desconto do depósito"
}
```

**3. Verificar resultado esperado:**

```sql
-- Depósito deve ter: 100 - 10 = 90 unidades
SELECT quantidade FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.is_deposito_principal = TRUE 
  AND p.nome = 'Rolamento 6203';

-- Loja Centro deve ter: 20 + 10 = 30 unidades
SELECT quantidade FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.nome = 'Loja Centro' 
  AND p.nome = 'Rolamento 6203';
```

**4. Verificar logs no console do backend:**

Deve aparecer:
```
🏭 [DESCONTO DEPÓSITO] Produto: Rolamento 6203
   - Loja destino: Loja Centro (não é depósito)
   - Quantidade a descontar: 10
   - Estoque atual no depósito: 100
✅ [SUCESSO] Estoque depósito atualizado: 100 → 90
```

---

## 📊 Queries Úteis para Diagnóstico

### Ver todo o estoque de todas as lojas (incluindo depósito):

```sql
SELECT 
  l.nome as "Loja",
  CASE 
    WHEN l.is_deposito_principal = TRUE THEN '🏭 DEPÓSITO'
    ELSE '🏪 Loja'
  END as "Tipo",
  p.nome as "Produto",
  el.quantidade as "Estoque"
FROM estoque_lojas el
JOIN lojas l ON el."lojaId" = l.id
JOIN produtos p ON el."produtoId" = p.id
WHERE l.ativo = TRUE
ORDER BY l.is_deposito_principal DESC, l.nome, p.nome;
```

### Ver últimas movimentações:

```sql
SELECT 
  mel.id,
  mel."dataMovimentacao",
  l.nome as "Loja",
  u.nome as "Usuário",
  mel.observacao,
  p.nome as "Produto",
  melp.quantidade,
  melp."tipoMovimentacao"
FROM movimentacao_estoque_lojas mel
JOIN lojas l ON mel."lojaId" = l.id
LEFT JOIN usuarios u ON mel."usuarioId" = u.id
JOIN movimentacao_estoque_loja_produtos melp ON melp."movimentacaoEstoqueLojaId" = mel.id
JOIN produtos p ON melp."produtoId" = p.id
ORDER BY mel."dataMovimentacao" DESC
LIMIT 20;
```

### Verificar se há múltiplos depósitos (DEVE TER APENAS 1):

```sql
SELECT COUNT(*) as "Total Depósitos"
FROM lojas
WHERE is_deposito_principal = TRUE AND ativo = TRUE;

-- Resultado esperado: 1
-- Se retornar 0: nenhum depósito configurado
-- Se retornar 2+: há múltiplos depósitos (ERRO!)
```

---

## 🆘 Se ainda não funcionar

1. **Certifique-se que o backend foi reiniciado** após executar as migrations
2. **Verifique os logs no console** ao fazer uma movimentação
3. **Execute as queries de verificação** acima para confirmar a configuração
4. **Teste com um produto diferente** para descartar problemas específicos
5. **Verifique se há erros no console do browser** (F12 → Console)

---

## 📞 Informações para Suporte

Se o problema persistir, forneça:

✅ Resultado da query: `SELECT * FROM lojas WHERE is_deposito_principal = TRUE;`
✅ Logs do console do backend ao fazer uma movimentação
✅ ID da loja destino que você está tentando adicionar estoque
✅ ID do produto que está tentando movimentar
✅ Tipo de movimentação (entrada/saída)
