# Sistema de Estoque de Produtos por Usuário - Documentação Completa

## 📋 Visão Geral

Este documento explica como funciona o sistema de estoque individual por usuário, utilizado para controlar produtos que cada usuário possui em sua responsabilidade. O sistema permite rastreamento completo de entradas e saídas, alertas de estoque mínimo e auditoria de movimentações.

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `estoque_usuarios`

Armazena o estoque atual de cada produto para cada usuário.

```sql
CREATE TABLE estoque_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices
  UNIQUE(usuario_id, produto_id),
  INDEX idx_estoque_usuarios_usuario (usuario_id),
  INDEX idx_estoque_usuarios_produto (produto_id),
  INDEX idx_estoque_usuarios_ativo (ativo)
);
```

**Campos:**
- `id`: Identificador único do registro
- `usuario_id`: Referência ao usuário dono do estoque
- `produto_id`: Referência ao produto
- `quantidade`: Quantidade atual em estoque
- `estoque_minimo`: Limite mínimo para disparar alertas
- `ativo`: Se o registro está ativo (soft delete)
- `created_at`: Data de criação do registro
- `updated_at`: Data da última atualização

**Constraint Única:** Um mesmo usuário não pode ter dois registros para o mesmo produto (`usuario_id + produto_id`).

---

### Tabela: `movimentacoes_estoque_usuarios`

Registra todas as movimentações (entradas e saídas) de produtos no estoque do usuário. Funciona como histórico completo e auditoria.

```sql
CREATE TABLE movimentacoes_estoque_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  lancado_por_id UUID NOT NULL REFERENCES usuarios(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  tipo_movimentacao VARCHAR(10) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER NOT NULL DEFAULT 0,
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  data_movimentacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_movimentacoes_estoque_usuarios_usuario (usuario_id),
  INDEX idx_movimentacoes_estoque_usuarios_lancado (lancado_por_id),
  INDEX idx_movimentacoes_estoque_usuarios_produto (produto_id),
  INDEX idx_movimentacoes_estoque_usuarios_data (data_movimentacao)
);
```

**Campos:**
- `id`: Identificador único da movimentação
- `usuario_id`: Usuário cujo estoque foi movimentado
- `lancado_por_id`: Usuário que realizou a movimentação (quem registrou)
- `produto_id`: Produto movimentado
- `tipo_movimentacao`: Tipo da operação (`'entrada'` ou `'saida'`)
- `quantidade`: Quantidade movimentada
- `quantidade_anterior`: Saldo antes da movimentação
- `quantidade_atual`: Saldo após a movimentação
- `data_movimentacao`: Data/hora da movimentação
- `created_at`: Data de criação do registro
- `updated_at`: Data da última atualização

---

## 🎯 Modelos Sequelize

### Model: EstoqueUsuario

**Arquivo:** `src/models/EstoqueUsuario.js`

```javascript
import { DataTypes } from "sequelize";
import sequelize from "../database/connection.js";

const EstoqueUsuario = sequelize.define(
  "EstoqueUsuario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuario_id",
    },
    produtoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "produto_id",
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "estoque_minimo",
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "estoque_usuarios",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["usuario_id", "produto_id"],
      },
    ],
  }
);

// Associações definidas em src/models/index.js

export default EstoqueUsuario;
```

---

### Model: MovimentacaoEstoqueUsuario

**Arquivo:** `src/models/MovimentacaoEstoqueUsuario.js`

```javascript
import { DataTypes } from "sequelize";
import sequelize from "../database/connection.js";

const MovimentacaoEstoqueUsuario = sequelize.define(
  "MovimentacaoEstoqueUsuario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuario_id",
    },
    lancadoPorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "lancado_por_id",
    },
    produtoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "produto_id",
    },
    tipoMovimentacao: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: "tipo_movimentacao",
      validate: {
        isIn: [["entrada", "saida"]],
      },
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantidadeAnterior: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "quantidade_anterior",
    },
    quantidadeAtual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "quantidade_atual",
    },
    dataMovimentacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "data_movimentacao",
    },
  },
  {
    tableName: "movimentacoes_estoque_usuarios",
    timestamps: true,
    underscored: true,
  }
);

// Associações definidas em src/models/index.js

export default MovimentacaoEstoqueUsuario;
```

