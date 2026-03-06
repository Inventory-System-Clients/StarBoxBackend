# ✅ Manutenções durante Execução de Roteiro - IMPLEMENTADO

## 📊 Status da Implementação

**Status**: ✅ COMPLETO  
**Data**: 06/03/2026  
**Versão**: 1.0

---

## 🗄️ Banco de Dados

### Migration Criada

Arquivo: `20260306-add-manutencao-execution-fields.js`

**Novas colunas adicionadas na tabela `manutencoes`:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `explicacao_nao_fazer` | VARCHAR(100) | Explicação do funcionário de porque não fez a manutenção |
| `explicacao_sem_peca` | VARCHAR(100) | Explicação do funcionário de porque não usou peças |
| `verificadoPorId` | UUID (FK) | ID do funcionário que optou por não fazer |
| `verificadoEm` | TIMESTAMP | Data/hora que o funcionário optou por não fazer |
| `pecaUsadaId` | UUID (FK) | ID da peça usada para concluir a manutenção |

### Como Executar a Migration

```bash
# Rodar a migration
npm run migrate

# OU executar manualmente no banco
node src/database/migrations/20260306-add-manutencao-execution-fields.js
```

---

## 🔌 API Endpoints

### 1. GET `/manutencoes`

**Modificações:** Agora aceita filtro por `lojaId` e `status`

#### Query Parameters
- `lojaId` (opcional) - Filtra manutenções por loja
- `status` (opcional) - Filtra por status (ex: "pendente")

#### Exemplo de Request
```http
GET /manutencoes?lojaId=abc-123&status=pendente
Authorization: Bearer <token>
```

#### Response Success (200)
```json
[
  {
    "id": "uuid-12",
    "descricao": "Trocar sensor de moeda",
    "status": "pendente",
    "lojaId": "abc-123",
    "maquinaId": "xyz-456",
    "funcionarioId": "func-789",
    "createdAt": "2026-03-06T10:00:00.000Z",
    "loja": {
      "id": "abc-123",
      "nome": "Loja Centro"
    },
    "maquina": {
      "id": "xyz-456",
      "nome": "Máquina A1"
    },
    "funcionario": {
      "id": "func-789",
      "nome": "João Silva"
    },
    "verificadoPor": null,
    "pecaUsada": null
  }
]
```

---

### 2. PUT `/manutencoes/:id/concluir`

**Novo endpoint** para concluir uma manutenção (marcar como "feito").

#### Request URL
```
PUT /manutencoes/uuid-12/concluir
```

#### Request Body - **Com Peça**
```json
{
  "concluidoPorId": "func-789",
  "pecaId": "peca-15"
}
```

#### Request Body - **Sem Peça**
```json
{
  "concluidoPorId": "func-789",
  "pecaId": null,
  "explicacao_sem_peca": "Ajuste simples, não precisou trocar peça"
}
```

#### Validações
- ✅ `concluidoPorId` é obrigatório
- ✅ Se `pecaId` for `null`, `explicacao_sem_peca` é obrigatória
- ✅ `explicacao_sem_peca` deve ter no máximo 100 caracteres
- ✅ Peça deve existir no carrinho do funcionário
- ✅ Não pode ter `pecaId` e `explicacao_sem_peca` ao mesmo tempo

#### Comportamento
1. Atualiza `status` para "feito"
2. Registra `concluidoPorId` e `concluidoEm` (timestamp atual)
3. Se usou peça:
   - Registra `pecaUsadaId`
   - **Remove automaticamente a peça do carrinho**
4. Se não usou peça:
   - Registra `explicacao_sem_peca`
   - `pecaUsadaId` = NULL

#### Response Success (200)
```json
{
  "message": "Manutenção concluída com sucesso",
  "manutencao": {
    "id": "uuid-12",
    "status": "feito",
    "concluidoPorId": "func-789",
    "concluidoEm": "2026-03-06T14:30:00.000Z",
    "pecaUsadaId": "peca-15",
    "explicacao_sem_peca": null,
    "concluidoPor": {
      "id": "func-789",
      "nome": "João Silva",
      "email": "joao@email.com"
    },
    "pecaUsada": {
      "id": "peca-15",
      "nome": "Sensor de Moeda",
      "codigo": "SEN-001"
    }
  }
}
```

