# ✏️🗑️ Mini Prompt - Editar e Deletar Contas a Pagar

## 📝 Objetivo
Implementar funcionalidades de **editar** e **deletar** contas a pagar no frontend.

---

## ✅ Backend (JÁ IMPLEMENTADO)

### Endpoints Disponíveis:

#### 1. **Editar Conta**
```http
PUT /api/financeiro/bills/:id
Content-Type: application/json
Authorization: Bearer {token}
```

**Body:**
```json
{
  "name": "Aluguel Escritório - Atualizado",
  "value": 4000.00,
  "due_date": "2026-04-15",
  "category": "Aluguel",
  "city": "São Paulo",
  "status": "pending",
  "bill_type": "business",
  "recorrente": true,
  "beneficiario": "Imobiliária XYZ Ltda",
  "observations": "Aluguel com reajuste anual",
  "payment_method": "pix",
  "payment_details": "11987654321",
  "boleto_em_maos": false
}
```

**Resposta (200 OK):**
```json
{
  "id": 123,
  "name": "Aluguel Escritório - Atualizado",
  "value": "4000.00",
  "due_date": "2026-04-15",
  ...
}
```

#### 2. **Deletar Conta**
```http
DELETE /api/financeiro/bills/:id
Authorization: Bearer {token}
```

**Resposta (200 OK):**
```json
{
  "success": true
}
```

---

## 🎨 Implementação Frontend

### 1. Função para Editar Conta