---

## 🔗 Relacionamentos

Definidos em `src/models/index.js`:

```javascript
// Usuario -> EstoqueUsuario (1:N)
Usuario.hasMany(EstoqueUsuario, {
  foreignKey: "usuarioId",
  as: "estoquesUsuario",
});
EstoqueUsuario.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
});

// Produto -> EstoqueUsuario (1:N)
Produto.hasMany(EstoqueUsuario, {
  foreignKey: "produtoId",
  as: "estoquesUsuarios",
});
EstoqueUsuario.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "produto",
});

// Usuario -> MovimentacaoEstoqueUsuario (1:N) - Dono do estoque
Usuario.hasMany(MovimentacaoEstoqueUsuario, {
  foreignKey: "usuarioId",
  as: "movimentacoesEstoque",
});
MovimentacaoEstoqueUsuario.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
});

// Usuario -> MovimentacaoEstoqueUsuario (1:N) - Quem lançou
Usuario.hasMany(MovimentacaoEstoqueUsuario, {
  foreignKey: "lancadoPorId",
  as: "movimentacoesEstoqueLancadas",
});
MovimentacaoEstoqueUsuario.belongsTo(Usuario, {
  foreignKey: "lancadoPorId",
  as: "lancadoPor",
});

// Produto -> MovimentacaoEstoqueUsuario (1:N)
Produto.hasMany(MovimentacaoEstoqueUsuario, {
  foreignKey: "produtoId",
  as: "movimentacoesEstoquesUsuarios",
});
MovimentacaoEstoqueUsuario.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "produto",
});
```

---

## 🔐 Sistema de Permissões

### Roles do Sistema

1. **ADMIN**: Acesso total ao sistema
2. **CONTROLADOR_ESTOQUE**: Pode gerenciar estoques de todos os usuários
3. **Usuários normais**: Podem apenas visualizar seu próprio estoque

### Funções de Validação

```javascript
// Verifica se pode gerenciar todos os estoques
const podeGerenciarTodosEstoques = (usuario) => {
  return ["ADMIN", "CONTROLADOR_ESTOQUE"].includes(usuario.role);
};
```

---

## 📡 API Endpoints

### 1. Listar Meu Estoque

**Endpoint:** `GET /api/estoque-usuarios/me`

**Autenticação:** Obrigatória

**Permissões:** Qualquer usuário autenticado

**Descrição:** Retorna o estoque do usuário logado.

**Response:**
```json
[
  {
    "id": "uuid",
    "usuarioId": "uuid",
    "produtoId": "uuid",
    "quantidade": 50,
    "estoqueMinimo": 10,
    "ativo": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-20T15:30:00.000Z",
    "produto": {
      "id": "uuid",
      "nome": "Parafuso M6",
      "codigo": "PAR-M6",
      "emoji": "🔩",
      "estoqueMinimo": 10
    }
  }
]
```

---

### 2. Listar Meus Alertas de Estoque

**Endpoint:** `GET /api/estoque-usuarios/me/alertas`

**Autenticação:** Obrigatória

**Permissões:** Qualquer usuário autenticado

**Descrição:** Retorna produtos do usuário logado que estão abaixo do estoque mínimo.

**Response:**
```json
{
  "alertas": [
    {
      "id": "uuid",
      "usuarioId": "uuid",
      "produtoId": "uuid",
      "quantidade": 3,
      "estoqueMinimo": 10,
      "faltam": 7,
      "produto": {
        "id": "uuid",
        "nome": "Rolamento 6205",
        "codigo": "ROL-6205",
        "emoji": "⚙️"
      }
    }
  ]
}
```

---

### 3. Listar Estoque de um Usuário Específico

**Endpoint:** `GET /api/estoque-usuarios/:usuarioId`

**Autenticação:** Obrigatória