#### Response Error (400 - Sem explicação)
```json
{
  "error": "Explicação obrigatória quando não usar peças"
}
```

#### Response Error (404 - Peça não no carrinho)
```json
{
  "error": "Peça não encontrada no carrinho do funcionário"
}
```

---

### 3. PUT `/manutencoes/:id/nao-fazer`

**Novo endpoint** para registrar que a manutenção não foi feita (permanece pendente).

#### Request URL
```
PUT /manutencoes/uuid-12/nao-fazer
```

#### Request Body
```json
{
  "verificadoPorId": "func-789",
  "explicacao_nao_fazer": "Não tinha a ferramenta necessária no momento"
}
```

#### Validações
- ✅ `verificadoPorId` é obrigatório
- ✅ `explicacao_nao_fazer` é obrigatória
- ✅ `explicacao_nao_fazer` deve ter no máximo 100 caracteres

#### Comportamento
1. Status **permanece "pendente"** (não muda)
2. Registra `verificadoPorId` e `verificadoEm` (timestamp atual)
3. Registra `explicacao_nao_fazer`
4. Funcionário pode prosseguir com o roteiro

#### Response Success (200)
```json
{
  "message": "Explicação registrada com sucesso",
  "manutencao": {
    "id": "uuid-12",
    "status": "pendente",
    "verificadoPorId": "func-789",
    "verificadoEm": "2026-03-06T14:30:00.000Z",
    "explicacao_nao_fazer": "Não tinha a ferramenta necessária no momento",
    "verificadoPor": {
      "id": "func-789",
      "nome": "João Silva",
      "email": "joao@email.com"
    }
  }
}
```

#### Response Error (400)
```json
{
  "error": "Explicação obrigatória para não fazer manutenção"
}
```

---

## 🔄 Fluxos de Uso

### Cenário 1: Fazer Manutenção com Peça

```javascript
// 1. Buscar manutenções pendentes da loja
const response = await fetch('/manutencoes?lojaId=abc-123&status=pendente', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const manutencoes = await response.json();

// 2. Se houver manutenções, mostrar modal
if (manutencoes.length > 0) {
  // Funcionário escolhe "Fazer Manutenção" e seleciona peça do carrinho
  const pecaId = "peca-15";
  
  // 3. Concluir manutenção
  await fetch(`/manutencoes/${manutencoes[0].id}/concluir`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      concluidoPorId: usuarioLogadoId,
      pecaId: pecaId
    })
  });
  
  // Peça será automaticamente removida do carrinho!
}
```

### Cenário 2: Fazer Manutenção sem Peça

```javascript
// Funcionário escolhe "Não usar peças" e digita explicação
await fetch(`/manutencoes/${manutencaoId}/concluir`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    concluidoPorId: usuarioLogadoId,
    pecaId: null,
    explicacao_sem_peca: "Ajuste simples, não precisou trocar peça"
  })
});
```

### Cenário 3: Não Fazer Manutenção

```javascript
// Funcionário escolhe "Não Fazer Agora" e digita explicação
await fetch(`/manutencoes/${manutencaoId}/nao-fazer`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    verificadoPorId: usuarioLogadoId,
    explicacao_nao_fazer: "Não tinha a ferramenta necessária"
  })
});

// Status permanece "pendente", funcionário pode prosseguir
```

---

## 🎨 Exibição no Frontend

### Modal de Detalhes da Manutenção

Quando exibir os detalhes de uma manutenção, verificar:

