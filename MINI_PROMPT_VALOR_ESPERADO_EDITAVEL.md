# ✏️ Mini Prompt - Valor Esperado Editável no Fluxo de Caixa

## 📝 Objetivo
Permitir que o **valor esperado** seja editável na tabela do Fluxo de Caixa, possibilitando ajustes manuais quando necessário.

---

## 🔧 Alterações Backend (✅ Já Implementadas)

### Campo Adicionado:
```typescript
interface FluxoCaixa {
  // ... campos existentes
  valorEsperado: number | null;  // ✨ NOVO - Editável
  valorRetirado: number | null;
}
```

### Endpoint Atualizado:
**PUT /api/fluxo-caixa/:id** agora aceita `valorEsperado`:

```json
{
  "valorEsperado": 380.00,
  "valorRetirado": 375.00,
  "conferencia": "nao_bateu",
  "observacoes": "Ajuste manual no valor esperado"
}
```

---

## 🎨 Implementação Frontend

### 1. Atualizar Estado do Formulário

No componente `ItemFluxoCaixa`, adicione `valorEsperado` ao estado:

```jsx
function ItemFluxoCaixa({ fluxo, onConferir }) {
  const [editando, setEditando] = useState(false);
  const [formConferencia, setFormConferencia] = useState({
    valorEsperado: fluxo.valorEsperado || fluxo.movimentacao?.valorFaturado || 0, // ✨ NOVO
    valorRetirado: fluxo.valorRetirado || '',
    conferencia: fluxo.conferencia || 'pendente',
    observacoes: fluxo.observacoes || ''
  });

  // Calcular diferença dinamicamente
  const diferenca = formConferencia.valorRetirado 
    ? parseFloat(formConferencia.valorRetirado) - parseFloat(formConferencia.valorEsperado)
    : 0;

  // ... resto do código
}
```

### 2. Tornar Coluna "Valor Esperado" Editável

Modifique a célula da tabela para mostrar input quando em modo edição:

```jsx
<td className="valor-esperado">
  {editando ? (
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
        className="input-valor"
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
```

### 3. Atualizar Função de Salvar

Inclua `valorEsperado` na chamada ao backend:

```jsx
const handleSalvar = () => {
  if (!formConferencia.valorRetirado) {
    alert('⚠️ Digite o valor retirado');
    return;
  }

  if (!formConferencia.valorEsperado) {
    alert('⚠️ Digite o valor esperado');
    return;
  }

  if (formConferencia.conferencia === 'pendente') {
    alert('⚠️ Selecione se o valor bateu ou não bateu');
    return;
  }

  onConferir(
    fluxo.id,
    formConferencia.valorEsperado,  // ✨ NOVO
    formConferencia.valorRetirado,
    formConferencia.conferencia,
    formConferencia.observacoes
  );
  setEditando(false);
};
```

### 4. Atualizar Função de Conferência no Componente Pai

```jsx
const conferirFluxo = async (fluxoId, valorEsperado, valorRetirado, conferencia, observacoes) => {
  try {
    const response = await fetch(`/api/fluxo-caixa/${fluxoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        valorEsperado: parseFloat(valorEsperado),  // ✨ NOVO
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
```

---

## 🎨 Estilos CSS Adicionais

```css
/* Input de valor esperado */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-label {
  font-size: 11px;
  color: #666;
  font-weight: 600;
}

/* Badge de valor editado */
.badge-warning {
  background: #fff3cd;
  color: #856404;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 5px;
}

/* Destaque visual quando editando */
td.valor-esperado input {
  border: 2px solid #ffc107;
}

td.valor-retirado input {
  border: 2px solid #007bff;
}
```

---

## 📊 Exemplo Visual da Tabela em Modo Edição

```
┌─────────┬────────────┬─────────────┬──────────────────┬──────────────────┬────────────┐
│  Data   │    Loja    │   Máquina   │  Valor Esperado  │  Valor Retirado  │   Status   │
├─────────┼────────────┼─────────────┼──────────────────┼──────────────────┼────────────┤
│ 10/03   │ Centro     │ MAQ-001     │ [  380.00   ]    │ [  375.00   ]    │ [Não Bateu]│
│         │            │             │  (editável 🟡)   │  (editável 🔵)   │            │
└─────────┴────────────┴─────────────┴──────────────────┴──────────────────┴────────────┘
                                          ↓                     ↓
                                   Diferença: -R$ 5,00
```

---

## 💡 Casos de Uso

### Quando Usar Valor Esperado Editável:

1. **Erro no Cálculo Automático**: Quando o `valorFaturado` da movimentação foi registrado incorretamente
2. **Descontos/Ajustes**: Quando há descontos ou ajustes que não foram contabilizados
3. **Correções Manuais**: Quando o admin sabe que o valor real difere do calculado
4. **Máquinas com Problemas**: Quando a máquina tem problemas de contador

### Comportamento Padrão:

- Se `valorEsperado` for `null`, o sistema usa automaticamente `valorFaturado` da movimentação
- Quando o admin edita, o valor customizado é salvo no banco de dados
- Um badge "✏️ Editado" aparece indicando que foi ajustado manualmente
- A diferença é recalculada automaticamente: `diferença = valorRetirado - valorEsperado`

---

## ✅ Checklist de Implementação

- [ ] Adicionar campo `valorEsperado` no estado do formulário
- [ ] Tornar célula "Valor Esperado" editável com input
- [ ] Adicionar badge visual quando valor foi editado manualmente
- [ ] Atualizar cálculo de diferença para usar `valorEsperado` editado
- [ ] Incluir `valorEsperado` na requisição PUT
- [ ] Adicionar validação: ambos os valores devem estar preenchidos
- [ ] Testar comportamento: valor padrão → valor editado → salvar
- [ ] Aplicar estilos para inputs editáveis (cores diferentes)

---

## 🎯 Exemplo de Payload Completo

**PUT /api/fluxo-caixa/:id**

```json
{
  "valorEsperado": 380.00,
  "valorRetirado": 375.00,
  "conferencia": "nao_bateu",
  "observacoes": "Ajustado valor esperado manualmente. Houve desconto de R$ 5,00 aplicado na máquina."
}
```

**Resposta (200 OK)**

```json
{
  "id": "uuid-fluxo",
  "movimentacaoId": "uuid-movimentacao",
  "valorEsperado": 380.00,
  "valorRetirado": 375.00,
  "conferencia": "nao_bateu",
  "observacoes": "Ajustado valor esperado manualmente. Houve desconto de R$ 5,00 aplicado na máquina.",
  "conferidoPor": "uuid-admin",
  "dataConferencia": "2026-03-11T15:30:00.000Z"
}
```

---

**📅 Data de criação**: 11/03/2026  
**🔧 Backend atualizado**: ✅ Sim  
**🗄️ Banco de dados**: Execute novamente `migration-fluxo-caixa.sql` (tem DROP TABLE IF EXISTS)