**Permissões:** 
- Próprio usuário pode ver seu estoque
- ADMIN e CONTROLADOR_ESTOQUE podem ver qualquer estoque

**Response:**
```json
[
  {
    "id": "uuid",
    "usuarioId": "uuid",
    "produtoId": "uuid",
    "quantidade": 25,
    "estoqueMinimo": 5,
    "ativo": true,
    "produto": {
      "id": "uuid",
      "nome": "Correia Dentada",
      "codigo": "COR-DEN-200",
      "emoji": "🔗"
    },
    "usuario": {
      "id": "uuid",
      "nome": "João Silva",
      "email": "joao@empresa.com",
      "role": "FUNCIONARIO"
    }
  }
]
```

---

### 4. Listar Alertas de um Usuário

**Endpoint:** `GET /api/estoque-usuarios/:usuarioId/alertas`

**Autenticação:** Obrigatória

**Permissões:** Próprio usuário ou ADMIN/CONTROLADOR_ESTOQUE

**Response:**
```json
{
  "alertas": [
    {
      "id": "uuid",
      "produtoId": "uuid",
      "quantidade": 2,
      "estoqueMinimo": 15,
      "faltam": 13,
      "produto": {
        "nome": "Graxa Lubrificante",
        "codigo": "GRA-LUB-500"
      }
    }
  ]
}
```

---

### 5. Listar Todos os Estoques de Usuários

**Endpoint:** `GET /api/estoque-usuarios/`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Descrição:** Lista todos os estoques de todos os usuários.

**Response:**
```json
[
  {
    "id": "uuid",
    "usuarioId": "uuid",
    "produtoId": "uuid",
    "quantidade": 100,
    "estoqueMinimo": 20,
    "produto": {
      "nome": "Óleo Hidráulico",
      "codigo": "OLE-HID-5L"
    },
    "usuario": {
      "nome": "Maria Santos",
      "email": "maria@empresa.com",
      "role": "FUNCIONARIO"
    }
  }
]
```

---

### 6. Listar Usuários Disponíveis para Estoque

**Endpoint:** `GET /api/estoque-usuarios/usuarios`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Descrição:** Lista todos os usuários ativos que podem ter estoque.

**Response:**
```json
[
  {
    "id": "uuid",
    "nome": "Carlos Oliveira",
    "email": "carlos@empresa.com",
    "role": "FUNCIONARIO",
    "ativo": true
  }
]
```

---

### 7. Listar Movimentações de Estoque de um Usuário

**Endpoint:** `GET /api/estoque-usuarios/movimentacoes?usuarioId=uuid&dataInicio=2025-01-01&dataFim=2025-01-31`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Query Params:**
- `usuarioId` (obrigatório): UUID do usuário
- `dataInicio` (obrigatório): Data inicial no formato `YYYY-MM-DD`
- `dataFim` (obrigatório): Data final no formato `YYYY-MM-DD`

**Descrição:** Lista todas as movimentações de estoque de um usuário em um período. Se algum filtro estiver faltando, retorna array vazio (regra do frontend).

**Response:**
```json
[
  {
    "id": "uuid",
    "usuarioId": "uuid",
    "lancadoPorId": "uuid",
    "produtoId": "uuid",
    "tipoMovimentacao": "entrada",
    "quantidade": 50,
    "quantidadeAnterior": 10,
    "quantidadeAtual": 60,
    "dataMovimentacao": "2025-01-15T14:30:00.000Z",
    "usuario": {
      "id": "uuid",
      "nome": "Pedro Costa",
      "email": "pedro@empresa.com",
      "role": "FUNCIONARIO"
    },
    "lancadoPor": {
      "id": "uuid",
      "nome": "Admin Sistema",
      "email": "admin@empresa.com",
      "role": "ADMIN"
    },
    "produto": {
      "id": "uuid",
      "nome": "Filtro de Ar",
      "codigo": "FIL-AR-200",
      "emoji": "🌬️"
    }
  }
]
```

---

### 8. Criar ou Atualizar Produto no Estoque do Usuário

