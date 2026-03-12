# Implementação: Desconto Automático do Depósito Principal

## 🎯 Problema Resolvido

Ao cadastrar quantidade de produtos em lojas que **não são o depósito principal**, o sistema não estava descontando do estoque do depósito principal automaticamente.

## ✅ Solução Implementada

Adicionada lógica de desconto automático do depósito principal em **3 funções** do arquivo `src/controllers/estoqueLojaController.js`:

### 1. `atualizarEstoqueLoja` (PUT /api/estoque-lojas/:lojaId/:produtoId)
### 2. `criarOuAtualizarProdutoEstoque` (POST /api/estoque-lojas/:lojaId/produto)
### 3. `atualizarVariosEstoques` (PUT /api/estoque-lojas/:lojaId/batch)

---

## 🔧 Como Funciona

### Regra de Negócio

**Quando o estoque é aumentado em uma loja NÃO principal:**
- ✅ Busca o depósito principal (loja com `isDepositoPrincipal = true`)
- ✅ Calcula a diferença de quantidade adicionada
- ✅ Desconta essa diferença do estoque do depósito principal
- ⚠️ Se o depósito não tiver estoque suficiente, zera e registra aviso no log

### Condições para Desconto

```javascript
if (
  diferenca > 0 &&                           // Aumentou o estoque
  lojaDepositoPrincipal &&                   // Existe depósito principal
  !loja.isDepositoPrincipal &&               // Loja atual NÃO é o depósito
  lojaDepositoPrincipal.id !== loja.id       // Confirmação extra
) {
  // Desconta do depósito principal
}
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Atualizar Estoque Existente

**Situação:**
- Loja "Filial Centro" tem 10 unidades do Produto A
- Atualiza para 15 unidades
- Diferença: +5 unidades

**Resultado:**
- ✅ Loja "Filial Centro": 10 → 15 unidades
- ✅ Depósito Principal: desconta 5 unidades
- 📝 Logs detalhados no console

### Exemplo 2: Criar Novo Estoque

**Situação:**
- Loja "Filial Norte" não tem registro do Produto B
- Cria com 20 unidades

**Resultado:**
- ✅ Loja "Filial Norte": 0 → 20 unidades (novo registro)
- ✅ Depósito Principal: desconta 20 unidades
- 📝 Logs detalhados no console

### Exemplo 3: Estoque Insuficiente no Depósito

**Situação:**
- Depósito Principal tem apenas 3 unidades do Produto C
- Tenta adicionar 5 unidades na Loja "Filial Sul"

**Resultado:**
- ✅ Loja "Filial Sul": +5 unidades (operação continua)
- ⚠️ Depósito Principal: 3 → 0 unidades (zerado)
- ⚠️ Log de aviso: "Estoque insuficiente no depósito!"

---

## 🔍 Logs Implementados

### Logs de Sucesso

```
🏭 [DESCONTO DEPÓSITO] Produto ID: 42
   - Loja: Filial Centro (não é depósito)
   - Quantidade a descontar: 5
   - Estoque atual no depósito: 100
✅ [SUCESSO] Estoque depósito atualizado: 100 → 95
```

### Logs de Aviso (Estoque Insuficiente)

```
⚠️ [AVISO] Estoque insuficiente no depósito!
   - Disponível: 3
   - Solicitado: 5
   - Operação continuará, mas estoque ficará zerado
```

---

## 📍 Endpoints Afetados

### 1. Atualizar Produto Individual
```http
PUT /api/estoque-lojas/:lojaId/:produtoId
Content-Type: application/json

{
  "quantidade": 50,
  "estoqueMinimo": 10
}
```

### 2. Criar/Atualizar Produto Dashboard
```http
POST /api/estoque-lojas/:lojaId/produto
Content-Type: application/json

{
  "produtoId": 42,
  "quantidade": 30,
  "estoqueMinimo": 5
}
```

### 3. Atualizar Múltiplos Produtos
```http
PUT /api/estoque-lojas/:lojaId/batch
Content-Type: application/json