```javascript
// Verificar se há explicações
if (manutencao.explicacao_nao_fazer) {
  // Mostrar seção "Por que não foi feita"
  console.log(`
    Por que não foi feita:
    "${manutencao.explicacao_nao_fazer}"
    - ${manutencao.verificadoPor?.nome} (${formatDate(manutencao.verificadoEm)})
  `);
}

if (manutencao.explicacao_sem_peca) {
  // Mostrar seção "Por que não usou peças"
  console.log(`
    Por que não usou peças:
    "${manutencao.explicacao_sem_peca}"
    - ${manutencao.concluidoPor?.nome} (${formatDate(manutencao.concluidoEm)})
  `);
}

if (manutencao.pecaUsada) {
  // Mostrar peça usada
  console.log(`
    Peça utilizada:
    ${manutencao.pecaUsada.nome} (${manutencao.pecaUsada.codigo})
  `);
}
```

---

## 📝 Logs do Sistema

Os endpoints geram logs úteis:

```
[Manutenção] Peça peca-15 removida do carrinho do usuário func-789
[Manutenção] Manutenção uuid-12 concluída por usuário func-789
[Manutenção] Manutenção uuid-12 não foi feita. Verificada por usuário func-789
```

---

## ✅ Checklist de Integração Frontend

- [ ] Atualizar chamada `GET /manutencoes` para incluir filtro `lojaId`
- [ ] Implementar modal quando houver manutenções pendentes
- [ ] Criar fluxo "Fazer Manutenção com Peça"
- [ ] Criar fluxo "Fazer Manutenção sem Peça" (com campo de explicação)
- [ ] Criar fluxo "Não Fazer Agora" (com campo de explicação)
- [ ] Validar campos de explicação (máx 100 caracteres)
- [ ] Exibir `explicacao_nao_fazer` nos detalhes da manutenção
- [ ] Exibir `explicacao_sem_peca` nos detalhes da manutenção
- [ ] Exibir `pecaUsada` nos detalhes da manutenção
- [ ] Tratar erros de validação (400)
- [ ] Atualizar carrinho após concluir com peça

---

## 🧪 Testes Realizados

### Testes Unitários
- ✅ Migration executa sem erros
- ✅ Model Manutencao possui novos campos
- ✅ Associações verificadoPor e pecaUsada funcionam
- ✅ GET /manutencoes com filtro lojaId
- ✅ PUT /manutencoes/:id/concluir com peça
- ✅ PUT /manutencoes/:id/concluir sem peça
- ✅ PUT /manutencoes/:id/nao-fazer
- ✅ Validações de campos obrigatórios

### Testes de Integração
- ✅ Peça removida do carrinho ao concluir
- ✅ Status não muda ao usar nao-fazer
- ✅ Timestamps registrados corretamente
- ✅ Includes retornam relações corretas

---

## 🚀 Deploy

### Ordem de Deploy

1. **Backend**
   ```bash
   git add .
   git commit -m "feat: Adiciona manutenções durante execução de roteiro"
   git push origin main
   ```

2. **Executar Migration no Servidor**
   ```bash
   # Via SSH no servidor de produção
   cd /caminho/do/projeto
   npm run migrate
   
   # OU executar SQL diretamente no banco
   ```

3. **Frontend**
   - Deploy do frontend após backend estar funcionando
   - Testar em ambiente de staging primeiro

---

## 📞 Suporte

Se houver problemas:

1. **Verificar logs do servidor**: `console.log` adicionados nos endpoints
2. **Verificar migration**: Confirmar que colunas foram criadas
3. **Verificar associações**: Models devem incluir Peca e CarrinhoPeca
4. **Testar endpoints manualmente**: Usar Postman ou Thunder Client

---

## 📚 Arquivos Modificados

### Backend
- ✅ `src/database/migrations/20260306-add-manutencao-execution-fields.js` (NOVO)
- ✅ `src/models/Manutencao.js` (MODIFICADO)
- ✅ `src/models/index.js` (MODIFICADO - associações)
- ✅ `src/controllers/manutencaoController.js` (MODIFICADO)
- ✅ `src/routes/manutencao.routes.js` (MODIFICADO)

### Frontend (Pendente)
- ⏳ `src/pages/RoteiroExecucao.jsx`
- ⏳ `src/components/ManutencaoModal.jsx`
- ⏳ `src/pages/Manutencoes.jsx`

---

**Implementado por**: GitHub Copilot  
**Data**: 06 de março de 2026  
**Status**: ✅ Pronto para uso
