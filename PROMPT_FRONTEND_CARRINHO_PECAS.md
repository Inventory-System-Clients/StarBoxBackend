# 🛒 Implementação do Carrinho de Peças - Frontend

## Objetivo
Permitir que **funcionários** possam pegar e devolver peças do estoque através da **aba "Peças"**, utilizando o sistema de carrinho compartilhado com a **aba "Carrinhos"**.

## 📋 Contexto Técnico

### Tabela do Banco de Dados
- **Tabela**: `carrinho_pecas`
- **Modelo Backend**: `CarrinhoPeca`
- **Campos principais**:
  - `id` (UUID) - Primary Key
  - `usuarioId` (UUID) - FK para usuarios
  - `pecaId` (UUID) - FK para pecas
  - `quantidade` (INTEGER) - Quantidade no carrinho
  - `nomePeca` (STRING) - Nome da peça (cache)

### Funcionalidades Disponíveis
✅ Validação automática de estoque antes de adicionar  
✅ Desconto automático do estoque ao pegar peça  
✅ Devolução automática ao estoque ao remover peça  
✅ Transações atômicas (não permite inconsistências)  
✅ Carrinho compartilhado entre abas "Peças" e "Carrinhos"  

---

## 🔌 Rotas da API

### 1. Listar Peças Disponíveis
```http
GET /api/pecas
Authorization: Bearer {token}
```

**Resposta (200 OK):**
```json
[
  {
    "id": "uuid-da-peca",
    "nome": "Correia Dentada",
    "categoria": "Mecânica",
    "quantidade": 15,
    "descricao": "Correia para motor",
    "preco": 45.00,
    "ativo": true
  }
]
```

---

### 2. Adicionar Peça ao Carrinho (Pegar Peça)
```http
POST /api/pecas/{pecaId}/carrinho
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "quantidade": 2
}
```

**Comportamento:**
- ✅ Adiciona ao carrinho do **usuário logado** automaticamente
- ✅ Valida se há estoque suficiente
- ✅ Desconta do estoque imediatamente
- ✅ Se já existe no carrinho, soma a quantidade

**Resposta (201 Created):**
```json
{
  "id": "uuid-do-item-carrinho",
  "usuarioId": "uuid-do-usuario",
  "pecaId": "uuid-da-peca",
  "quantidade": 2,
  "nomePeca": "Correia Dentada"
}
```

**Erros Possíveis:**
```json
// 400 - Estoque insuficiente
{
  "error": "Estoque insuficiente",
  "disponivel": 1,
  "solicitado": 2
}

// 404 - Peça não encontrada
{
  "error": "Peça não encontrada"
}

// 401 - Não autenticado
{
  "error": "Token inválido ou expirado"
}
```

---

### 3. Remover Peça do Carrinho (Devolver Peça)
```http
DELETE /api/pecas/{pecaId}/carrinho
Authorization: Bearer {token}
```

**Comportamento:**
- ✅ Remove do carrinho do **usuário logado**
- ✅ Devolve a quantidade completa ao estoque

**Resposta (200 OK):**
```json
{
  "success": true
}
```

**Erros Possíveis:**
```json
// 404 - Item não está no carrinho
{
  "error": "Item não encontrado"
}
```

---

### 4. Listar Carrinho do Usuário Logado
```http
GET /api/usuarios/{userId}/carrinho
Authorization: Bearer {token}
```

**Resposta (200 OK):**
```json
[
  {
    "pecaId": "uuid-da-peca",
    "quantidade": 2,
    "nome": "Correia Dentada"
  },
  {
    "pecaId": "uuid-da-peca-2",
    "quantidade": 1,
    "nome": "Filtro de Óleo"
  }
]
```

---

## 🎨 Implementação Sugerida - Aba "Peças"

### Componente: PecasPage.jsx