```jsx
function PaginaContas() {
  const [contas, setContas] = useState([]);
  const [contaEditando, setContaEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const token = localStorage.getItem('token');

  // Abrir formulário para edição
  const editarConta = (conta) => {
    setContaEditando(conta);
    setMostrarFormulario(true);
  };

  // Abrir formulário para nova conta
  const novaConta = () => {
    setContaEditando(null);
    setMostrarFormulario(true);
  };

  // Salvar conta (CREATE ou UPDATE)
  const salvarConta = async (formData) => {
    try {
      const isEdicao = formData.id;
      const url = isEdicao 
        ? `/api/financeiro/bills/${formData.id}`
        : '/api/financeiro/bills';
      
      const method = isEdicao ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const contaSalva = await response.json();
        
        if (isEdicao) {
          // Atualizar lista de contas
          setContas(contas.map(c => c.id === contaSalva.id ? contaSalva : c));
          alert('✅ Conta atualizada com sucesso!');
        } else {
          // Adicionar nova conta
          setContas([...contas, contaSalva]);
          alert('✅ Conta criada com sucesso!');
        }

        setMostrarFormulario(false);
        setContaEditando(null);
      } else {
        const erro = await response.json();
        alert(`❌ Erro ao salvar: ${erro.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      alert('❌ Erro ao salvar conta');
    }
  };

  const cancelarEdicao = () => {
    setMostrarFormulario(false);
    setContaEditando(null);
  };

  return (
    <div className="pagina-contas">
      <div className="header-contas">
        <h1>💰 Contas a Pagar</h1>
        <button onClick={novaConta} className="btn-nova-conta">
          ➕ Nova Conta
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioConta 
          conta={contaEditando}
          onSalvar={salvarConta}
          onCancelar={cancelarEdicao}
        />
      )}

      <TabelaContas 
        contas={contas}
        onEditar={editarConta}
        onDeletar={deletarConta}
        onVerDetalhes={verDetalhes}
      />
    </div>
  );
}
```

---

### 2. Função para Deletar Conta

```jsx
function PaginaContas() {
  // ... código anterior

  const deletarConta = async (contaId) => {
    // Confirmação antes de deletar
    const conta = contas.find(c => c.id === contaId);
    const confirmar = window.confirm(
      `⚠️ Tem certeza que deseja excluir a conta "${conta?.name}"?\n\n` +
      `Valor: R$ ${parseFloat(conta?.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `Vencimento: ${new Date(conta?.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}\n\n` +
      `Esta ação não pode ser desfeita!`
    );

    if (!confirmar) return;

    try {
      const response = await fetch(`/api/financeiro/bills/${contaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remover conta da lista
        setContas(contas.filter(c => c.id !== contaId));
        alert('✅ Conta excluída com sucesso!');
      } else {
        const erro = await response.json();
        alert(`❌ Erro ao excluir: ${erro.error}`);
      }
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      alert('❌ Erro ao excluir conta');
    }
  };

  // ... resto do código
}
```

---

### 3. Formulário de Cadastro/Edição (Adaptado)

```jsx
function FormularioConta({ conta, onSalvar, onCancelar }) {
  const isEdicao = !!conta?.id;

  const [formData, setFormData] = useState({
    id: conta?.id || null,
    name: conta?.name || '',
    value: conta?.value || '',
    due_date: conta?.due_date || '',
    category: conta?.category || '',
    city: conta?.city || '',
    status: conta?.status || 'pending',
    bill_type: conta?.bill_type || 'business',
    payment_method: conta?.payment_method || 'boleto',
    payment_details: conta?.payment_details || '',
    boleto_em_maos: conta?.boleto_em_maos || false,
    observations: conta?.observations || '',
    recorrente: conta?.recorrente || false,
    beneficiario: conta?.beneficiario || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.name.trim()) {
      alert('⚠️ Digite o nome da conta');
      return;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      alert('⚠️ Digite um valor válido');
      return;
    }
    if (!formData.due_date) {
      alert('⚠️ Selecione a data de vencimento');
      return;
    }

    onSalvar(formData);
  };

  return (
    <div className="formulario-container">
      <div className="formulario-header">
        <h2>{isEdicao ? '✏️ Editar Conta' : '➕ Nova Conta'}</h2>
        <button className="btn-fechar-form" onClick={onCancelar}>✕</button>
      </div>

      <form onSubmit={handleSubmit} className="form-conta">
        {/* Campos do formulário... (mesmo código anterior) */}
        
        <div className="form-group">
          <label>Nome da Conta *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Valor *</label>
            <input
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({...formData, value: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Data de Vencimento *</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Beneficiário</label>
          <input
            type="text"
            value={formData.beneficiario}
            onChange={(e) => setFormData({...formData, beneficiario: e.target.value})}
            placeholder="Ex: Imobiliária XYZ Ltda"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Categoria</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="">Selecione...</option>
              <option value="Aluguel">Aluguel</option>
              <option value="Energia">Energia</option>
              <option value="Água">Água</option>
              <option value="Internet">Internet</option>
              <option value="Telefone">Telefone</option>
              <option value="Salários">Salários</option>
              <option value="Fornecedores">Fornecedores</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="form-group">
            <label>Cidade</label>
            <select
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            >
              <option value="">Selecione...</option>
              <option value="São Paulo">São Paulo</option>
              <option value="Rio de Janeiro">Rio de Janeiro</option>
            </select>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.recorrente}
              onChange={(e) => setFormData({...formData, recorrente: e.target.checked})}
            />
            <span className="checkbox-text">
              🔁 Conta recorrente (repete todo mês na mesma data)
            </span>
          </label>
        </div>

        <div className="form-group">
          <label>Observações</label>
          <textarea
            value={formData.observations}
            onChange={(e) => setFormData({...formData, observations: e.target.value})}
            rows="3"
            placeholder="Informações adicionais sobre a conta..."
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancelar} className="btn-cancelar">
            Cancelar
          </button>
          <button type="submit" className="btn-salvar">
            {isEdicao ? '✅ Atualizar' : '💾 Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

### 4. Tabela com Botões de Editar e Deletar

```jsx
function TabelaContas({ contas, onEditar, onDeletar, onVerDetalhes }) {
  return (
    <table className="tabela-contas">
      <thead>
        <tr>
          <th>Nome da Conta</th>
          <th>Beneficiário</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {contas.length === 0 ? (
          <tr>
            <td colSpan="6" className="sem-dados">
              Nenhuma conta cadastrada
            </td>
          </tr>
        ) : (
          contas.map((conta) => (
            <tr key={conta.id}>
              <td>
                <button 
                  className="btn-link-conta"
                  onClick={() => onVerDetalhes(conta)}
                  title="Clique para ver todos os detalhes"
                >
                  {conta.name}
                </button>
                {conta.recorrente && (
                  <span className="badge badge-recorrente" title="Conta recorrente mensal">
                    🔁 Mensal
                  </span>
                )}
              </td>
              <td>
                {conta.beneficiario ? (
                  <span className="beneficiario">{conta.beneficiario}</span>
                ) : (
                  <span className="sem-beneficiario">-</span>
                )}
              </td>
              <td className="valor">
                R$ {parseFloat(conta.value || 0).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })}
              </td>
              <td>
                {new Date(conta.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </td>
              <td>
                <span className={`status-badge status-${conta.status}`}>
                  {conta.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                </span>
              </td>
              <td className="acoes">
                <button 
                  onClick={() => onVerDetalhes(conta)} 
                  className="btn-acao btn-ver"
                  title="Ver detalhes"
                >
                  👁️
                </button>
                <button 
                  onClick={() => onEditar(conta)} 
                  className="btn-acao btn-editar"
                  title="Editar"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => onDeletar(conta.id)} 
                  className="btn-acao btn-deletar"
                  title="Excluir"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
```

---

## 🎨 Estilos CSS Adicionais

```css
/* Header da Página */
.header-contas {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-nova-conta {
  background: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-nova-conta:hover {
  background: #45a049;
}

/* Container do Formulário */
.formulario-container {
  background: white;
  border-radius: 8px;
  padding: 0;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.formulario-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #eee;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.formulario-header h2 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.btn-fechar-form {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
}

.btn-fechar-form:hover {
  color: #333;
}

.form-conta {
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

/* Botões de Ação na Tabela */
.acoes {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-acao {
  background: none;
  border: 2px solid #ddd;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-ver {
  border-color: #2196f3;
  color: #2196f3;
}

.btn-ver:hover {
  background: #2196f3;
  color: white;
}

.btn-editar {
  border-color: #ff9800;
  color: #ff9800;
}

.btn-editar:hover {
  background: #ff9800;
  color: white;
}

.btn-deletar {
  border-color: #f44336;
  color: #f44336;
}

.btn-deletar:hover {
  background: #f44336;
  color: white;
}

/* Botões de Ação do Formulário */
.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #eee;
}

.btn-cancelar {
  background: #9e9e9e;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-cancelar:hover {
  background: #757575;
}

.btn-salvar {
  background: #4caf50;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-salvar:hover {
  background: #45a049;
}

/* Mensagem de tabela vazia */
.sem-dados {
  text-align: center;
  padding: 40px;
  color: #999;
  font-style: italic;
}

/* Form Group */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4caf50;
}
```

---

## 📊 Fluxo Completo de Uso

### 1. **Criar Nova Conta**
```
Usuário clica em "➕ Nova Conta"
  ↓
Formulário abre vazio
  ↓
Preenche dados e clica em "💾 Salvar"
  ↓
POST /api/financeiro/bills
  ↓
Conta aparece na tabela
```

### 2. **Editar Conta Existente**
```
Usuário clica no botão "✏️" da conta
  ↓
Formulário abre preenchido com dados da conta
  ↓
Usuário altera campos e clica em "✅ Atualizar"
  ↓
PUT /api/financeiro/bills/:id
  ↓
Tabela é atualizada com novos dados
```

### 3. **Deletar Conta**
```
Usuário clica no botão "🗑️" da conta
  ↓
Aparece confirmação com dados da conta
  ↓
Se confirmar: DELETE /api/financeiro/bills/:id
  ↓
Conta é removida da tabela
```

---

## ✅ Checklist de Implementação

- [ ] Implementar função `editarConta()` que abre formulário preenchido
- [ ] Implementar função `novaConta()` que abre formulário vazio
- [ ] Implementar função `salvarConta()` que faz POST ou PUT
- [ ] Implementar função `deletarConta()` com confirmação
- [ ] Adicionar botão "➕ Nova Conta" no header
- [ ] Adicionar botão "✏️ Editar" na tabela
- [ ] Adicionar botão "🗑️ Deletar" na tabela
- [ ] Adaptar formulário para modo criação/edição
- [ ] Incluir campo `id` no formData quando for edição
- [ ] Testar criação de nova conta
- [ ] Testar edição de conta existente
- [ ] Testar deleção com confirmação
- [ ] Adicionar validações no formulário
- [ ] Aplicar estilos CSS (botões, formulário, etc)
- [ ] Tratar erros de API (try/catch)

---

## 💡 Dicas Importantes

### Validações Recomendadas:
- ✅ Nome da conta não pode estar vazio
- ✅ Valor deve ser maior que zero
- ✅ Data de vencimento não pode estar vazia
- ⚠️ Confirmação obrigatória antes de deletar

### Mensagens de Feedback:
- ✅ "Conta criada com sucesso!"
- ✅ "Conta atualizada com sucesso!"
- ✅ "Conta excluída com sucesso!"
- ❌ "Erro ao salvar conta"
- ❌ "Erro ao excluir conta"

### Comportamento do Formulário:
- **Modo Criação**: Título "➕ Nova Conta", botão "💾 Salvar", campos vazios
- **Modo Edição**: Título "✏️ Editar Conta", botão "✅ Atualizar", campos preenchidos
- **Cancelar**: Fecha formulário e limpa estado

---

## 🔄 Exemplo de Estado Completo

```jsx
const [contas, setContas] = useState([]);
const [contaEditando, setContaEditando] = useState(null);
const [mostrarFormulario, setMostrarFormulario] = useState(false);
const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
const [contaSelecionada, setContaSelecionada] = useState(null);

// Estados possíveis:
// 1. mostrarFormulario=false, contaEditando=null → Apenas tabela visível
// 2. mostrarFormulario=true, contaEditando=null → Criando nova conta
// 3. mostrarFormulario=true, contaEditando={...} → Editando conta
// 4. mostrarDetalhes=true, contaSelecionada={...} → Vendo detalhes
```

---

**📅 Data de criação**: 11/03/2026  
**🔧 Backend**: ✅ Rotas PUT e DELETE já implementadas  
**📋 Endpoints**: 
- `PUT /api/financeiro/bills/:id` - Atualizar
- `DELETE /api/financeiro/bills/:id` - Deletar
