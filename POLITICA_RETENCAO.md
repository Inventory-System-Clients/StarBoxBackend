# 📅 Política de Retenção de Dados - 1 Ano

## 🎯 Objetivo

Manter o banco de dados otimizado, armazenando apenas dados dos **últimos 365 dias** e excluindo automaticamente registros mais antigos.

## 📋 O que é excluído?

### Dados excluídos após 1 ano:

- ✅ **Movimentações** (`movimentacoes`) - registros de abastecimento e coleta
- ✅ **Logs de Atividade** (`logs_atividades`) - histórico de ações dos usuários

### Dados mantidos permanentemente:

- 🔒 **Usuários** (`usuarios`)
- 🔒 **Lojas** (`lojas`)
- 🔒 **Máquinas** (`maquinas`)
- 🔒 **Produtos** (`produtos`)

## ⏰ Execução Automática

A limpeza é executada **automaticamente todos os dias às 3h da manhã** em produção.

### Como funciona:

1. O servidor verifica a cada 1 hora se chegou às 3h
2. Quando chegar às 3h, executa a limpeza
3. Deleta registros com `dataColeta` ou `createdAt` anterior a 365 dias atrás
4. Gera logs com estatísticas da limpeza

## 🔧 Endpoints Administrativos

### 1. Verificar dados para limpeza (sem deletar)

```bash
GET /api/admin/verificar-limpeza
Authorization: Bearer <token-admin>
```

**Resposta:**

```json
{
  "dataLimite": "2024-12-23T12:00:00.000Z",
  "movimentacoesParaExcluir": 1234,
  "logsParaExcluir": 5678,
  "totalParaExcluir": 6912
}
```

### 2. Executar limpeza manualmente

```bash
POST /api/admin/limpar-dados-antigos
Authorization: Bearer <token-admin>
```

**Resposta:**

```json
{
  "sucesso": true,
  "dataLimite": "2024-12-23T12:00:00.000Z",
  "movimentacoesExcluidas": 1234,
  "logsExcluidos": 5678,
  "totalExcluido": 6912
}
```

## 🛡️ Segurança

- ✅ Apenas **ADMIN** pode executar essas operações
- ✅ Requer autenticação JWT válida
- ✅ Logs detalhados de cada execução
- ✅ Dry run disponível para verificar antes de deletar

## 📊 Monitoramento

Os logs da limpeza aparecem no console do servidor:

```
🗑️  Iniciando limpeza de dados anteriores a 2024-12-23T03:00:00.000Z
✅ Limpeza concluída:
   - 1234 movimentações excluídas
   - 5678 logs excluídos
   - Total: 6912 registros removidos
```

## ⚙️ Configuração

### Desativar limpeza automática:

Defina `NODE_ENV` como `development` no `.env`:

```env
NODE_ENV=development
```

### Alterar período de retenção:

Edite o arquivo `src/utils/dataRetention.js`:

```javascript
// Alterar de 365 para o número de dias desejado
umAnoAtras.setDate(umAnoAtras.getDate() - 365);
```

### Alterar horário de execução:

Edite o arquivo `src/server.js`:

```javascript
// Alterar de 3 para a hora desejada (0-23)
if (horas === 3) {
```

## 🚀 Testando

### No ambiente de desenvolvimento:

```bash
# 1. Fazer login como admin
curl -X POST https://backend-agarramais.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agarramais.com","senha":"Admin@123"}'

# 2. Verificar dados para limpeza (copie o token do passo 1)
curl https://backend-agarramais.onrender.com/api/admin/verificar-limpeza \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# 3. Executar limpeza manualmente
curl -X POST https://backend-agarramais.onrender.com/api/admin/limpar-dados-antigos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## ⚠️ Importante

- **BACKUP**: Faça backup antes de executar limpezas manuais
- **TESTE**: Use `verificar-limpeza` antes de `limpar-dados-antigos`
- **PRODUÇÃO**: A limpeza automática só roda em `NODE_ENV=production`
- **IRREVERSÍVEL**: Dados excluídos não podem ser recuperados

## 📈 Benefícios

- ⚡ **Performance**: Banco de dados menor = consultas mais rápidas
- 💾 **Economia**: Reduz custos de armazenamento
- 📊 **Manutenção**: Dados sempre relevantes (último ano)
- 🔒 **Conformidade**: Facilita adequação à LGPD/GDPR