**Endpoint:** `POST /api/estoque-usuarios/:usuarioId`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Body:**
```json
{
  "produtoId": "uuid",
  "quantidade": 100,
  "estoqueMinimo": 20
}
```

**Descrição:** Cria um novo produto no estoque do usuário ou atualiza se já existir. **IMPORTANTE:** Esta operação NÃO registra no histórico de movimentações.

**Response:**
```json
{
  "message": "Estoque do usuario criado com sucesso",
  "estoque": {
    "id": "uuid",
    "usuarioId": "uuid",
    "produtoId": "uuid",
    "quantidade": 100,
    "estoqueMinimo": 20,
    "produto": {
      "nome": "Corrente Industrial",
      "codigo": "COR-IND-50"
    },
    "usuario": {
      "nome": "Ana Paula",
      "email": "ana@empresa.com"
    }
  }
}
```

---

### 9. Atualizar Produto Específico do Estoque

**Endpoint:** `PUT /api/estoque-usuarios/:usuarioId/:produtoId`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Body:**
```json
{
  "quantidade": 75,
  "estoqueMinimo": 15
}
```

**Descrição:** Atualiza um produto específico no estoque. **IMPORTANTE:** Esta operação NÃO registra no histórico de movimentações.

**Response:**
```json
{
  "message": "Estoque do usuario atualizado com sucesso",
  "estoque": {
    "id": "uuid",
    "usuarioId": "uuid",
    "produtoId": "uuid",
    "quantidade": 75,
    "estoqueMinimo": 15,
    "produto": {
      "nome": "Pneu 195/65 R15"
    }
  }
}
```

---

### 10. Atualizar Vários Estoques de uma Vez

**Endpoint:** `POST /api/estoque-usuarios/:usuarioId/varios` ou `PUT /api/estoque-usuarios/:usuarioId/varios`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Body:**
```json
{
  "estoques": [
    {
      "produtoId": "uuid-1",
      "quantidade": 50,
      "estoqueMinimo": 10
    },
    {
      "produtoId": "uuid-2",
      "quantidade": 30,
      "estoqueMinimo": 5
    }
  ]
}
```

**Descrição:** Atualiza múltiplos produtos de uma vez. Útil para importação ou ajustes em massa.

**Response:**
```json
{
  "message": "2 estoques processados com sucesso",
  "estoques": [
    {
      "id": "uuid-1",
      "usuarioId": "uuid",
      "produtoId": "uuid-produto-1",
      "quantidade": 50,
      "estoqueMinimo": 10
    },
    {
      "id": "uuid-2",
      "usuarioId": "uuid",
      "produtoId": "uuid-produto-2",
      "quantidade": 30,
      "estoqueMinimo": 5
    }
  ],
  "erros": []
}
```

---

### 11. Movimentar Estoque (Entrada/Saída) - **PRINCIPAL**

**Endpoint:** `POST /api/estoque-usuarios/:usuarioId/movimentar`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Descrição:** Esta é a função PRINCIPAL para registrar movimentações. Ela:
- Atualiza o estoque atual
- Registra no histórico de movimentações
- Valida se há quantidade suficiente para saídas
- Suporta múltiplas movimentações em uma única requisição
- Registra quem realizou a operação (`lancadoPorId`)

**Body (movimentação única):**
```json
{
  "produtoId": "uuid",
  "tipoMovimentacao": "entrada",
  "quantidade": 25
}
```

**Body (múltiplas movimentações):**
```json
{
  "movimentacoes": [
    {
      "produtoId": "uuid-1",
      "tipoMovimentacao": "entrada",
      "quantidade": 50
    },
    {
      "produtoId": "uuid-2",
      "tipoMovimentacao": "saida",
      "quantidade": 10
    }
  ]
}
```

**Validações:**
- `tipoMovimentacao` deve ser `"entrada"` ou `"saida"` (case-insensitive)
- `quantidade` deve ser um número maior que zero
- Para `saida`, valida se há quantidade suficiente em estoque
- Se o produto não existir no estoque e for `entrada`, cria automaticamente

