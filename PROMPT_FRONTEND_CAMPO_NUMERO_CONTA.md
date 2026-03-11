# 🔢 Prompt - Campo NÚMERO em Contas a Pagar

## 📝 Objetivo
Adicionar campo **"Número"** no cadastro de **Contas a Pagar** para armazenar:
- Número do boleto
- Número da conta
- Número do documento
- Código de barras
- Código de referência
- Qualquer identificador numérico ou alfanumérico

---

## ✅ Alterações Backend (JÁ IMPLEMENTADAS)

### Nova Coluna no Banco de Dados:
```sql
-- Execute no DBeaver (arquivo: add-campo-numero-conta.sql):
ALTER TABLE contas_financeiro 
ADD COLUMN numero VARCHAR(100) NULL;
```

### Campo Adicionado no Modelo:
```typescript
interface ContaAPagar {
  // ... campos existentes
  numero: string;  // ✨ NOVO - Número do documento/boleto/conta
}
```

### Endpoints Atualizados:
**POST /api/financeiro/bills** e **PUT /api/financeiro/bills/:id** agora aceitam:
```json
{
  "name": "Aluguel Escritório",
  "numero": "12345678901234567890",
  "value": 3500.00,
  "due_date": "2026-03-15",
  "category": "Aluguel",
  "city": "São Paulo",
  "status": "pending",
  "bill_type": "business",
  "recorrente": true,
  "beneficiario": "Imobiliária XYZ Ltda",
  "observations": "Aluguel mensal - Vencimento dia 15"
}
```

---

## 🎨 Implementação Frontend

### 1. Atualizar Formulário de Cadastro/Edição

Adicione o campo "Número" no formulário de contas a pagar:

```jsx
function FormularioConta({ conta, onSalvar, onCancelar }) {
  const [formData, setFormData] = useState({
    name: conta?.name || '',
    numero: conta?.numero || '',  // ✨ NOVO CAMPO
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enviar para o backend
    const response = await fetch('/api/financeiro/bills', {
      method: conta?.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      const data = await response.json();
      onSalvar(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-conta">
      
      {/* ✨ CAMPO NOME DA CONTA */}
      <div className="form-row">
        <div className="form-group flex-2">
          <label>Nome da Conta *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ex: Aluguel Escritório"
            required
          />
        </div>

        {/* ✨ NOVO CAMPO - NÚMERO */}
        <div className="form-group flex-1">
          <label>Número</label>
          <input
            type="text"
            value={formData.numero}
            onChange={(e) => setFormData({...formData, numero: e.target.value})}
            placeholder="Ex: 12345"
            className="input-numero"
          />
          <small className="form-help">
            🔢 Número do boleto, conta ou documento
          </small>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Valor *</label>
          <input
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({...formData, value: e.target.value})}
            placeholder="0.00"
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

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.recorrente}
            onChange={(e) => setFormData({...formData, recorrente: e.target.checked})}
          />
          <span>🔁 Conta recorrente (repete todo mês)</span>
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
          💾 Salvar Conta
        </button>
      </div>
    </form>
  );
}
```

---

### 2. Exibir o Número na Tabela de Contas

Adicione a coluna "Número" na listagem:

```jsx
function TabelaContas({ contas, onEditar, onDeletar, onVisualizarDetalhes }) {
  return (
    <table className="tabela-contas">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Número</th>  {/* ✨ NOVA COLUNA */}
          <th>Beneficiário</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {contas.map((conta) => (
          <tr key={conta.id}>
            <td>
              <button 
                className="btn-link"
                onClick={() => onVisualizarDetalhes(conta)}
              >
                {conta.name}
              </button>
            </td>
            
            {/* ✨ EXIBIR NÚMERO */}
            <td>
              {conta.numero ? (
                <span className="numero-conta">{conta.numero}</span>
              ) : (
                <span className="texto-vazio">-</span>
              )}
            </td>

            <td>{conta.beneficiario || '-'}</td>
            <td>R$ {parseFloat(conta.value).toFixed(2)}</td>
            <td>{new Date(conta.due_date).toLocaleDateString('pt-BR')}</td>
            <td>
              <span className={`badge status-${conta.status}`}>
                {conta.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
              </span>
            </td>
            <td>
              <button onClick={() => onEditar(conta)} className="btn-editar">
                ✏️
              </button>
              <button onClick={() => onDeletar(conta.id)} className="btn-deletar">
                🗑️
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 3. Mostrar no Modal de Detalhes

Adicione o campo "Número" no modal de visualização:

```jsx
function ModalDetalhes({ conta, onFechar }) {
  if (!conta) return null;

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Detalhes da Conta</h2>
          <button className="btn-fechar" onClick={onFechar}>✕</button>
        </div>

        <div className="modal-body">
          <div className="detalhes-grid">
            
            <div className="detalhe-item full-width">
              <strong>📝 Nome da Conta:</strong>
              <span className="destaque">{conta.name}</span>
            </div>

            {/* ✨ EXIBIR NÚMERO */}
            {conta.numero && (
              <div className="detalhe-item">
                <strong>🔢 Número:</strong>
                <span className="numero-destaque">{conta.numero}</span>
              </div>
            )}

            <div className="detalhe-item">
              <strong>💰 Valor:</strong>
              <span className="valor-destaque">
                R$ {parseFloat(conta.value).toFixed(2)}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>📅 Vencimento:</strong>
              <span>
                {new Date(conta.due_date).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>👤 Beneficiário:</strong>
              <span>{conta.beneficiario || 'Não informado'}</span>
            </div>

            <div className="detalhe-item">
              <strong>🔁 Recorrente:</strong>
              <span>
                {conta.recorrente ? (
                  <span className="badge badge-info">✅ Sim (mensal)</span>
                ) : (
                  <span className="badge badge-secondary">❌ Não</span>
                )}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>📂 Categoria:</strong>
              <span>{conta.category || 'Sem categoria'}</span>
            </div>

            <div className="detalhe-item">
              <strong>📊 Status:</strong>
              <span className={`status-badge status-${conta.status}`}>
                {conta.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
              </span>
            </div>

            {conta.observations && (
              <div className="detalhe-item full-width">
                <strong>📝 Observações:</strong>
                <p className="observacoes">{conta.observations}</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-fechar-modal" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. CSS para o Campo Número

```css
/* Estilo para o campo número */
.input-numero {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 1px;
}

.numero-conta {
  font-family: 'Courier New', monospace;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #333;
}

.numero-destaque {
  font-family: 'Courier New', monospace;
  font-size: 1.1em;
  font-weight: bold;
  color: #2196F3;
  background: #E3F2FD;
  padding: 8px 12px;
  border-radius: 6px;
  display: inline-block;
}

.texto-vazio {
  color: #999;
  font-style: italic;
}

/* Layout em linha (nome + número) */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row .form-group {
  margin-bottom: 0;
}

.flex-1 {
  flex: 1;
}

.flex-2 {
  flex: 2;
}
```

---

## 📡 Chamadas da API

### Criar Nova Conta (POST)
```javascript
const response = await fetch('/api/financeiro/bills', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "Aluguel Escritório Centro",
    numero: "12345678901234567890",  // ← NOVO CAMPO
    value: 3500.00,
    due_date: "2026-03-15",
    category: "Aluguel",
    city: "São Paulo",
    status: "pending",
    bill_type: "business",
    recorrente: true,
    beneficiario: "Imobiliária XYZ Ltda",
    observations: "Aluguel mensal",
    payment_method: "boleto",
    payment_details: "23860385000162",
    boleto_em_maos: false
  })
});

const conta = await response.json();
console.log('Conta criada:', conta);
```

### Editar Conta (PUT)
```javascript
const response = await fetch(`/api/financeiro/bills/${contaId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "Aluguel Escritório Centro",
    numero: "98765432109876543210",  // ← ATUALIZANDO O NÚMERO
    value: 3800.00,
    due_date: "2026-03-15",
    category: "Aluguel",
    city: "São Paulo",
    status: "pending",
    bill_type: "business",
    recorrente: true,
    beneficiario: "Imobiliária XYZ Ltda",
    observations: "Aluguel mensal - Valor reajustado"
  })
});

const contaAtualizada = await response.json();
console.log('Conta atualizada:', contaAtualizada);
```

### Listar Contas (GET)
```javascript
const response = await fetch('/api/financeiro/bills', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const contas = await response.json();

// Acessar o número:
contas.forEach(conta => {
  console.log(`${conta.name} - Nº ${conta.numero || 'Sem número'}`);
});
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Conta de Aluguel
```json
{
  "name": "Aluguel Loja Rancharia",
  "numero": "001234",
  "value": 1250.00,
  "beneficiario": "Casa Avenida Imóveis",
  "recorrente": true
}
```

### Exemplo 2: Boleto com Código de Barras
```json
{
  "name": "Energia Elétrica - CPFL",
  "numero": "12345678901234567890123456789012345678901234567890",
  "value": 450.80,
  "beneficiario": "CPFL Energia",
  "payment_method": "boleto"
}
```

### Exemplo 3: Nota Fiscal
```json
{
  "name": "Fornecedor ABC Ltda",
  "numero": "NF-2026-001",
  "value": 2500.00,
  "beneficiario": "ABC Comércio Ltda",
  "observations": "Nota fiscal de mercadorias"
}
```

---

## ✅ Checklist de Implementação

- [ ] Executar SQL migration (add-campo-numero-conta.sql)
- [ ] Adicionar campo "numero" no formulário de cadastro
- [ ] Adicionar campo "numero" no formulário de edição
- [ ] Adicionar coluna "Número" na tabela de listagem
- [ ] Adicionar campo "Número" no modal de detalhes
- [ ] Incluir "numero" no body das requisições POST
- [ ] Incluir "numero" no body das requisições PUT
- [ ] Adicionar CSS para estilizar o campo número
- [ ] Testar criação de conta com número
- [ ] Testar edição de conta alterando o número
- [ ] Testar visualização do número no modal

---

## 🎯 Resumo

**Campo**: `numero` (VARCHAR 100)

**Onde usar**:
- Formulário de cadastro: `formData.numero`
- Formulário de edição: `formData.numero`
- Tabela: `conta.numero`
- Modal detalhes: `conta.numero`
- API POST/PUT: `body.numero`

**Como enviar**:
```javascript
body: JSON.stringify({
  name: "Nome da conta",
  numero: "12345",  // ← AQUI
  value: 1000.00,
  // ... outros campos
})
```

**Como receber e exibir**:
```jsx
<span>{conta.numero || 'Sem número'}</span>
```
