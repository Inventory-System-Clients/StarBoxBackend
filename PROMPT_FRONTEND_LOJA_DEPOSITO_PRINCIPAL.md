# 🏭 Prompt - Sistema de Loja Principal (Depósito Central)

## 📝 Objetivo
Criar um sistema de **loja principal/depósito** que funciona como fonte central de estoque. Todo estoque adicionado a outras lojas ou funcionários é automaticamente descontado desta loja principal.

---

## ✅ Alterações Backend (JÁ IMPLEMENTADAS)

### 1. Nova Coluna no Banco de Dados
```sql
ALTER TABLE lojas 
ADD COLUMN is_deposito_principal BOOLEAN DEFAULT FALSE;
```

### 2. Loja "StarBox Depósito" Criada
- Nome: **StarBox Depósito**
- Flag: `isDepositoPrincipal = TRUE`
- Única loja marcada como depósito principal

### 3. Campo Adicionado no Modelo
```typescript
interface Loja {
  // ... campos existentes
  isDepositoPrincipal: boolean;  // ✨ NOVO
}
```

### 4. Lógica Automática Implementada

#### Quando adicionar estoque EM LOJA (ENTRADA):
```
POST /api/movimentacao-estoque-lojas
{
  "lojaId": "uuid-loja-centro",
  "produtos": [{
    "produtoId": "uuid-produto",
    "quantidade": 100,
    "tipoMovimentacao": "entrada"  // ← ENTRADA
  }]
}

Sistema automaticamente:
1. ✅ +100 unidades na "Loja Centro"
2. ✅ -100 unidades na "StarBox Depósito"
```

#### Quando adicionar estoque PARA FUNCIONÁRIO (ENTRADA):
```
POST /api/estoque-usuarios/:usuarioId/movimentar
{
  "movimentacoes": [{
    "produtoId": "uuid-produto",
    "quantidade": 50,
    "tipoMovimentacao": "entrada"  // ← ENTRADA
  }]
}

Sistema automaticamente:
1. ✅ +50 unidades para o funcionário
2. ✅ -50 unidades na "StarBox Depósito"
```

#### Quando fazer SAÍDA:
```
Saídas NÃO afetam o depósito principal.
- Saída de loja: apenas registra saída
- Saída de funcionário: apenas registra saída
```

---

## 🎨 Implementação Frontend

### 1. Listar Lojas (com indicador de depósito principal)