**Response:**
```json
{
  "message": "2 movimentacao(oes) registrada(s) com sucesso",
  "movimentacoes": [
    {
      "linha": 1,
      "usuarioId": "uuid",
      "produtoId": "uuid-1",
      "produtoNome": "Filtro de Óleo",
      "tipoMovimentacao": "entrada",
      "quantidade": 50,
      "quantidadeAnterior": 10,
      "quantidadeAtual": 60
    },
    {
      "linha": 2,
      "usuarioId": "uuid",
      "produtoId": "uuid-2",
      "produtoNome": "Vela de Ignição",
      "tipoMovimentacao": "saida",
      "quantidade": 10,
      "quantidadeAnterior": 25,
      "quantidadeAtual": 15
    }
  ]
}
```

**Erro de estoque insuficiente:**
```json
{
  "error": "Linha 2: nao e possivel retirar 10 de Vela de Ignição. Estoque atual: 5"
}
```

---

### 12. Deletar Produto do Estoque

**Endpoint:** `DELETE /api/estoque-usuarios/:usuarioId/:produtoId`

**Autenticação:** Obrigatória

**Permissões:** ADMIN ou CONTROLADOR_ESTOQUE

**Descrição:** Remove completamente um produto do estoque do usuário.

**Response:**
```json
{
  "message": "Estoque removido com sucesso"
}
```

---

## 🔄 Fluxo de Movimentações

### Fluxo Completo de uma Movimentação

```
1. ADMIN/CONTROLADOR_ESTOQUE faz requisição POST para movimentar
   → POST /api/estoque-usuarios/{usuarioId}/movimentar

2. Sistema valida:
   ✓ Usuário existe?
   ✓ Produtos existem?
   ✓ Tipo de movimentação é válido?
   ✓ Quantidade é válida (> 0)?
   ✓ Para SAÍDA: há estoque suficiente?

3. Sistema simula movimentação:
   → Cria um "saldo simulado" para cada produto
   → Aplica todas as movimentações na simulação
   → Valida se alguma saída ficaria negativa

4. Se tudo OK, sistema aplica:
   → Atualiza ou cria registros na tabela estoque_usuarios
   → Cria registros na tabela movimentacoes_estoque_usuarios
   → Registra quem fez a movimentação (lancadoPorId)
   → Registra quantidade_anterior e quantidade_atual

5. Sistema retorna:
   → Lista de movimentações processadas
   → Saldo anterior e atual de cada produto
```

---

## 📊 Sistema de Alertas

### Como Funciona

O sistema de alertas identifica produtos que estão abaixo do estoque mínimo configurado.

**Lógica:**
```javascript
const faltam = estoqueMinimo - quantidade;

if (quantidade < estoqueMinimo) {
  // Produto em alerta
  return {
    id,
    produtoId,
    quantidade,
    estoqueMinimo,
    faltam // Quantos faltam para atingir o mínimo
  };
}
```

**Exemplo:**
- Produto: "Parafuso M8"
- Quantidade atual: 5
- Estoque mínimo: 20
- **Resultado:** ALERTA! Faltam **15 unidades**

### Endpoints de Alertas

1. **Ver meus alertas:** `GET /api/estoque-usuarios/me/alertas`
2. **Ver alertas de outro usuário:** `GET /api/estoque-usuarios/:usuarioId/alertas`

---

## 🎨 Exemplo de Implementação no Frontend

### Listar Estoque do Usuário Logado

```javascript
async function carregarMeuEstoque() {
  try {
    const response = await fetch('/api/estoque-usuarios/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const estoques = await response.json();
    
    estoques.forEach(item => {
      console.log(`${item.produto.emoji} ${item.produto.nome}: ${item.quantidade} un`);
      
      if (item.quantidade < item.estoqueMinimo) {
        const faltam = item.estoqueMinimo - item.quantidade;
        console.warn(`⚠️ ALERTA: Faltam ${faltam} unidades!`);
      }
    });
  } catch (error) {
    console.error('Erro ao carregar estoque:', error);
  }
}
```

---

### Registrar Entrada de Produtos

