# 💰 Prompt - Campos Recorrente e Beneficiário em Contas a Pagar

## 📝 Objetivo
Adicionar dois novos campos no cadastro de **Contas a Pagar**:
1. **Recorrente** (checkbox) - Marca se a conta se repete todo mês na mesma data
2. **Beneficiário** (texto) - Nome da pessoa ou empresa que receberá o pagamento

Além disso, permitir **clicar no nome da conta** para visualizar todas as informações completas.

---

## ✅ Alterações Backend (JÁ IMPLEMENTADAS)

### Novas Colunas no Banco de Dados:
```sql
-- Execute no DBeaver:
ALTER TABLE contas_financeiro 
ADD COLUMN recorrente BOOLEAN DEFAULT FALSE;

ALTER TABLE contas_financeiro 
ADD COLUMN beneficiario VARCHAR(255) NULL;
```

### Campos Adicionados no Modelo:
```typescript
interface ContaAPagar {
  // ... campos existentes
  recorrente: boolean;      // ✨ NOVO - Se repete todo mês
  beneficiario: string;     // ✨ NOVO - Quem recebe o pagamento
}
```

### Endpoints Atualizados:
**POST /api/financeiro/bills** e **PUT /api/financeiro/bills/:id** agora aceitam:
```json
{
  "name": "Aluguel Escritório",
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

Adicione os dois novos campos no formulário de contas a pagar:

```jsx
function FormularioConta({ conta, onSalvar, onCancelar }) {
  const [formData, setFormData] = useState({
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
    // ✨ NOVOS CAMPOS
    recorrente: conta?.recorrente || false,
    beneficiario: conta?.beneficiario || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSalvar(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-conta">
      {/* Campos existentes... */}
      
      <div className="form-group">
        <label>Nome da Conta *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>

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

      {/* ✨ NOVO CAMPO - BENEFICIÁRIO */}
      <div className="form-group">
        <label>Beneficiário</label>
        <input
          type="text"
          value={formData.beneficiario}
          onChange={(e) => setFormData({...formData, beneficiario: e.target.value})}
          placeholder="Ex: Imobiliária XYZ Ltda"
          className="input-beneficiario"
        />
        <small className="form-help">
          👤 Nome da pessoa ou empresa que receberá o pagamento
        </small>
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

      <div className="form-group">
        <label>Cidade</label>
        <select
          value={formData.city}
          onChange={(e) => setFormData({...formData, city: e.target.value})}
        >
          <option value="">Selecione...</option>
          <option value="São Paulo">São Paulo</option>
          <option value="Rio de Janeiro">Rio de Janeiro</option>
          {/* Adicione suas cidades */}
        </select>
      </div>

      {/* ✨ NOVO CAMPO - RECORRENTE */}
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
        {formData.recorrente && (
          <div className="alert alert-info">
            ℹ️ Esta conta será automaticamente replicada todos os meses
          </div>
        )}
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

### 2. Atualizar Tabela de Listagem

Adicione colunas/badges para mostrar se a conta é recorrente e quem é o beneficiário:

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
          <th>Categoria</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {contas.map((conta) => (
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
                <span className="beneficiario" title={conta.beneficiario}>
                  👤 {conta.beneficiario}
                </span>
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
              <span className="categoria-badge">{conta.category || '-'}</span>
            </td>
            <td>
              <span className={`status-badge status-${conta.status}`}>
                {conta.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
              </span>
            </td>
            <td className="acoes">
              <button onClick={() => onVerDetalhes(conta)} title="Ver detalhes">
                👁️
              </button>
              <button onClick={() => onEditar(conta)} title="Editar">
                ✏️
              </button>
              <button onClick={() => onDeletar(conta.id)} title="Excluir">
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

### 3. Modal de Detalhes da Conta

Crie um modal para exibir todas as informações quando o usuário clicar no nome:

```jsx
function ModalDetalhesConta({ conta, onFechar }) {
  if (!conta) return null;

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-detalhes" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Detalhes da Conta</h2>
          <button className="btn-fechar" onClick={onFechar}>✕</button>
        </div>

        <div className="modal-body">
          <div className="detalhes-grid">
            <div className="detalhe-item">
              <strong>Nome da Conta:</strong>
              <span>{conta.name}</span>
            </div>

            <div className="detalhe-item">
              <strong>👤 Beneficiário:</strong>
              <span className="destaque">
                {conta.beneficiario || 'Não informado'}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>💰 Valor:</strong>
              <span className="valor-destaque">
                R$ {parseFloat(conta.value || 0).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>📅 Data de Vencimento:</strong>
              <span>
                {new Date(conta.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>🔁 Recorrente:</strong>
              <span>
                {conta.recorrente ? (
                  <span className="badge badge-sim">
                    ✅ Sim - Repete todo mês no dia {new Date(conta.due_date + 'T00:00:00').getDate()}
                  </span>
                ) : (
                  <span className="badge badge-nao">❌ Não</span>
                )}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>📂 Categoria:</strong>
              <span>{conta.category || 'Sem categoria'}</span>
            </div>

            <div className="detalhe-item">
              <strong>🏙️ Cidade:</strong>
              <span>{conta.city || 'Não informada'}</span>
            </div>

            <div className="detalhe-item">
              <strong>📊 Status:</strong>
              <span>
                <span className={`status-badge status-${conta.status}`}>
                  {conta.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                </span>
              </span>
            </div>

            <div className="detalhe-item">
              <strong>🏢 Tipo:</strong>
              <span>
                {conta.bill_type === 'business' ? '🏢 Empresarial' : '👤 Pessoal'}
              </span>
            </div>

            <div className="detalhe-item">
              <strong>💳 Método de Pagamento:</strong>
              <span>
                {conta.payment_method === 'boleto' && '📄 Boleto'}
                {conta.payment_method === 'pix' && '💸 PIX'}
                {conta.payment_method === 'email' && '📧 Email'}
              </span>
            </div>

            {conta.payment_details && (
              <div className="detalhe-item full-width">
                <strong>📝 Detalhes de Pagamento:</strong>
                <span>{conta.payment_details}</span>
              </div>
            )}

            {conta.observations && (
              <div className="detalhe-item full-width">
                <strong>📝 Observações:</strong>
                <p className="observacoes">{conta.observations}</p>
              </div>
            )}

            <div className="detalhe-item">
              <strong>📋 Boleto em Mãos:</strong>
              <span>
                {conta.boleto_em_maos ? '✅ Sim' : '❌ Não'}
              </span>
            </div>
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

### 4. Lógica de Uso no Componente Principal

```jsx
function PaginaContas() {
  const [contas, setContas] = useState([]);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  const verDetalhes = (conta) => {
    setContaSelecionada(conta);
    setMostrarDetalhes(true);
  };

  const salvarConta = async (formData) => {
    try {
      const url = formData.id 
        ? `/api/financeiro/bills/${formData.id}`
        : '/api/financeiro/bills';
      
      const method = formData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('✅ Conta salva com sucesso!');
        carregarContas();
      } else {
        const erro = await response.json();
        alert(`❌ Erro: ${erro.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      alert('❌ Erro ao salvar conta');
    }
  };

  return (
    <div className="pagina-contas">
      <TabelaContas 
        contas={contas}
        onVerDetalhes={verDetalhes}
        onEditar={editarConta}
        onDeletar={deletarConta}
      />

      {mostrarDetalhes && (
        <ModalDetalhesConta 
          conta={contaSelecionada}
          onFechar={() => setMostrarDetalhes(false)}
        />
      )}
    </div>
  );
}
```

---

## 🎨 Estilos CSS

```css
/* Campo Beneficiário */
.input-beneficiario {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-help {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

/* Checkbox Recorrente */
.checkbox-group {
  margin: 15px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  cursor: pointer;
}

.checkbox-text {
  font-size: 14px;
  font-weight: 500;
}

/* Badge Recorrente na Tabela */
.badge-recorrente {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  margin-left: 8px;
  font-weight: 600;
}

/* Beneficiário na Tabela */
.beneficiario {
  color: #333;
  font-weight: 500;
}

.sem-beneficiario {
  color: #999;
  font-style: italic;
}

/* Botão de Link para Nome da Conta */
.btn-link-conta {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  padding: 0;
  font-weight: 600;
}

.btn-link-conta:hover {
  color: #0d47a1;
  text-decoration: none;
}

/* Modal de Detalhes */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-detalhes {
  background: white;
  border-radius: 10px;
  padding: 0;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.btn-fechar {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
}

.btn-fechar:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.detalhes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.detalhe-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detalhe-item.full-width {
  grid-column: 1 / -1;
}

.detalhe-item strong {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detalhe-item span {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.valor-destaque {
  font-size: 24px !important;
  color: #2e7d32 !important;
  font-weight: 700 !important;
}

.destaque {
  color: #1976d2 !important;
  font-weight: 600 !important;
}

.observacoes {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 5px 0 0 0;
}

.badge-sim {
  background: #c8e6c9;
  color: #2e7d32;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 13px;
}

.badge-nao {
  background: #ffcdd2;
  color: #c62828;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 13px;
}

.modal-footer {
  padding: 20px;
  border-top: 2px solid #eee;
  text-align: right;
}

.btn-fechar-modal {
  background: #1976d2;
  color: white;
  border: none;
  padding: 10px 30px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-fechar-modal:hover {
  background: #0d47a1;
}

/* Alert Info */
.alert-info {
  background: #e3f2fd;
  border-left: 4px solid #1976d2;
  padding: 10px 15px;
  margin-top: 10px;
  border-radius: 4px;
  font-size: 13px;
  color: #0d47a1;
}
```

---

## 📊 Exemplo de Uso Completo

### Cadastrar Conta Recorrente:
```json
POST /api/financeiro/bills

{
  "name": "Aluguel Escritório",
  "value": 3500.00,
  "due_date": "2026-04-15",
  "category": "Aluguel",
  "city": "São Paulo",
  "status": "pending",
  "bill_type": "business",
  "recorrente": true,
  "beneficiario": "Imobiliária XYZ Ltda",
  "observations": "Aluguel mensal do escritório - Vencimento todo dia 15",
  "payment_method": "boleto",
  "boleto_em_maos": false
}
```

### Resposta:
```json
{
  "id": 123,
  "name": "Aluguel Escritório",
  "value": "3500.00",
  "due_date": "2026-04-15",
  "category": "Aluguel",
  "city": "São Paulo",
  "status": "pending",
  "bill_type": "business",
  "recorrente": true,
  "beneficiario": "Imobiliária XYZ Ltda",
  "observations": "Aluguel mensal do escritório - Vencimento todo dia 15",
  "payment_method": "boleto",
  "boleto_em_maos": false
}
```

---

## ✅ Checklist de Implementação

- [ ] Executar script SQL no DBeaver para criar as colunas
- [ ] Adicionar campo "Recorrente" (checkbox) no formulário
- [ ] Adicionar campo "Beneficiário" (input text) no formulário
- [ ] Adicionar badge "🔁 Mensal" na listagem para contas recorrentes
- [ ] Adicionar coluna "Beneficiário" na tabela de listagem
- [ ] Tornar nome da conta clicável (link azul com underline)
- [ ] Criar modal de detalhes da conta
- [ ] Implementar função `verDetalhes()` que abre o modal
- [ ] Exibir TODOS os campos da conta no modal (incluindo recorrente e beneficiário)
- [ ] Incluir `recorrente` e `beneficiario` no POST/PUT
- [ ] Testar criação de conta com campos novos
- [ ] Testar edição de conta existente
- [ ] Testar visualização de detalhes ao clicar no nome
- [ ] Aplicar estilos CSS (badges, modal, botões)
- [ ] Adicionar validações visuais (campo obrigatório, etc)

---

## 💡 Casos de Uso

### 1. Conta Recorrente com Beneficiário:
- **Exemplo**: Aluguel mensal de R$ 3.500 para "Imobiliária XYZ Ltda"
- **Benefício**: Sistema pode automaticamente criar a conta para o próximo mês
- **Visual**: Badge "🔁 Mensal" aparece ao lado do nome

### 2. Conta Única com Beneficiário:
- **Exemplo**: Manutenção de máquina R$ 850 para "João da Silva - Técnico"
- **Benefício**: Pessoa que paga sabe exatamente para quem transferir

### 3. Visualizar Detalhes Antes de Pagar:
- **Fluxo**: Usuário clica no nome "Aluguel Escritório" → Modal abre → Vê todas as informações
- **Informações**: Beneficiário, valor, vencimento, se é recorrente, método de pagamento, observações, etc.

---

## 🔄 Comportamento Esperado

### Checkbox "Recorrente" marcado:
- Mostra alerta info: "ℹ️ Esta conta será automaticamente replicada todos os meses"
- Badge "🔁 Mensal" aparece na tabela
- No modal de detalhes, mostra: "✅ Sim - Repete todo mês no dia 15"

### Campo "Beneficiário" preenchido:
- Aparece na coluna da tabela com ícone 👤
- No modal, destaca em azul quem receberá o pagamento
- Se vazio, mostra "-" na tabela

### Clicar no Nome da Conta:
- Nome aparece como link azul
- Ao clicar, abre modal com TODOS os detalhes
- Modal mostra informações organizadas e formatadas
- Beneficiário aparece em destaque no topo

---

**📅 Data de criação**: 11/03/2026  
**🔧 Backend atualizado**: ✅ Sim  
**🗄️ Banco de dados**: Execute `add-campos-recorrente-beneficiario.sql` no DBeaver  
**📋 Arquivo SQL**: `add-campos-recorrente-beneficiario.sql`