{
  "estoques": [
    { "produtoId": 1, "quantidade": 20 },
    { "produtoId": 2, "quantidade": 35 },
    { "produtoId": 3, "quantidade": 15 }
  ]
}
```

---

## ⚙️ Configuração Necessária

### Requisito: Loja Depósito Principal

**No banco de dados, deve existir pelo menos UMA loja com:**
```sql
isDepositoPrincipal = true
```

Se não existir depósito principal:
- ⚠️ Nenhuma dedução será feita
- ⚠️ Log: "Nenhum depósito principal encontrado no sistema!"

---

## 🧪 Testando a Implementação

### Passo 1: Verificar Depósito Principal
```sql
SELECT id, nome, isDepositoPrincipal 
FROM lojas 
WHERE isDepositoPrincipal = true;
```

### Passo 2: Verificar Estoque Atual
```sql
SELECT * FROM estoque_loja 
WHERE lojaId = [ID_DEPOSITO_PRINCIPAL] 
AND produtoId = [ID_PRODUTO];
```

### Passo 3: Adicionar Produto em Loja Não Principal
```bash
# Via API
curl -X PUT http://localhost:5001/api/estoque-lojas/[LOJA_ID]/[PRODUTO_ID] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"quantidade": 10}'
```

### Passo 4: Verificar Desconto no Depósito
```sql
-- Deve ter diminuído em 10 unidades
SELECT * FROM estoque_loja 
WHERE lojaId = [ID_DEPOSITO_PRINCIPAL] 
AND produtoId = [ID_PRODUTO];
```

### Passo 5: Verificar Logs no Console
```
🏭 [DESCONTO DEPÓSITO] Produto ID: [ID]
   - Loja: [NOME_LOJA] (não é depósito)
   - Quantidade a descontar: 10
   - Estoque atual no depósito: [QUANTIDADE]
✅ [SUCESSO] Estoque depósito atualizado: [ANTES] → [DEPOIS]
```

---

## 🔐 Comportamento por Função

### `atualizarEstoqueLoja`
- Calcula diferença entre quantidade nova e anterior
- Desconta apenas a diferença (se positiva)
- Se diminuir estoque, NÃO adiciona de volta ao depósito

### `criarOuAtualizarProdutoEstoque`
- Igual à `atualizarEstoqueLoja`
- Usada principalmente pelo Dashboard

### `atualizarVariosEstoques`
- Processa array de produtos
- Aplica mesma lógica para cada produto
- Continua mesmo se houver erro em algum item
- Retorna lista de sucessos e erros

---

## 📝 Observações Importantes

### ✅ O que foi implementado:
- Desconto automático ao **aumentar** estoque em lojas não principais
- Logs detalhados para rastreabilidade
- Tratamento de estoque insuficiente no depósito
- Funciona para criar novo estoque ou atualizar existente

### ❌ O que NÃO foi implementado:
- Devolução ao depósito ao **diminuir** estoque em loja não principal
- Validação de estoque negativo no depósito (usa `Math.max(0, ...)`)
- Bloqueio de operação quando depósito não tem estoque suficiente

### 🎯 Lógica de Negócio:
- Se o depósito não tiver estoque suficiente, a operação **continua**
- O estoque do depósito é zerado (`Math.max(0, quantidade - diferenca)`)
- Log de **aviso** é gerado, mas a transação não é cancelada

---

## 🚀 Próximos Passos

1. ✅ **Testar em desenvolvimento**
2. ✅ **Verificar logs** para garantir funcionamento correto
3. ✅ **Fazer deploy** quando validado
4. 📊 **Monitorar logs** de aviso de estoque insuficiente

---

## 🐛 Troubleshooting

### Problema: Não está descontando do depósito

**Verificar:**
1. Existe loja com `isDepositoPrincipal = true`?
2. A loja que está recebendo estoque tem `isDepositoPrincipal = false`?
3. A quantidade está **aumentando** (não diminuindo)?
4. Verificar logs no console do servidor

### Problema: Estoque do depósito fica negativo

**Resposta:**
- Isso **não deve acontecer** - o código usa `Math.max(0, ...)` para evitar
- Se acontecer, verificar se há outra parte do código alterando estoque

### Problema: Logs não aparecem

**Verificar:**
- Console do servidor está visível?
- Nível de log está configurado para mostrar `console.log`?
- Request está realmente chegando no endpoint correto?

---

**Arquivo modificado:** `src/controllers/estoqueLojaController.js`  
**Data:** 2024  
**Desenvolvedor:** GitHub Copilot
