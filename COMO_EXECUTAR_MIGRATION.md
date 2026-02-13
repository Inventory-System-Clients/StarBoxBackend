# 🚀 Como Executar a Migration no Render (Produção)

## Método 1: Via Shell do Render (RECOMENDADO)

### Passo 1: Acessar o Shell

1. Acesse: https://dashboard.render.com/
2. Clique no seu serviço `backend-agarramais`
3. Clique na aba **"Shell"** no menu superior
4. Aguarde o terminal carregar

### Passo 2: Executar a Migration

No terminal do Render, execute:

```bash
node run-migration-estoque.js
```

Você verá:

```
🔄 Conectando ao banco de dados...
✅ Conexão estabelecida com sucesso!

📝 Executando migration: create-estoque-lojas.sql
✅ Migration executada com sucesso!

📊 Tabela 'estoque_lojas' criada no banco de dados
✅ Confirmado: Tabela estoque_lojas existe no banco
```

### Passo 3: Verificar

Ainda no shell do Render, verifique se funcionou:

```bash
node -e "import('./src/database/connection.js').then(({sequelize})=>sequelize.query('SELECT COUNT(*) FROM estoque_lojas').then(r=>console.log('Tabela existe:',r[0])).then(()=>process.exit(0)))"
```

## Método 2: Via SQL Direto (Alternativo)

Se preferir executar o SQL manualmente:

### Passo 1: Conectar ao PostgreSQL

1. No Render Dashboard, vá em **Databases**
2. Clique no database `selfmachine`
3. Copie a **External Connection String**

### Passo 2: Executar SQL

Use um cliente PostgreSQL (pgAdmin, DBeaver, etc.) ou o terminal:

```sql
-- Copie e cole este SQL completo:

CREATE TABLE IF NOT EXISTS estoque_lojas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lojaId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    "estoqueMinimo" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_estoque_loja_loja
        FOREIGN KEY ("lojaId")
        REFERENCES lojas(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_estoque_loja_produto
        FOREIGN KEY ("produtoId")
        REFERENCES produtos(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_loja_produto
        UNIQUE ("lojaId", "produtoId")
);

CREATE INDEX IF NOT EXISTS idx_estoque_lojas_loja
    ON estoque_lojas("lojaId");

CREATE INDEX IF NOT EXISTS idx_estoque_lojas_produto
    ON estoque_lojas("produtoId");

COMMENT ON TABLE estoque_lojas IS 'Estoque de produtos no depósito/armazém de cada loja';
COMMENT ON COLUMN estoque_lojas."lojaId" IS 'ID da loja dona do estoque';
COMMENT ON COLUMN estoque_lojas."produtoId" IS 'ID do produto em estoque';
COMMENT ON COLUMN estoque_lojas.quantidade IS 'Quantidade atual em estoque no depósito';
COMMENT ON COLUMN estoque_lojas."estoqueMinimo" IS 'Quantidade mínima para gerar alerta';
```

### Passo 3: Verificar

Execute esta query para confirmar:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'estoque_lojas'
ORDER BY ordinal_position;
```

## Método 3: Via Render Dashboard (Build Command)

### Temporariamente, adicione ao package.json:

```json
{
  "scripts": {
    "migrate": "node run-migration-estoque.js",
    "start": "node run-migration-estoque.js && node src/server.js"
  }
}
```

Isso executará a migration automaticamente na próxima vez que o Render fizer deploy.

⚠️ **Depois de executar uma vez, remova** para não executar toda vez.

## ✅ Como Verificar se Funcionou

### Via API (depois de executar a migration):

```bash
# Teste o endpoint de estoque
curl https://backend-agarramais.onrender.com/api/estoque-lojas/SEU_LOJA_ID

# Se retornar [] (array vazio) = sucesso!
# Se retornar erro = tabela não existe ainda
```

### Via Interface:

1. Acesse sua aplicação frontend
2. Vá em `/lojas/:id/editar`
3. Tente salvar o estoque
4. Se funcionar = migration OK!

## 🐛 Troubleshooting

### Erro: "relation estoque_lojas does not exist"

➡️ A migration não foi executada ainda. Execute via Shell do Render (Método 1)

### Erro: "duplicate key value violates unique constraint"

➡️ Tabela já existe! Tudo OK, pode usar normalmente

### Erro: "permission denied"

➡️ Use o comando via Shell do Render, não localmente

## 📝 Observações

- ✅ Arquivo de migration já foi enviado ao GitHub
- ✅ Render já atualizou com o código novo
- ⏳ Só falta executar a migration no banco de dados
- 🔒 A migration é segura (usa IF NOT EXISTS)
- 🔁 Pode executar várias vezes sem problemas

---

**Status atual:**

- ✅ Código no GitHub
- ✅ Backend deployado no Render
- ⏳ **Pendente: Executar migration no banco**
- ⏳ Depois: Testar endpoints de estoque

**Recomendação:** Use o **Método 1 (Shell do Render)** - é o mais simples e direto!
