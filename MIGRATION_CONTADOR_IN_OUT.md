# Migração: Adicionar Contador IN e OUT

## Data: 2025-12-26

## Descrição

Adiciona os campos `contador_in` e `contador_out` à tabela `movimentacoes` para registrar os valores dos contadores da máquina durante a coleta.

## Como Executar no DBeaver

1. **Abra o DBeaver** e conecte-se ao banco de dados PostgreSQL

2. **Abra o arquivo SQL**:

   - Navegue até: `migrations/add-contador-in-out.sql`
   - Ou copie o conteúdo abaixo

3. **Execute o script**:

   ```sql
   -- Adicionar coluna contador_in
   ALTER TABLE movimentacoes
   ADD COLUMN IF NOT EXISTS contador_in INTEGER;

   -- Adicionar coluna contador_out
   ALTER TABLE movimentacoes
   ADD COLUMN IF NOT EXISTS contador_out INTEGER;

   -- Comentários nas colunas
   COMMENT ON COLUMN movimentacoes.contador_in IS 'Valor do contador IN da máquina';
   COMMENT ON COLUMN movimentacoes.contador_out IS 'Valor do contador OUT da máquina';
   ```

4. **Verificar se funcionou**:

   ```sql
   -- Ver estrutura da tabela
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'movimentacoes'
   AND column_name IN ('contador_in', 'contador_out');
   ```

   Deve retornar:

   ```
   contador_in  | integer | YES
   contador_out | integer | YES
   ```

## Mudanças no Backend

### ✅ 1. Modelo Movimentacao

Adicionados os campos:

- `contadorIn` (INTEGER, nullable)
- `contadorOut` (INTEGER, nullable)

### ✅ 2. Controller - POST /api/movimentacoes

Agora aceita os campos `contadorIn` e `contadorOut` na criação

### ✅ 3. Controller - PUT /api/movimentacoes/:id

Agora aceita os campos `contadorIn` e `contadorOut` na atualização

- Apenas ADMIN ou criador pode editar

### ✅ 4. Controller - GET /api/movimentacoes

Retorna automaticamente os novos campos

### ✅ 5. Middleware verificarAdmin

Já existia em `src/middlewares/auth.js`

## Exemplo de Uso

### Criar movimentação com contadores:

```javascript
POST /api/movimentacoes
{
  "maquinaId": "uuid-da-maquina",
  "totalPre": 50,
  "sairam": 10,
  "abastecidas": 20,
  "fichas": 100,
  "contadorIn": 1500,    // Novo
  "contadorOut": 850,    // Novo
  "observacoes": "Coleta normal"
}
```

### Atualizar contadores:

```javascript
PUT /api/movimentacoes/:id
{
  "fichas": 105,
  "contadorIn": 1550,
  "contadorOut": 875
}
```

## Status

- ✅ Modelo atualizado
- ✅ Controller POST atualizado
- ✅ Controller PUT atualizado
- ✅ Controller GET retorna os campos
- ✅ Migration criada
- ⏳ **PENDENTE: Executar migration no banco de dados**
