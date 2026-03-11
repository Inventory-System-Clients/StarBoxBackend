# 💰 Prompt Frontend - Sistema de Fluxo de Caixa e Retirada de Dinheiro

## 📋 Objetivo
Implementar um sistema completo de **Fluxo de Caixa** que permite:
1. Marcar movimentações como "Retirada de Dinheiro"
2. Exibir essas movimentações em uma nova aba "Fluxo de Caixa"
3. Permitir que o admin confira e registre o valor real retirado
4. Usar esses valores conferidos nos relatórios e gráficos

---

## ✅ Alterações no Backend (Já Implementadas)

O backend já foi completamente atualizado com as seguintes funcionalidades:

### **1. Modelo Movimentação**
```typescript
interface Movimentacao {
  // ... campos existentes
  retiradaDinheiro: boolean;  // ✨ NOVO
}
```

### **2. Modelo FluxoCaixa**
```typescript
interface FluxoCaixa {
  id: string;
  movimentacaoId: string;           // Referência à movimentação
  valorEsperado: number | null;     // ✨ Valor esperado (editável, padrão é valorFaturado)
  valorRetirado: number | null;     // Valor real trazido da máquina
  conferencia: "pendente" | "bateu" | "nao_bateu";
  observacoes: string | null;
  conferidoPor: string | null;      // ID do admin que conferiu
  dataConferencia: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relacionamentos incluídos nas queries
  movimentacao: {
    id: string;
    dataColeta: Date;
    fichas: number;
    valorFaturado: number;
    observacoes: string;
    maquina: {
      id: string;
      nome: string;
      codigo: string;
      loja: {
        id: string;
        nome: string;
        endereco: string;
        numero: string;
        bairro: string;
        cidade: string;
        estado: string;
      }
    };
    usuario: {
      id: string;
      nome: string;
      email: string;
    }
  };
  conferidoPorUsuario: {
    id: string;
    nome: string;
    email: string;
  } | null;
}
```

### **3. Endpoints da API**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/fluxo-caixa` | Listar todos os registros de fluxo de caixa |
| GET | `/api/fluxo-caixa/resumo` | Obter estatísticas e resumo |
| GET | `/api/fluxo-caixa/:id` | Obter um registro específico |
| GET | `/api/fluxo-caixa/movimentacao/:movimentacaoId` | Obter fluxo por movimentação |
| PUT | `/api/fluxo-caixa/:id` | Atualizar conferência (admin) |

#### **Query Parameters para Listagem:**
- `dataInicio`: Data inicial (formato: YYYY-MM-DD)
- `dataFim`: Data final (formato: YYYY-MM-DD)
- `lojaId`: Filtrar por loja (UUID)
- `status`: Filtrar por status (`pendente`, `bateu`, `nao_bateu`)

---

## 🎨 Implementação Frontend

### **PARTE 1: Formulário de Movimentação**

#### **1.1. Adicionar Checkbox "Retirada de Dinheiro"**

No formulário de criação/edição de movimentação, adicione um campo checkbox:

```jsx
<form onSubmit={handleSubmit}>
  {/* ... campos existentes ... */}
  
  {/* ✨ NOVO: Checkbox Retirada de Dinheiro */}
  <div className="form-group">
    <label className="checkbox-label">
      <input
        type="checkbox"
        name="retiradaDinheiro"
        checked={formData.retiradaDinheiro || false}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          retiradaDinheiro: e.target.checked
        }))}
      />
      <span>📤 Retirada de Dinheiro</span>
    </label>
    <small className="form-hint">
      Marque esta opção se você está retirando dinheiro desta máquina.
      Esta movimentação aparecerá na aba "Fluxo de Caixa" para conferência.
    </small>
  </div>

  {/* ... restante do formulário ... */}
</form>
```

#### **1.2. Incluir Campo na Requisição**

```javascript
const criarMovimentacao = async (dados) => {
  try {
    const response = await fetch('/api/movimentacoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        // ... campos existentes
        retiradaDinheiro: dados.retiradaDinheiro || false,  // ✨ NOVO
      })
    });

    if (response.ok) {
      const movimentacao = await response.json();
      
      // Se foi marcado como retirada de dinheiro, mostrar mensagem especial
      if (dados.retiradaDinheiro) {
        alert('✅ Movimentação registrada! Esta retirada aparecerá na aba "Fluxo de Caixa" para conferência.');
      } else {
        alert('✅ Movimentação registrada com sucesso!');
      }
      
      return movimentacao;
    }
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    alert('❌ Erro ao criar movimentação');
  }
};
```