```jsx
function ListaLojas() {
  const [lojas, setLojas] = useState([]);

  const carregarLojas = async () => {
    const response = await fetch('/api/lojas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setLojas(data);
  };

  return (
    <div className="lista-lojas">
      <h1>🏪 Lojas</h1>
      
      <table className="tabela-lojas">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cidade</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {lojas.map((loja) => (
            <tr key={loja.id} className={loja.isDepositoPrincipal ? 'loja-deposito' : ''}>
              <td>
                {loja.isDepositoPrincipal && <span className="badge badge-deposito">🏭</span>}
                {loja.nome}
              </td>
              <td>{loja.cidade}</td>
              <td>
                {loja.isDepositoPrincipal ? (
                  <span className="tipo-deposito">🏭 Depósito Principal</span>
                ) : (
                  <span className="tipo-loja">🏪 Loja</span>
                )}
              </td>
              <td>
                <span className={`status ${loja.ativo ? 'ativo' : 'inativo'}`}>
                  {loja.ativo ? '✅ Ativo' : '❌ Inativo'}
                </span>
              </td>
              <td>
                <button onClick={() => verEstoque(loja.id)}>
                  📦 Estoque
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 2. Visualizar Estoque do Depósito Principal

```jsx
function EstoqueDepositoPrincipal() {
  const [estoque, setEstoque] = useState([]);
  const [lojaDeposito, setLojaDeposito] = useState(null);

  const carregarEstoqueDeposito = async () => {
    try {
      // Buscar loja depósito
      const resLojas = await fetch('/api/lojas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const lojas = await resLojas.json();
      const deposito = lojas.find(l => l.isDepositoPrincipal);
      
      if (!deposito) {
        alert('⚠️ Loja principal não encontrada');
        return;
      }

      setLojaDeposito(deposito);

      // Buscar estoque do depósito
      const resEstoque = await fetch(`/api/estoque-lojas/${deposito.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const estoqueData = await resEstoque.json();
      setEstoque(estoqueData);
    } catch (error) {
      console.error('Erro ao carregar estoque do depósito:', error);
    }
  };

  useEffect(() => {
    carregarEstoqueDeposito();
  }, []);

  return (
    <div className="estoque-deposito">
      <div className="header-deposito">
        <h1>🏭 Estoque do Depósito Principal</h1>
        {lojaDeposito && (
          <div className="info-deposito">
            <p><strong>Loja:</strong> {lojaDeposito.nome}</p>
            <p><strong>Cidade:</strong> {lojaDeposito.cidade}</p>
          </div>
        )}
      </div>

      <table className="tabela-estoque">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Código</th>
            <th>Quantidade em Estoque</th>
            <th>Estoque Mínimo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {estoque.length === 0 ? (
            <tr>
              <td colSpan="5" className="sem-dados">
                Nenhum produto no depósito
              </td>
            </tr>
          ) : (
            estoque.map((item) => {
              const estoqueBaixo = item.quantidade <= (item.estoqueMinimo || 0);
              
              return (
                <tr key={item.id} className={estoqueBaixo ? 'alerta-estoque' : ''}>
                  <td>
                    {item.produto?.emoji && <span>{item.produto.emoji}</span>}
                    {item.produto?.nome}
                  </td>
                  <td>{item.produto?.codigo || '-'}</td>
                  <td className="quantidade">
                    <strong>{item.quantidade}</strong>
                  </td>
                  <td>{item.estoqueMinimo || 0}</td>
                  <td>
                    {estoqueBaixo ? (
                      <span className="badge badge-alerta">⚠️ Estoque Baixo</span>
                    ) : (
                      <span className="badge badge-ok">✅ OK</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 3. Adicionar Estoque em Loja (com aviso de desconto do depósito)

```jsx
function FormularioEntradaEstoqueLoja({ loja, onSalvar, onCancelar }) {
  const [produtos, setProdutos] = useState([
    { produtoId: '', quantidade: 0, tipoMovimentacao: 'entrada' }
  ]);
  const [observacao, setObservacao] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (produtos.some(p => !p.produtoId || p.quantidade <= 0)) {
      alert('⚠️ Preencha todos os produtos e quantidades');
      return;
    }

    // Mostrar aviso se não for loja principal
    if (!loja.isDepositoPrincipal) {
      const totalItens = produtos.length;
      const confirmar = window.confirm(
        `📦 Você está adicionando ${totalItens} produto(s) em "${loja.nome}".\n\n` +
        `🏭 Estes produtos serão AUTOMATICAMENTE DESCONTADOS do depósito principal.\n\n` +
        `Confirma a entrada de estoque?`
      );

      if (!confirmar) return;
    }

    try {
      const response = await fetch('/api/movimentacao-estoque-lojas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lojaId: loja.id,
          produtos,
          observacao,
          dataMovimentacao: new Date()
        })
      });

      if (response.ok) {
        alert('✅ Estoque adicionado com sucesso!');
        if (!loja.isDepositoPrincipal) {
          alert('🏭 O depósito principal foi atualizado automaticamente.');
        }
        onSalvar();
      } else {
        const erro = await response.json();
        alert(`❌ Erro: ${erro.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar estoque:', error);
      alert('❌ Erro ao adicionar estoque');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-entrada-estoque">
      <h2>📦 Adicionar Estoque - {loja.nome}</h2>

      {!loja.isDepositoPrincipal && (
        <div className="alerta-info">
          <strong>ℹ️ Atenção:</strong> Ao adicionar estoque aqui, os produtos serão 
          automaticamente descontados do <strong>Depósito Principal</strong>.
        </div>
      )}

      {/* Lista de produtos */}
      {produtos.map((item, index) => (
        <div key={index} className="produto-item">
          <select
            value={item.produtoId}
            onChange={(e) => {
              const novos = [...produtos];
              novos[index].produtoId = e.target.value;
              setProdutos(novos);
            }}
            required
          >
            <option value="">Selecione um produto</option>
            {/* Listar produtos disponíveis */}
          </select>

          <input
            type="number"
            min="1"
            value={item.quantidade}
            onChange={(e) => {
              const novos = [...produtos];
              novos[index].quantidade = parseInt(e.target.value) || 0;
              setProdutos(novos);
            }}
            placeholder="Quantidade"
            required
          />
        </div>
      ))}

      <button type="button" onClick={() => setProdutos([...produtos, { produtoId: '', quantidade: 0, tipoMovimentacao: 'entrada' }])}>
        ➕ Adicionar Produto
      </button>

      <textarea
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Observações (opcional)"
        rows="3"
      />

      <div className="form-actions">
        <button type="button" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-salvar">
          💾 Adicionar Estoque
        </button>
      </div>
    </form>
  );
}
```

---

### 4. Adicionar Estoque para Funcionário (com aviso)

```jsx
function FormularioEntradaEstoqueUsuario({ usuario, onSalvar, onCancelar }) {
  const [movimentacoes, setMovimentacoes] = useState([
    { produtoId: '', quantidade: 0, tipoMovimentacao: 'entrada' }
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (movimentacoes.some(m => !m.produtoId || m.quantidade <= 0)) {
      alert('⚠️ Preencha todos os produtos e quantidades');
      return;
    }

    // Aviso sobre desconto do depósito
    const totalItens = movimentacoes.length;
    const confirmar = window.confirm(
      `📦 Você está adicionando ${totalItens} produto(s) para "${usuario.nome}".\n\n` +
      `🏭 Estes produtos serão AUTOMATICAMENTE DESCONTADOS do depósito principal.\n\n` +
      `Confirma a entrada de estoque para o funcionário?`
    );

    if (!confirmar) return;

    try {
      const response = await fetch(`/api/estoque-usuarios/${usuario.id}/movimentar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ movimentacoes })
      });

      if (response.ok) {
        alert('✅ Estoque adicionado com sucesso!');
        alert('🏭 O depósito principal foi atualizado automaticamente.');
        onSalvar();
      } else {
        const erro = await response.json();
        alert(`❌ Erro: ${erro.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar estoque:', error);
      alert('❌ Erro ao adicionar estoque');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-entrada-estoque-usuario">
      <h2>👤 Adicionar Estoque - {usuario.nome}</h2>

      <div className="alerta-info">
        <strong>ℹ️ Atenção:</strong> Ao adicionar estoque para este funcionário, 
        os produtos serão automaticamente descontados do <strong>Depósito Principal</strong>.
      </div>

      {/* Lista de produtos */}
      {/* ... similar ao formulário de loja ... */}

      <div className="form-actions">
        <button type="button" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-salvar">
          💾 Adicionar Estoque
        </button>
      </div>
    </form>
  );
}
```

---

## 🎨 Estilos CSS

```css
/* Badge Depósito Principal */
.badge-deposito {
  background: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  margin-right: 8px;
  font-weight: 600;
}

/* Linha da tabela - Loja Depósito */
.loja-deposito {
  background: #fff3e0 !important;
  border-left: 4px solid #ff9800;
}

/* Tipo de loja */
.tipo-deposito {
  color: #ff9800;
  font-weight: 600;
}

.tipo-loja {
  color: #666;
}

/* Alerta informativo */
.alerta-info {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
  font-size: 14px;
  color: #0d47a1;
}

.alerta-info strong {
  display: block;
  margin-bottom: 5px;
  font-size: 15px;
}

/* Estoque baixo */
.alerta-estoque {
  background: #ffebee !important;
}

.badge-alerta {
  background: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.badge-ok {
  background: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* Header do depósito */
.header-deposito {
  background: #fff3e0;
  padding: 20px;
  border-left: 4px solid #ff9800;
  margin-bottom: 20px;
  border-radius: 4px;
}

.info-deposito {
  margin-top: 10px;
  font-size: 14px;
}

.info-deposito p {
  margin: 5px 0;
  color: #555;
}
```

---

## 📊 Fluxo Completo

### 1. **Adicionar Produtos no Depósito Principal**
```
1. Comprou 1000 unidades de produtos
2. Vai em "Lojas" → "StarBox Depósito" → "Adicionar Estoque"
3. Registra ENTRADA de 1000 unidades
4. Depósito agora tem 1000 unidades disponíveis
```

### 2. **Distribuir para Loja**
```
1. Vai em "Lojas" → "Loja Centro" → "Adicionar Estoque"
2. Adiciona 200 unidades (ENTRADA)
3. Sistema automaticamente:
   - ✅ Loja Centro: +200
   - ✅ Depósito Principal: -200 (automático)
```

### 3. **Distribuir para Funcionário**
```
1. Vai em "Funcionários" → "João Silva" → "Adicionar Estoque"
2. Adiciona 50 unidades (ENTRADA)
3. Sistema automaticamente:
   - ✅ João Silva: +50
   - ✅ Depósito Principal: -50 (automático)
```

### 4. **Verificar Estoque do Depósito**
```
1. Vai em "Lojas" → "StarBox Depósito" → "Ver Estoque"
2. Visualiza:
   - Estoque inicial: 1000
   - Distribuído para lojas: -200
   - Distribuído para funcionários: -50
   - Saldo atual: 750 ✅
```

---

## 💡 Regras Importantes

### ✅ O que faz desconto do depósito:
- ✅ ENTRADA em loja (que não seja o próprio depósito)
- ✅ ENTRADA para funcionário

### ❌ O que NÃO faz desconto do depósito:
- ❌ SAÍDA de loja
- ❌ SAÍDA de funcionário
- ❌ ENTRADA no próprio depósito

### ⚠️ Observações:
- Se o estoque do depósito for insuficiente, o sistema PERMITE a operação (mas zera o estoque do depósito)
- Recomenda-se sempre verificar o estoque do depósito antes de distribuir
- Apenas UMA loja pode ser marcada como depósito principal

---

## ✅ Checklist de Implementação

- [ ] Executar SQL no DBeaver para adicionar campo e criar loja
- [ ] Adicionar badge "🏭" na lista de lojas para o depósito
- [ ] Criar página específica "Estoque do Depósito Principal"
- [ ] Adicionar avisos nos formulários de entrada (loja e funcionário)
- [ ] Testar entrada de estoque em loja → verificar desconto do depósito
- [ ] Testar entrada de estoque para funcionário → verificar desconto do depósito
- [ ] Testar saída (não deve afetar depósito)
- [ ] Criar relatório de movimentações do depósito
- [ ] Adicionar alerta quando estoque do depósito está baixo
- [ ] Documentar o fluxo para usuários do sistema

---

**📅 Data de criação**: 11/03/2026  
**🔧 Backend**: ✅ Totalmente implementado  
**🗄️ Banco de dados**: Execute `add-loja-deposito-principal.sql` no DBeaver  
**📋 Arquivo SQL**: `add-loja-deposito-principal.sql`

---

## 🎯 Exemplo Prático Completo

```javascript
// Passo 1: Adicionar 1000 unidades no depósito
POST /api/movimentacao-estoque-lojas
{
  "lojaId": "uuid-deposito",  // StarBox Depósito
  "produtos": [{
    "produtoId": "uuid-produto",
    "quantidade": 1000,
    "tipoMovimentacao": "entrada"
  }]
}
// Resultado: Depósito = 1000

// Passo 2: Distribuir 300 para Loja Centro
POST /api/movimentacao-estoque-lojas
{
  "lojaId": "uuid-loja-centro",
  "produtos": [{
    "produtoId": "uuid-produto",
    "quantidade": 300,
    "tipoMovimentacao": "entrada"  // ← Desconta do depósito
  }]
}
// Resultado: Loja Centro = 300, Depósito = 700

// Passo 3: Distribuir 150 para funcionário João
POST /api/estoque-usuarios/uuid-joao/movimentar
{
  "movimentacoes": [{
    "produtoId": "uuid-produto",
    "quantidade": 150,
    "tipoMovimentacao": "entrada"  // ← Desconta do depósito
  }]
}
// Resultado: João = 150, Depósito = 550

// Passo 4: Cliente compra 50 da Loja Centro (saída)
POST /api/movimentacao-estoque-lojas
{
  "lojaId": "uuid-loja-centro",
  "produtos": [{
    "produtoId": "uuid-produto",
    "quantidade": 50,
    "tipoMovimentacao": "saida"  // ← NÃO afeta depósito
  }]
}
// Resultado: Loja Centro = 250, Depósito = 550 (sem mudança)
```
