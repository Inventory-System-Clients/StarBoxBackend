# FIX: Erro ao Cadastrar Conta Recorrente

## Problema

Ao tentar cadastrar uma conta recorrente com categoria longa, ocorreu erro:
```
error: value too long for type character varying(50)
```

**Causa:** O campo `category` estava limitado a 50 caracteres, mas algumas categorias têm até 56 caracteres (ex: "DESPESAS EM GERAL (CONDOMINIO,FUNDO DE PROMOÇAO ETC )").

## Solução Implementada

### 1. Backend (Modelo)
✅ Atualizado o modelo [ContasFinanceiro.js](src/models/ContasFinanceiro.js):
- `name`: VARCHAR(255) → VARCHAR(150) (especificado)
- `category`: VARCHAR(50) → VARCHAR(100)
- `city`: VARCHAR(50) → VARCHAR(100)
- `status`: VARCHAR(255) → VARCHAR(50) (especificado)
- `bill_type`: VARCHAR(255) → VARCHAR(50) (especificado)
- `payment_method`: VARCHAR(255) → VARCHAR(50) (especificado)

### 2. Banco de Dados (Migration)

**Arquivo:** [fix-contas-financeiro-category-size.sql](fix-contas-financeiro-category-size.sql)

#### Como Executar no DBeaver

1. **Abrir DBeaver** e conectar ao banco PostgreSQL

2. **Abrir nova SQL Console** (Ctrl+])

3. **Copiar e executar o script:**

```sql
-- Aumentar tamanho dos campos
ALTER TABLE contas_financeiro 
ALTER COLUMN name TYPE VARCHAR(150);

ALTER TABLE contas_financeiro 
ALTER COLUMN category TYPE VARCHAR(100);

ALTER TABLE contas_financeiro 
ALTER COLUMN city TYPE VARCHAR(100);

ALTER TABLE contas_financeiro 
ALTER COLUMN status TYPE VARCHAR(50);

ALTER TABLE contas_financeiro 
ALTER COLUMN bill_type TYPE VARCHAR(50);

ALTER TABLE contas_financeiro 
ALTER COLUMN payment_method TYPE VARCHAR(50);
```

4. **Verificar se funcionou:**

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'contas_financeiro'
AND column_name IN ('name', 'category', 'city', 'status', 'bill_type', 'payment_method')
ORDER BY column_name;
```

**Resultado esperado:**
```
bill_type      | character varying | 50
category       | character varying | 100
city           | character varying | 100
name           | character varying | 150
payment_method | character varying | 50
status         | character varying | 50
```

#### Executar via Terminal (PostgreSQL CLI)

```bash
psql -U seu_usuario -d nome_do_banco -f fix-contas-financeiro-category-size.sql
```

### 3. Reiniciar Backend

Após executar a migration no banco, reinicie o backend para que o Sequelize use a nova definição do modelo.

## Teste

Após aplicar a correção, tente cadastrar novamente a conta recorrente:

```json
{
  "name": "ASSOCIAÇÃO FONSECA",
  "status": "pending",
  "value": 500,
  "due_date": "2026-04-04",
  "category": "DESPESAS EM GERAL (CONDOMINIO,FUNDO DE PROMOÇAO ETC )",
  "city": "SÃO JOSE DO RIO PARDO",
  "bill_type": "company",
  "payment_method": "boleto",
  "recorrente": true,
  "beneficiario": "ASSOCIAÇÃO DOS PROPRIETARIOS E LOJISTAS D",
  "numero": "19 996555378 SILVA"
}
```

✅ Agora deve funcionar sem erros!

## Status

- [x] Atualizar modelo ContasFinanceiro.js
- [x] Criar script SQL de migration
- [ ] Executar migration no banco de dados (DBeaver ou CLI)
- [ ] Reiniciar backend
- [ ] Testar cadastro de conta recorrente

---

**Data:** 12/03/2026  
**Problema:** Erro ao cadastrar conta com categoria longa  
**Causa:** VARCHAR(50) insuficiente  
**Solução:** Aumentado para VARCHAR(100)