```javascript
async function registrarEntrada(usuarioId, produtoId, quantidade) {
  try {
    const response = await fetch(`/api/estoque-usuarios/${usuarioId}/movimentar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        produtoId,
        tipoMovimentacao: 'entrada',
        quantidade
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log('✅', result.message);
    return result.movimentacoes[0];
  } catch (error) {
    console.error('❌ Erro ao registrar entrada:', error.message);
    throw error;
  }
}
```

---

### Registrar Saída de Produtos

```javascript
async function registrarSaida(usuarioId, produtoId, quantidade) {
  try {
    const response = await fetch(`/api/estoque-usuarios/${usuarioId}/movimentar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        produtoId,
        tipoMovimentacao: 'saida',
        quantidade
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Erro de estoque insuficiente
      if (error.error.includes('nao e possivel retirar')) {
        alert('Estoque insuficiente!');
      }
      
      throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log('✅', result.message);
    return result.movimentacoes[0];
  } catch (error) {
    console.error('❌ Erro ao registrar saída:', error.message);
    throw error;
  }
}
```

---

### Múltiplas Movimentações de Uma Vez

```javascript
async function registrarVariasMovimentacoes(usuarioId, movimentacoes) {
  try {
    const response = await fetch(`/api/estoque-usuarios/${usuarioId}/movimentar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        movimentacoes: [
          {
            produtoId: 'uuid-1',
            tipoMovimentacao: 'entrada',
            quantidade: 50
          },
          {
            produtoId: 'uuid-2',
            tipoMovimentacao: 'saida',
            quantidade: 10
          },
          {
            produtoId: 'uuid-3',
            tipoMovimentacao: 'entrada',
            quantidade: 25
          }
        ]
      })
    });
    
    const result = await response.json();
    console.log(`✅ ${result.message}`);
    
    result.movimentacoes.forEach(mov => {
      console.log(
        `${mov.produtoNome}: ${mov.quantidadeAnterior} → ${mov.quantidadeAtual}`
      );
    });
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}
```

---

### Listar Histórico de Movimentações

```javascript
async function listarHistorico(usuarioId, dataInicio, dataFim) {
  try {
    const params = new URLSearchParams({
      usuarioId,
      dataInicio, // YYYY-MM-DD
      dataFim     // YYYY-MM-DD
    });
    
    const response = await fetch(
      `/api/estoque-usuarios/movimentacoes?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const movimentacoes = await response.json();
    
    movimentacoes.forEach(mov => {
      const emoji = mov.tipoMovimentacao === 'entrada' ? '📥' : '📤';
      console.log(
        `${emoji} ${mov.produto.nome}: ` +
        `${mov.quantidadeAnterior} → ${mov.quantidadeAtual} ` +
        `(${mov.tipoMovimentacao} de ${mov.quantidade})`
      );
      console.log(`   Lançado por: ${mov.lancadoPor.nome}`);
      console.log(`   Data: ${new Date(mov.dataMovimentacao).toLocaleString()}`);
    });
  } catch (error) {
    console.error('Erro ao listar histórico:', error);
  }
}
```

---

## 🛡️ Middlewares e Segurança

### Autenticação

Todas as rotas requerem o middleware `autenticar` que valida o JWT token.

```javascript
router.get('/me', autenticar, listarMeuEstoqueUsuario);
```

### Autorização

Rotas administrativas requerem roles específicas:

```javascript
router.post(
  '/:usuarioId/movimentar',
  autenticar,
  autorizar(['ADMIN', 'CONTROLADOR_ESTOQUE']),
  movimentarEstoqueUsuario
);
```

### Log de Atividades

Ações importantes são registradas no log do sistema:

```javascript
router.post(
  '/:usuarioId/movimentar',
  autenticar,
  autorizar(['ADMIN', 'CONTROLADOR_ESTOQUE']),
  registrarLog('MOVIMENTAR_ESTOQUE_USUARIO', 'EstoqueUsuario'),
  movimentarEstoqueUsuario
);
```

---

## ⚠️ Diferenças Importantes

### Quando usar cada endpoint?

| Operação | Endpoint | Cria Histórico? | Uso |
|----------|----------|----------------|-----|
| **Movimentar** | `POST /:usuarioId/movimentar` | ✅ SIM | Usar para TODAS as entradas e saídas normais |
| **Criar/Atualizar** | `POST /:usuarioId` | ❌ NÃO | Ajustes iniciais, correções administrativas |
| **Atualizar Produto** | `PUT /:usuarioId/:produtoId` | ❌ NÃO | Alterar estoque mínimo, ajustes diretos |
| **Atualizar Vários** | `POST /:usuarioId/varios` | ❌ NÃO | Importação em massa, inventário |

**REGRA GERAL:** 
- Use **`movimentar`** para operações do dia-a-dia
- Use **`criar/atualizar`** apenas para ajustes administrativos

---

## 📝 Casos de Uso Comuns

### 1. Técnico Recebe Produtos do Almoxarifado

```javascript
// Registrar que o técnico João recebeu 30 parafusos
await registrarEntrada(joaoId, parafusoId, 30);
```

### 2. Técnico Usa Produtos em uma Manutenção

```javascript
// Registrar que o técnico usou 5 parafusos
await registrarSaida(joaoId, parafusoId, 5);
```

### 3. Técnico Devolve Produtos ao Almoxarifado

```javascript
// Técnico devolveu 10 porcas não utilizadas
await registrarSaida(joaoId, porcaId, 10);
```

### 4. Inventário: Ajustar Estoque para Valor Real

```javascript
// Apenas ajustar o valor sem gerar movimentação
await fetch(`/api/estoque-usuarios/${usuarioId}/${produtoId}`, {
  method: 'PUT',
  body: JSON.stringify({ quantidade: 42 })
});
```

### 5. Verificar Alertas Diariamente

```javascript
const { alertas } = await fetch('/api/estoque-usuarios/me/alertas')
  .then(r => r.json());

if (alertas.length > 0) {
  console.log('⚠️ Você tem produtos com estoque baixo:');
  alertas.forEach(a => {
    console.log(`- ${a.produto.nome}: faltam ${a.faltam} unidades`);
  });
}
```

---

## 🚀 Resumo para Replicação

Para implementar este sistema em outro projeto, você precisa:

### 1. Banco de Dados
- Criar tabela `estoque_usuarios`
- Criar tabela `movimentacoes_estoque_usuarios`
- Configurar índices e constraints
- Definir relacionamentos com `usuarios` e `produtos`

### 2. Models
- Criar model `EstoqueUsuario`
- Criar model `MovimentacaoEstoqueUsuario`
- Configurar associações em `models/index.js`

### 3. Controller
- Implementar `estoqueUsuarioController.js` com 12 funções
- Aplicar validações de permissão
- Implementar lógica de simulação para movimentações
- Criar sistema de alertas

### 4. Routes
- Configurar rotas em `estoqueUsuario.routes.js`
- Aplicar middlewares (autenticar, autorizar, registrarLog)
- Registrar rotas no `routes/index.js`

### 5. Frontend
- Criar páginas para visualização de estoque
- Implementar formulários de entrada/saída
- Criar dashboard de alertas
- Implementar histórico de movimentações

---

## 🔧 Tecnologias Utilizadas

- **Node.js** com **Express.js**
- **Sequelize ORM** para manipulação de banco de dados
- **PostgreSQL** como banco de dados
- **JWT** para autenticação
- **ES6 Modules** (import/export)

---

## 📌 Considerações Finais

Este sistema fornece rastreamento completo de estoque individual por usuário com:

✅ Controle total de entradas e saídas  
✅ Histórico completo de movimentações  
✅ Auditoria (quem movimentou, quando, quanto)  
✅ Sistema de alertas de estoque mínimo  
✅ Permissões baseadas em roles  
✅ Validação de estoque insuficiente  
✅ Suporte a movimentações em lote  

---

**Documento gerado em:** 2025-01-15  
**Versão do Sistema:** 1.0  
**Autor:** StarBox Backend Team
