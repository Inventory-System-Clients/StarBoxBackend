# 🗄️ Migrations - Fluxo de Caixa

## 📁 Arquivos Disponíveis

### **migration-fluxo-caixa.sql** (PostgreSQL) ✅
Use este arquivo se estiver usando **PostgreSQL**.

**Diferenças do PostgreSQL:**
- Usa `VARCHAR(36)` em vez de `CHAR(36)`
- Usa `TIMESTAMP` em vez de `DATETIME`
- Cria tipo `ENUM` personalizado com `CREATE TYPE`
- Usa `COMMENT ON` para adicionar comentários
- Cria **trigger** para simular `ON UPDATE CURRENT_TIMESTAMP`
- Não usa sintaxe `ENGINE=InnoDB` ou `CHARSET`

### **migration-fluxo-caixa-mysql.sql** (MySQL)
Use este arquivo se estiver usando **MySQL/MariaDB**.

**Diferenças do MySQL:**
- Usa `CHAR(36)` para UUIDs
- Usa `DATETIME` 
- Usa `ENUM()` nativo
- Comentários inline com `COMMENT 'texto'`
- `ON UPDATE CURRENT_TIMESTAMP` nativo
- Especifica `ENGINE=InnoDB` e `CHARSET=utf8mb4`

---

## 🔍 Como Identificar Qual Banco Você Está Usando

Execute no DBeaver/cliente SQL:

**PostgreSQL:**
```sql
SELECT version();
-- Retorna algo como: PostgreSQL 14.x...
```

**MySQL:**
```sql
SELECT VERSION();
-- Retorna algo como: 8.0.x-MySQL...
```

---

## ⚡ Execução

### PostgreSQL
```bash
psql -U seu_usuario -d nome_banco -f migration-fluxo-caixa.sql
```

Ou copie e cole o conteúdo no DBeaver/pgAdmin e execute.

### MySQL
```bash
mysql -u seu_usuario -p nome_banco < migration-fluxo-caixa-mysql.sql
```

Ou copie e cole o conteúdo no DBeaver/MySQL Workbench e execute.

---

## ✅ Verificação Pós-Migration

Ambos os arquivos incluem comandos de verificação no final (em comentários).
Descomente e execute para confirmar que tudo foi criado corretamente.

---

**Data de criação:** 11/03/2026
