# 🔧 Prompt - Editar e Excluir Peças no Estoque

## 📝 Objetivo
Adicionar funcionalidade de **editar quantidade** e **excluir peça** na aba de peças do sistema.

---

## ✅ Backend (JÁ ESTÁ PRONTO)

### Endpoints Disponíveis:

#### 1. **Editar Peça** (incluindo quantidade)
```
PUT /api/pecas/:id
```
**Body:**
```json
{
  "nome": "Nome da Peça",
  "categoria": "Categoria",
  "quantidade": 150,
  "descricao": "Descrição da peça",
  "preco": 25.50,
  "ativo": true
}
```

#### 2. **Excluir Peça**
```
DELETE /api/pecas/:id
```

### Permissões:
Essas rotas são acessíveis para usuários com os seguintes perfis:
- ADMIN
- GERENCIADOR
- FUNCIONARIO
- FUNCIONARIO_TODAS_LOJAS
- CONTROLADOR_ESTOQUE

---

## 🎨 Implementação Frontend

### 1. Atualizar Tabela de Peças com Botões de Ação

Adicione botões de editar e excluir em cada linha da tabela:

```jsx
function TabelaPecas({ pecas, onAtualizar }) {
  const [pecaEditando, setPecaEditando] = useState(null);
  const [formData, setFormData] = useState({});

  const handleEditar = (peca) => {
    setPecaEditando(peca.id);
    setFormData({
      nome: peca.nome,
      categoria: peca.categoria,
      quantidade: peca.quantidade,
      descricao: peca.descricao || '',
      preco: peca.preco || '',
      ativo: peca.ativo !== false
    });
  };

  const handleSalvar = async (pecaId) => {
    try {
      const response = await fetch(`/api/pecas/${pecaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const pecaAtualizada = await response.json();
        alert('✅ Peça atualizada com sucesso!');
        setPecaEditando(null);
        onAtualizar(); // Recarregar a lista de peças
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar peça:', error);
      alert('❌ Erro ao salvar peça');
    }
  };

  const handleCancelar = () => {
    setPecaEditando(null);
    setFormData({});
  };

  const handleExcluir = async (pecaId, nomePeca) => {
    // Confirmar exclusão
    if (!window.confirm(`Tem certeza que deseja excluir a peça "${nomePeca}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/pecas/${pecaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('✅ Peça excluída com sucesso!');
        onAtualizar(); // Recarregar a lista de peças
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao excluir peça:', error);
      alert('❌ Erro ao excluir peça');
    }
  };

  return (
    <div className="tabela-container">
      <table className="tabela-pecas">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Quantidade</th>
            <th>Preço</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {pecas.map((peca) => (
            <tr key={peca.id}>
              {/* Modo Edição */}
              {pecaEditando === peca.id ? (
                <>
                  <td>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="input-editar"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="input-editar"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})}
                      className="input-editar input-quantidade"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.preco}
                      onChange={(e) => setFormData({...formData, preco: parseFloat(e.target.value) || 0})}
                      className="input-editar"
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <select
                      value={formData.ativo}
                      onChange={(e) => setFormData({...formData, ativo: e.target.value === 'true'})}
                      className="input-editar"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSalvar(peca.id)} 
                      className="btn-salvar-inline"
                      title="Salvar alterações"
                    >
                      ✅
                    </button>
                    <button 
                      onClick={handleCancelar} 
                      className="btn-cancelar-inline"
                      title="Cancelar edição"
                    >
                      ❌
                    </button>
                  </td>
                </>
              ) : (
                /* Modo Visualização */
                <>
                  <td>{peca.nome}</td>
                  <td>{peca.categoria}</td>
                  <td>
                    <span className={`quantidade ${peca.quantidade === 0 ? 'quantidade-zero' : ''}`}>
                      {peca.quantidade}
                    </span>
                  </td>
                  <td>
                    {peca.preco ? `R$ ${parseFloat(peca.preco).toFixed(2)}` : '-'}
                  </td>
                  <td>
                    <span className={`badge ${peca.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {peca.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleEditar(peca)} 
                      className="btn-editar"
                      title="Editar peça"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => handleExcluir(peca.id, peca.nome)} 
                      className="btn-excluir"
                      title="Excluir peça"
                    >
                      🗑️ Excluir
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 2. Modal de Edição (Alternativa mais Completa)

Se preferir um modal em vez de edição inline:

```jsx
function ModalEditarPeca({ peca, onFechar, onSalvar }) {
  const [formData, setFormData] = useState({
    nome: peca.nome,
    categoria: peca.categoria,
    quantidade: peca.quantidade,
    descricao: peca.descricao || '',
    preco: peca.preco || '',
    ativo: peca.ativo !== false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/pecas/${peca.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const pecaAtualizada = await response.json();
        alert('✅ Peça atualizada com sucesso!');
        onSalvar(pecaAtualizada);
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar peça:', error);
      alert('❌ Erro ao salvar peça');
    }
  };

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Editar Peça</h2>
          <button className="btn-fechar" onClick={onFechar}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Categoria *</label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quantidade em Estoque *</label>
                <input
                  type="number"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})}
                  min="0"
                  required
                  className="input-quantidade-destaque"
                />
              </div>

              <div className="form-group">
                <label>Preço Unitário</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.preco}
                  onChange={(e) => setFormData({...formData, preco: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                rows="3"
                placeholder="Descrição opcional da peça..."
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                />
                <span>✅ Peça ativa</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onFechar} className="btn-cancelar">
              Cancelar
            </button>
            <button type="submit" className="btn-salvar">
              💾 Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

Uso do modal:

```jsx
function PaginaPecas() {
  const [pecas, setPecas] = useState([]);
  const [pecaEditando, setPecaEditando] = useState(null);

  const carregarPecas = async () => {
    const response = await fetch('/api/pecas', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setPecas(data);
  };

  const handleExcluir = async (pecaId, nomePeca) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nomePeca}"?`)) {
      return;
    }

    const response = await fetch(`/api/pecas/${pecaId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      alert('✅ Peça excluída!');
      carregarPecas();
    }
  };

  useEffect(() => {
    carregarPecas();
  }, []);

  return (
    <div>
      <h1>📦 Gerenciar Peças</h1>
      
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Quantidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {pecas.map(peca => (
            <tr key={peca.id}>
              <td>{peca.nome}</td>
              <td>{peca.quantidade}</td>
              <td>
                <button onClick={() => setPecaEditando(peca)}>✏️ Editar</button>
                <button onClick={() => handleExcluir(peca.id, peca.nome)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Edição */}
      {pecaEditando && (
        <ModalEditarPeca
          peca={pecaEditando}
          onFechar={() => setPecaEditando(null)}
          onSalvar={() => {
            setPecaEditando(null);
            carregarPecas();
          }}
        />
      )}
    </div>
  );
}
```

---

### 3. CSS Sugerido

```css
/* Botões de ação */
.btn-editar {
  background: #2196F3;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  font-size: 0.9em;
}

.btn-editar:hover {
  background: #1976D2;
}

.btn-excluir {
  background: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-excluir:hover {
  background: #d32f2f;
}

/* Edição inline */
.input-editar {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.input-quantidade {
  width: 80px;
  text-align: center;
  font-weight: bold;
}

.input-quantidade-destaque {
  font-size: 1.2em;
  font-weight: bold;
  text-align: center;
  color: #2196F3;
}

.btn-salvar-inline {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 4px;
  font-size: 1.2em;
}

.btn-cancelar-inline {
  background: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2em;
}

/* Quantidade */
.quantidade {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  background: #e8f5e9;
  color: #2e7d32;
}

.quantidade-zero {
  background: #ffebee;
  color: #c62828;
}

/* Badges de status */
.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: bold;
}

.badge-success {
  background: #4CAF50;
  color: white;
}

.badge-danger {
  background: #f44336;
  color: white;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-group {
  margin-top: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
  margin-right: 8px;
}

.btn-cancelar {
  background: #757575;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-salvar {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-fechar {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #999;
}
```

---

## 📡 Exemplos de Chamadas API

### Editar Peça (Alterar Quantidade)
```javascript
const response = await fetch('/api/pecas/abc-123-uuid', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    nome: "Rolamento 6203",
    categoria: "Rolamentos",
    quantidade: 50,  // ← Nova quantidade
    descricao: "Rolamento de esferas",
    preco: 15.50,
    ativo: true
  })
});

const pecaAtualizada = await response.json();
console.log('Peça atualizada:', pecaAtualizada);
```

### Excluir Peça
```javascript
const response = await fetch('/api/pecas/abc-123-uuid', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.ok) {
  const result = await response.json();
  console.log('Peça excluída:', result); // { success: true }
}
```

---

## ⚠️ Validações Importantes

### 1. Confirmação de Exclusão
Sempre peça confirmação antes de excluir:
```javascript
if (!window.confirm(`Tem certeza que deseja excluir "${peca.nome}"?`)) {
  return;
}
```

### 2. Quantidade Não Pode Ser Negativa
```javascript
<input
  type="number"
  min="0"
  value={quantidade}
  onChange={(e) => {
    const valor = parseInt(e.target.value);
    if (valor >= 0) {
      setQuantidade(valor);
    }
  }}
/>
```

### 3. Tratamento de Erros
```javascript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
    return;
  }
  
  const data = await response.json();
  // Sucesso
} catch (error) {
  console.error('Erro na requisição:', error);
  alert('Erro ao processar requisição');
}
```

---

## 🎯 Resumo Rápido

**Editar Quantidade:**
- Endpoint: `PUT /api/pecas/:id`
- Body: `{ quantidade: 150 }` (e outros campos)
- Permissão: ADMIN, GERENCIADOR, FUNCIONARIO, etc.

**Excluir Peça:**
- Endpoint: `DELETE /api/pecas/:id`
- Permissão: ADMIN, GERENCIADOR, FUNCIONARIO, etc.

**Campos da Peça:**
- `id` (UUID)
- `nome` (string, obrigatório)
- `categoria` (string, obrigatório)
- `quantidade` (número, default 0)
- `descricao` (string, opcional)
- `preco` (decimal, opcional)
- `ativo` (boolean, default true)

---

## ✅ Checklist de Implementação

- [ ] Adicionar botão "Editar" em cada linha da tabela
- [ ] Adicionar botão "Excluir" em cada linha da tabela
- [ ] Implementar modal ou edição inline
- [ ] Criar formulário de edição com campo de quantidade
- [ ] Adicionar confirmação de exclusão
- [ ] Implementar chamada PUT para editar peça
- [ ] Implementar chamada DELETE para excluir peça
- [ ] Adicionar tratamento de erros
- [ ] Recarregar lista de peças após edição/exclusão
- [ ] Adicionar CSS para botões e formulário
- [ ] Testar edição de quantidade
- [ ] Testar exclusão de peça
- [ ] Validar permissões de usuário