---

### **PARTE 2: Nova Aba "Fluxo de Caixa"**

#### **2.1. Criar Página/Componente FluxoCaixa**

```jsx
import React, { useState, useEffect } from 'react';

function FluxoCaixa() {
  const [fluxos, setFluxos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    dataInicio: formatDate(new Date(new Date().setDate(new Date().getDate() - 7))),
    dataFim: formatDate(new Date()),
    lojaId: '',
    status: 'todos'
  });
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    carregarFluxos();
    carregarResumo();
  }, [filtros]);

  const carregarFluxos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('dataInicio', filtros.dataInicio);
      params.append('dataFim', filtros.dataFim);
      if (filtros.lojaId) params.append('lojaId', filtros.lojaId);
      if (filtros.status !== 'todos') params.append('status', filtros.status);

      const response = await fetch(`/api/fluxo-caixa?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFluxos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarResumo = async () => {
    try {
      const params = new URLSearchParams();
      params.append('dataInicio', filtros.dataInicio);
      params.append('dataFim', filtros.dataFim);
      if (filtros.lojaId) params.append('lojaId', filtros.lojaId);

      const response = await fetch(`/api/fluxo-caixa/resumo?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResumo(data);
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const conferirFluxo = async (fluxoId, valorEsperado, valorRetirado, conferencia, observacoes) => {
    try {
      const response = await fetch(`/api/fluxo-caixa/${fluxoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          valorEsperado: parseFloat(valorEsperado), // ✨ NOVO
          valorRetirado: parseFloat(valorRetirado),
          conferencia,
          observacoes
        })
      });

      if (response.ok) {
        alert('✅ Conferência registrada com sucesso!');
        carregarFluxos();
        carregarResumo();
      } else {
        const erro = await response.json();
        alert(`❌ Erro: ${erro.error}`);
      }
    } catch (error) {
      console.error('Erro ao conferir:', error);
      alert('❌ Erro ao conferir fluxo de caixa');
    }
  };

  return (
    <div className="fluxo-caixa-page">
      <h1>💰 Fluxo de Caixa</h1>
      <p>Controle e conferência de retiradas de dinheiro das máquinas</p>

      {/* Resumo/Cards */}
      {resumo && (
        <div className="cards-resumo">
          <div className="card">
            <h3>Pendentes</h3>
            <p className="numero">{resumo.totalPendentes}</p>
          </div>
          <div className="card success">
            <h3>Bateu</h3>
            <p className="numero">{resumo.totalBateu}</p>
          </div>
          <div className="card danger">
            <h3>Não Bateu</h3>
            <p className="numero">{resumo.totalNaoBateu}</p>
          </div>
          <div className="card info">
            <h3>Total Retirado</h3>
            <p className="numero">
              R$ {resumo.valorTotalRetirado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card">
            <h3>Diferença</h3>
            <p className={`numero ${resumo.diferencaTotal >= 0 ? 'success' : 'danger'}`}>
              R$ {resumo.diferencaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-container">
        <div className="form-group">
          <label>Data Início</label>
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>Data Fim</label>
          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="todos">Todos</option>
            <option value="pendente">⏳ Pendentes</option>
            <option value="bateu">✅ Bateu</option>
            <option value="nao_bateu">❌ Não Bateu</option>
          </select>
        </div>

        <button onClick={carregarFluxos} className="btn-primary">
          🔍 Buscar
        </button>
      </div>

      {/* Tabela de Fluxos */}
      {loading ? (
        <p>Carregando...</p>
      ) : fluxos.length === 0 ? (
        <p className="empty-state">Nenhuma retirada de dinheiro encontrada no período.</p>
      ) : (
        <table className="tabela-fluxo-caixa">
          <thead>
            <tr>
              <th>Data</th>
              <th>Loja</th>
              <th>Máquina</th>
              <th>Funcionário</th>
              <th>Valor Esperado</th>
              <th>Valor Retirado</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fluxos.map(fluxo => (
              <ItemFluxoCaixa
                key={fluxo.id}
                fluxo={fluxo}
                onConferir={conferirFluxo}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default FluxoCaixa;
```

#### **2.2. Componente Item da Tabela**

```jsx
function ItemFluxoCaixa({ fluxo, onConferir }) {
  const [editando, setEditando] = useState(false);
  const [formConferencia, setFormConferencia] = useState({
    valorEsperado: fluxo.valorEsperado || fluxo.movimentacao?.valorFaturado || 0, // ✨ EDITÁVEL
    valorRetirado: fluxo.valorRetirado || '',
    conferencia: fluxo.conferencia || 'pendente',
    observacoes: fluxo.observacoes || ''
  });

  const handleSalvar = () => {
    if (!formConferencia.valorEsperado) {
      alert('⚠️ Digite o valor esperado');
      return;
    }

    if (!formConferencia.valorRetirado) {
      alert('⚠️ Digite o valor retirado');
      return;
    }

    if (formConferencia.conferencia === 'pendente') {
      alert('⚠️ Selecione se o valor bateu ou não bateu');
      return;
    }

    onConferir(
      fluxo.id,
      formConferencia.valorEsperado, // ✨ NOVO
      formConferencia.valorRetirado,
      formConferencia.conferencia,
      formConferencia.observacoes
    );
    setEditando(false);
  };

  const valorEsperado = parseFloat(formConferencia.valorEsperado);
  const valorRetirado = parseFloat(formConferencia.valorRetirado || fluxo.valorRetirado || 0);
  const diferenca = valorRetirado ? valorRetirado - valorEsperado : 0;

  return (
    <tr className={`status-${fluxo.conferencia}`}>
      <td>{new Date(fluxo.movimentacao.dataColeta).toLocaleDateString('pt-BR')}</td>
      <td>
        <strong>{fluxo.movimentacao.maquina.loja.nome}</strong>
        <br />
        <small>
          {[
            fluxo.movimentacao.maquina.loja.endereco,
            fluxo.movimentacao.maquina.loja.numero && `nº ${fluxo.movimentacao.maquina.loja.numero}`,
            fluxo.movimentacao.maquina.loja.bairro
          ].filter(Boolean).join(', ')}
        </small>
      </td>
      <td>
        <strong>{fluxo.movimentacao.maquina.nome}</strong>
        <br />
        <small>Código: {fluxo.movimentacao.maquina.codigo}</small>
      </{editando ? (
          <div className="input-group">
            <label className="input-label">Esperado:</label>
            <input
              type="number"
              step="0.01"
              value={formConferencia.valorEsperado}
              onChange={(e) => setFormConferencia(prev => ({
                ...prev,
                valorEsperado: e.target.value
              }))}
              placeholder="0.00"
              className="input-valor input-esperado"
            />
          </div>
        ) : (
          <>
            <strong>
              R$ {(fluxo.valorEsperado || fluxo.movimentacao?.valorFaturado || 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
            {fluxo.valorEsperado && fluxo.valorEsperado !== fluxo.movimentacao?.valorFaturado && (
              <span className="badge badge-warning" title="Valor ajustado manualmente">
                ✏️ Editado
              </span>
            )}
          </>
        )}
      </td>
      <td>
        {editando ? (
          <div className="input-group">
            <label className="input-label">Retirado:</label>
            <input
              type="number"
              step="0.01"
              value={formConferencia.valorRetirado}
              onChange={(e) => setFormConferencia(prev => ({
                ...prev,
                valorRetirado: e.target.value
              }))}
              placeholder="0.00"
              className="input-valor input-retirado"
              autoFocus
            />
          </div onChange={(e) => setFormConferencia(prev => ({
              ...prev,
              valorRetirado: e.target.value
            }))}
            placeholder="0.00"
            className="input-valor"
            autoFocus
          />
        ) : fluxo.valorRetirado !== null ? (
          <>
            <strong>R$ {fluxo.valorRetirado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            {diferenca !== 0 && (
              <small className={diferenca > 0 ? 'success' : 'danger'}>
                ({diferenca > 0 ? '+' : ''}R$ {Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
              </small>
            )}
          </>
        ) : (
          <span className="pendente">-</span>
        )}
      </td>
      <td>
        {editando ? (
          <select
            value={formConferencia.conferencia}
            onChange={(e) => setFormConferencia(prev => ({
              ...prev,
              conferencia: e.target.value
            }))}
            className="select-conferencia"
          >
            <option value="pendente">⏳ Pendente</option>
            <option value="bateu">✅ Bateu</option>
            <option value="nao_bateu">❌ Não Bateu</option>
          </select>
        ) : (
          <span className={`badge badge-${fluxo.conferencia}`}>
            {fluxo.conferencia === 'pendente' && '⏳ Pendente'}
            {fluxo.conferencia === 'bateu' && '✅ Bateu'}
            {fluxo.conferencia === 'nao_bateu' && '❌ Não Bateu'}
          </span>
        )}
      </td>
      <td>
        {editando ? (
          <div className="acoes-edicao">
            <button onClick={handleSalvar} className="btn-success btn-sm">
              ✅ Salvar
            </button>
            <button onClick={() => setEditando(false)} className="btn-secondary btn-sm">
              ❌ Cancelar
            </button>
          </div>
        ) : fluxo.conferencia === 'pendente' ? (
          <button onClick={() => setEditando(true)} className="btn-primary btn-sm">
            📝 Conferir
          </button>
        ) : (
          <button onClick={() => setEditando(true)} className="btn-secondary btn-sm">
            ✏️ Editar
          </button>
        )}
      </td>
    </tr>
  );
}
```

---

### **PARTE 3: Navegação**

Adicione um item de menu para a nova aba:

```jsx
<nav className="main-nav">
  {/* ... itens existentes ... */}
  
  <Link to="/fluxo-caixa" className="nav-item">
    <span className="icon">💰</span>
    <span>Fluxo de Caixa</span>
    {pendentesCount > 0 && (
      <span className="badge">{pendentesCount}</span>
    )}
  </Link>
</nav>
```

---

### **PARTE 4: Estilos CSS Sugeridos**

```css
/* Fluxo de Caixa */
.fluxo-caixa-page {
  padding: 20px;
}

.cards-resumo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.cards-resumo .card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.cards-resumo .card h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.cards-resumo .card .numero {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.cards-resumo .card.success .numero { color: #28a745; }
.cards-resumo .card.danger .numero { color: #dc3545; }
.cards-resumo .card.info .numero { color: #17a2b8; }

.filtros-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  align-items: flex-end;
}

.tabela-fluxo-caixa {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tabela-fluxo-caixa th,
.tabela-fluxo-caixa td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.tabela-fluxo-caixa th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.tabela-fluxo-caixa tr:hover {
  background: #f8f9fa;
}

.tabelagroup {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-label {
  font-size: 11px;
  color: #666;
  font-weight: 600;
}

.input-valor {
  width: 120px;
  padding: 6px;
  border: 2px solid #007bff;
  border-radius: 4px;
}

.input-esperado {
  border-color: #ffc107 !important;
}

.input-retirado {
  border-color: #007bff !important;
}

.badge-warning {
  background: #fff3cd;
  color: #856404;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 5a tr.status-nao_bateu {
  background: #f8d7da;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-pendente {
  background: #fff3cd;
  color: #856404;
}

.badge-bateu {
  background: #d4edda;
  color: #155724;
}

.badge-nao_bateu {
  background: #f8d7da;
  color: #721c24;
}

.input-valor {
  width: 120px;
  padding: 6px;
  border: 2px solid #007bff;
  border-radius: 4px;
}

.select-conferencia {
  padding: 6px;
  border: 2px solid #007bff;
  border-radius: 4px;
}

.acoes-edicao {
  display: flex;
  gap: 5px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}
```

---

## 📊 Integração com Relatórios

**IMPORTANTE:** Os relatórios e gráficos agora usam automaticamente o `valorRetirado` do fluxo de caixa quando:
- A movimentação foi marcada como `retiradaDinheiro = true`
- Existe um registro no `fluxo_caixa` para essa movimentação
- O `valorRetirado` foi preenchido (não é `null`)

**Nenhuma alteração adicional é necessária no frontend dos relatórios!** O backend já está tratando isso automaticamente.

---

## ✅ Checklist de Implementação

### **Formulário de Movimentação**
- [ ] Adicionar checkbox "Retirada de Dinheiro" no formulário
- [ ] Adicionar campo `retiradaDinheiro` no estado do formulário
- [ ] Incluir `retiradaDinheiro: boolean` na requisição POST/PUT
- [ ] Adicionar mensagem especial quando for retirada de dinheiro
- [ ] Testar criação de movimentação com e sem retirada

### **Página Fluxo de Caixa**
- [ ] Criar componente `FluxoCaixa.jsx`
- [ ] Criar componente `ItemFluxoCaixa.jsx`
- [ ] Implementar listagem de fluxos com filtros
- [ ] Implementar cards de resumo/estatísticas
- [ ] Implementar edição inline para conferência
- [ ] Adicionar validações (valor obrigatório, conferência obrigatória)
- [ ] Adicionar rota `/fluxo-caixa` no React Router
- [ ] Adicionar item no menu de navegação
- [ ] Adicionar contador de pendentes no menu (opcional)
- [ ] Aplicar estilos CSS

### **Permissões**
- [ ] Restringir conferência apenas para usuários ADMIN
- [ ] Exibir/ocultar aba conforme perfil do usuário

---

## 🎯 Exemplos de Payloads

### **1. Criar Movimentação com Retirada de Dinheiro**

**POST /api/movimentacoes**
```json
{
  "maquinaId": "uuid-maquina",
  "totalPre": 100,
  "sairam": 20,
  "abastecidas": 50,
  "fichas": 150,
  "retiradaDinheiro": true,
  "observacoes": "Retirada de caixa mensal"
}
```

**Resposta (201 Created)**
```json
{
  "id": "uuid-movimentacao",
  "maquinaId": "uuid-maquina",
  "retiradaDinheiro": true,
  "valorFaturado": 375.00,
  "createdAt": "2026-03-11T10:00:00.000Z"
}
```

### **2. Listar Fluxos de Caixa**

**GET /api/fluxo-caixa?dataInicio=2026-03-01&dataFim=2026-03-31&status=pendente**

**Resposta (200 OK)**
```json
[
  {
    "id": "uuid-fluxo",
    "movimentacaoId": "uuid-movimentacao",
    "valorRetirado": null,
    "conferencia": "pendente",
    "observacoes": null,
    "conferidoPor": null,
    "dataConferencia": null,
    "movimentacao": {
      "id": "uuid-movimentacao",
      "dataColeta": "2026-03-10T14:30:00.000Z",
      "fichas": 150,
      "vEsperado": 380.00,
  "valorRetirado": 370.00,
  "conferencia": "nao_bateu",
  "observacoes": "Faltaram R$ 10,00 - Valor esperado ajustado manualmente"
}
```

**Resposta (200 OK)**
```json
{
  "id": "uuid-fluxo",
  "valorEsperado": 380.00,
  "valorRetirado": 370.00,
  "conferencia": "nao_bateu",
  "observacoes": "Faltaram R$ 10,00 - Valor esperado ajustado manualmente
        }
      },
      "usuario": {
        "id": "uuid-usuario",
        "nome": "João Silva",
        "email": "joao@email.com"
      }
    }
  }
]
```

### **3. Conferir Fluxo de Caixa**

**PUT /api/fluxo-caixa/:id**
```json
{
  "valorRetirado": 370.00,
  "conferencia": "nao_bateu",
  "observacoes": "Faltaram R$ 5,00 - Possível erro na contagem"
}
```

**Resposta (200 OK)**
```json
{
  "id": "uuid-fluxo",
  "valorRetirado": 370.00,
  "conferencia": "nao_bateu",
  "observacoes": "Faltaram R$ 5,00 - Possível erro na contagem",
  "conferidoPor": "uuid-admin",
  "dataConferencia": "2026-03-11T11:00:00.000Z",
  "conferidoPorUsuario": {
    "id": "uuid-admin",
    "nome": "Admin Master",
    "email": "admin@email.com"
  }
}
```

### **4. Obter Resumo**

**GET /api/fluxo-caixa/resumo?dataInicio=2026-03-01&dataFim=2026-03-31**

**Resposta (200 OK)**
```json
{
  "totalRegistros": 15,
  "totalPendentes": 3,
  "totalBateu": 10,
  "totalNaoBateu": 2,
  "valorTotalRetirado": 5250.00,
  "valorTotalEsperado": 5300.00,
  "diferencaTotal": -50.00,
  "taxaAcerto": 66.67
}
```

---

## 💡 Dicas e Boas Práticas

1. **Notificações**: Adicione um badge no menu mostrando quantidade de conferências pendentes

2. **Histórico**: Mostre quem conferiu e quando na tooltip/detalhes

3. **Relatório**: Adicione um botão para exportar relatório do fluxo de caixa em PDF/Excel

4. **Dashboard**: Adicione gráficos mostrando evolução de diferenças ao longo do tempo

5. **Alertas**: Configure alertas quando a diferença ultrapassar um valor aceitável (ex: > R$ 10,00)

6. **Mobile**: Garanta que a tabela seja responsiva (considere usar cards no mobile)

7. **Permissões**: O campo de conferência só deve ser editável para ADMIN

---

## 🗄️ Banco de Dados

Execute o arquivo **`migration-fluxo-caixa.sql`** no DBeaver para criar:
- Coluna `retirada_dinheiro` na tabela `movimentacoes`
- Tabela `fluxo_caixa`
- Índices necessários

---

**📅 Data de criação**: 11/03/2026  
**🔧 Backend atualizado**: ✅ Sim  
**🗄️ Banco de dados**: Execute `migration-fluxo-caixa.sql` no DBeaver  
**📊 Relatórios atualizados**: ✅ Sim (usam automaticamente o valorRetirado quando disponível)