```javascript
import { useState, useEffect } from 'react';
import api from '../services/api'; // Axios configurado

const PecasPage = () => {
  const [pecas, setPecas] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(false);

  // Buscar peças disponíveis
  useEffect(() => {
    carregarPecas();
    carregarCarrinho();
  }, []);

  const carregarPecas = async () => {
    try {
      const response = await api.get('/pecas');
      setPecas(response.data);
    } catch (error) {
      console.error('Erro ao carregar peças:', error);
    }
  };

  const carregarCarrinho = async () => {
    try {
      const userId = localStorage.getItem('userId'); // ou de onde você pega o userId
      const response = await api.get(`/usuarios/${userId}/carrinho`);
      setCarrinho(response.data);
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
    }
  };

  const adicionarAoCarrinho = async (pecaId, quantidade) => {
    setLoading(true);
    try {
      await api.post(`/pecas/${pecaId}/carrinho`, { quantidade });
      
      // Atualizar UI
      await carregarPecas(); // Re-carrega peças (estoque atualizado)
      await carregarCarrinho(); // Re-carrega carrinho
      
      alert('Peça adicionada ao carrinho com sucesso!');
    } catch (error) {
      if (error.response?.status === 400) {
        alert(`Erro: ${error.response.data.error}\nDisponível: ${error.response.data.disponivel}`);
      } else {
        alert('Erro ao adicionar peça ao carrinho');
      }
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const removerDoCarrinho = async (pecaId) => {
    setLoading(true);
    try {
      await api.delete(`/pecas/${pecaId}/carrinho`);
      
      // Atualizar UI
      await carregarPecas(); // Re-carrega peças (estoque devolvido)
      await carregarCarrinho(); // Re-carrega carrinho
      
      alert('Peça devolvida ao estoque com sucesso!');
    } catch (error) {
      alert('Erro ao remover peça do carrinho');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const pecaEstaNoCarrinho = (pecaId) => {
    return carrinho.find(item => item.pecaId === pecaId);
  };

  return (
    <div className="pecas-page">
      <h1>Peças Disponíveis</h1>
      
      {/* Lista de Peças */}
      <div className="pecas-lista">
        {pecas.map(peca => {
          const noCarrinho = pecaEstaNoCarrinho(peca.id);
          
          return (
            <div key={peca.id} className="peca-card">
              <h3>{peca.nome}</h3>
              <p>Categoria: {peca.categoria}</p>
              <p>Estoque: {peca.quantidade} un.</p>
              <p>Preço: R$ {peca.preco}</p>
              
              {noCarrinho ? (
                <div className="no-carrinho">
                  <span>✓ No carrinho: {noCarrinho.quantidade} un.</span>
                  <button 
                    onClick={() => removerDoCarrinho(peca.id)}
                    disabled={loading}
                  >
                    Devolver ao Estoque
                  </button>
                </div>
              ) : (
                <div className="acao-pegar">
                  <input 
                    type="number" 
                    min="1" 
                    max={peca.quantidade}
                    defaultValue="1"
                    id={`qtd-${peca.id}`}
                  />
                  <button 
                    onClick={() => {
                      const quantidade = parseInt(
                        document.getElementById(`qtd-${peca.id}`).value
                      );
                      adicionarAoCarrinho(peca.id, quantidade);
                    }}
                    disabled={loading || peca.quantidade === 0}
                  >
                    Pegar Peça
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PecasPage;
```

---

## 🔄 Fluxo de Dados

### Ao Pegar Peça (Adicionar ao Carrinho):
1. Frontend envia `POST /api/pecas/{pecaId}/carrinho` com `{quantidade: 2}`
2. Backend valida se há estoque disponível
3. Backend desconta do estoque: `pecas.quantidade -= 2`
4. Backend cria/atualiza registro em `carrinho_pecas`
5. Frontend atualiza lista de peças (mostra estoque reduzido)
6. Frontend atualiza carrinho (mostra novo item)

### Ao Devolver Peça (Remover do Carrinho):
1. Frontend envia `DELETE /api/pecas/{pecaId}/carrinho`
2. Backend busca item no `carrinho_pecas`
3. Backend devolve ao estoque: `pecas.quantidade += item.quantidade`
4. Backend remove registro de `carrinho_pecas`
5. Frontend atualiza lista de peças (mostra estoque aumentado)
6. Frontend atualiza carrinho (remove item)

---

## ✅ Checklist de Implementação

- [ ] Criar botão "Pegar Peça" em cada item da lista de peças
- [ ] Adicionar input para selecionar quantidade (1 a estoque disponível)
- [ ] Implementar função `adicionarAoCarrinho(pecaId, quantidade)`
- [ ] Criar botão "Devolver ao Estoque" para peças no carrinho
- [ ] Implementar função `removerDoCarrinho(pecaId)`
- [ ] Mostrar indicador visual de peças que estão no carrinho
- [ ] Atualizar lista de peças após cada operação (para mostrar estoque atualizado)
- [ ] Adicionar tratamento de erros com mensagens amigáveis
- [ ] Desabilitar botões durante operações (loading state)
- [ ] Validar quantidade máxima = estoque disponível

---

## 🔐 Permissões

- ✅ **FUNCIONARIO**: Pode pegar e devolver peças do **próprio carrinho**
- ✅ **GERENCIADOR**: Pode gerenciar carrinho de **qualquer funcionário**
- ✅ **ADMIN**: Pode gerenciar carrinho de **qualquer usuário**

**Nota**: As rotas `/api/pecas/{pecaId}/carrinho` automaticamente usam o ID do usuário logado extraído do token JWT, então o frontend **não precisa** enviar o `usuarioId` no body.

---

## 🐛 Debug e Logs

O backend já possui logs detalhados no console:
```
[Carrinho] Dados recebidos para adicionar ao carrinho: {...}
[Carrinho] Estoque insuficiente: {...}
[Carrinho] Peça adicionada com sucesso. Estoque atualizado: {...}
[Carrinho] Peça devolvida ao estoque e removida do carrinho: {...}
```

Se houver erros, verifique os logs no Render para identificar o problema.

---

## 📞 Suporte

Em caso de dúvidas ou problemas com as rotas da API, consulte:
- **Controller**: `src/controllers/carrinhoPecaController.js`
- **Rotas**: `src/routes/pecas.routes.js` e `src/routes/carrinhoPeca.routes.js`
- **Modelo**: `src/models/CarrinhoPeca.js`

---

**Data**: 06/03/2026  
**Versão Backend**: Deploy mais recente (commit 09b99bd)  
**Status**: ✅ Pronto para integração frontend
