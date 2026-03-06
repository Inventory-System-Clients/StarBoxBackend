# 📋 Como Puxar Contas a Pagar Hoje

## Endpoint Principal

```
GET /financeiro/reports/dashboard
```

**Autenticação:** Bearer Token obrigatório  
**Acesso:** Bloqueado para GERENCIADOR (apenas ADMIN, FUNCIONARIO e MANUTENCAO)

---

## Resposta do Endpoint

O endpoint retorna um objeto JSON com diversos campos, incluindo os novos campos de alertas:

```json
{
  "total_paid": 15000.50,
  "total_open": 8500.75,
  "totalBills": 58,
  "upcoming_bills": 12,
  "overdue_bills": 3,
  
  // 🆕 CAMPOS PARA ALERTAS DE VENCIMENTO
  "bills_due_today": 2,           // ← Quantidade de contas que vencem HOJE
  "amount_due_today": 3500.00,    // ← Valor total das contas que vencem HOJE
  
  "bills_due_3_days": 5,          // Quantidade nos próximos 3 dias
  "amount_due_3_days": 7200.00,   // Valor total nos próximos 3 dias
  
  "bills_up_to_date": 45,         // Quantidade de contas em dia
  "amount_up_to_date": 12000.00,  // Valor total de contas em dia
  
  "bills_by_category": [...],
  "bills_by_date": [...]
}
```

---

## Exemplo de Requisição

### JavaScript/Fetch

```javascript
const token = localStorage.getItem('token');

fetch('https://sua-api.com/financeiro/reports/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  // Acessar contas a pagar hoje
  const contasHoje = data.bills_due_today;
  const valorHoje = data.amount_due_today;
  
  console.log(`Você tem ${contasHoje} contas para pagar hoje`);
  console.log(`Valor total: R$ ${valorHoje.toFixed(2)}`);
})
.catch(error => {
  console.error('Erro ao buscar dashboard:', error);
});
```

### Axios

```javascript
import axios from 'axios';

const token = localStorage.getItem('token');

try {
  const response = await axios.get('/financeiro/reports/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { bills_due_today, amount_due_today } = response.data;
  
  // Usar os dados no componente
  setBillsDueToday(bills_due_today);
  setAmountDueToday(amount_due_today);
  
} catch (error) {
  console.error('Erro:', error);
}
```

---

## Renderizando no Frontend

### React Component

```jsx
import { useEffect, useState } from 'react';

function ContasAPagarHoje() {
  const [bills, setBills] = useState(0);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/financeiro/reports/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        setBills(data.bills_due_today);
        setAmount(data.amount_due_today);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="card-alerta-vermelho">
      <div className="icon">🔴</div>
      <h3>Contas a Pagar HOJE!</h3>
      <p className="quantidade">{bills} contas</p>
      <p className="valor">
        R$ {amount.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
      </p>
    </div>
  );
}

export default ContasAPagarHoje;
```

---

## Detalhamento dos Campos

### 1. `bills_due_today` (número)
- **Tipo:** Integer
- **Descrição:** Quantidade de contas com status "Em Aberto" ou "pending" que vencem HOJE (data atual)
- **Exemplo:** `2`
- **Caso de uso:** Mostrar badge/contador no card

### 2. `amount_due_today` (número)
- **Tipo:** Decimal/Float
- **Descrição:** Soma do valor de todas as contas que vencem HOJE
- **Exemplo:** `3500.00`
- **Caso de uso:** Mostrar valor total formatado em reais

---

## Status de Contas Suportados

O backend reconhece os seguintes status (case-insensitive):

| Status em Português | Status em Inglês | Significado |
|---------------------|------------------|-------------|
| **Em Aberto** | pending | Conta não paga |
| **Pago** | paid | Conta já paga |

**Importante:** O sistema é bilíngue! Pode usar status em português ou inglês.

---

## Lógica de Cálculo (Backend)

### Contas que vencem HOJE são:
```
✅ Status = "Em Aberto" ou "pending"
✅ Data de vencimento = Data atual do servidor
❌ NÃO inclui contas atrasadas (vencimento < hoje)
❌ NÃO inclui contas já pagas
```

### Exemplo:
```
Data Atual: 06/03/2026

Conta 1:
- Vencimento: 06/03/2026
- Status: Em Aberto
- Valor: R$ 2.000,00
→ INCLUÍDA em bills_due_today ✅

Conta 2:
- Vencimento: 06/03/2026
- Status: Pago
- Valor: R$ 1.500,00
→ NÃO INCLUÍDA (já foi paga) ❌

Conta 3:
- Vencimento: 05/03/2026 (ontem)
- Status: Em Aberto
- Valor: R$ 500,00
→ NÃO INCLUÍDA (está atrasada, vai para overdue_bills) ❌

Conta 4:
- Vencimento: 07/03/2026 (amanhã)
- Status: Em Aberto
- Valor: R$ 800,00
→ NÃO INCLUÍDA (vence amanhã) ❌

Resultado:
bills_due_today = 1
amount_due_today = 2000.00
```

---

## Comparação: Todos os 3 Cards

```javascript
const response = await fetch('/financeiro/reports/dashboard');
const data = await response.json();

// 🔴 Card 1: Contas a pagar HOJE
const cardHoje = {
  titulo: "Contas a Pagar HOJE!",
  quantidade: data.bills_due_today,
  valor: data.amount_due_today,
  cor: "vermelho",
  prioridade: "alta"
};

// 🟡 Card 2: Contas a pagar em 3 dias
const card3Dias = {
  titulo: "Contas a Pagar em 3 Dias!",
  quantidade: data.bills_due_3_days,
  valor: data.amount_due_3_days,
  cor: "amarelo",
  prioridade: "média"
};

// 🟢 Card 3: Contas em dia
const cardEmDia = {
  titulo: "Contas em Dia",
  quantidade: data.bills_up_to_date,
  valor: data.amount_up_to_date,
  cor: "verde",
  prioridade: "baixa"
};
```

---

## Tratamento de Erros

```javascript
try {
  const response = await fetch('/financeiro/reports/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token inválido ou expirado
      console.error('Não autenticado. Faça login novamente.');
      // Redirecionar para login
      window.location.href = '/login';
      return;
    }
    
    if (response.status === 403) {
      // Usuário bloqueado (ex: GERENCIADOR)
      console.error('Você não tem permissão para acessar esta funcionalidade.');
      return;
    }
    
    throw new Error(`Erro HTTP: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Validar se os campos existem
  if (typeof data.bills_due_today === 'undefined') {
    console.warn('Campo bills_due_today não encontrado na resposta');
    // Usar valor padrão
    setBillsDueToday(0);
    setAmountDueToday(0);
  } else {
    setBillsDueToday(data.bills_due_today);
    setAmountDueToday(data.amount_due_today);
  }
  
} catch (error) {
  console.error('Erro ao buscar dashboard:', error);
  // Mostrar mensagem de erro ao usuário
  setError('Não foi possível carregar as contas. Tente novamente.');
}
```

---

## Formatação de Valores

### Formatar moeda brasileira

```javascript
// Opção 1: toLocaleString
const valorFormatado = amount_due_today.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
// Resultado: "R$ 3.500,00"

// Opção 2: Intl.NumberFormat
const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
const valorFormatado = formatter.format(amount_due_today);
// Resultado: "R$ 3.500,00"

// Opção 3: Apenas número com separadores
const valorFormatado = amount_due_today.toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
// Resultado: "3.500,00"
```

---

## Atualização em Tempo Real

### Polling (verificar a cada X segundos)

```javascript
useEffect(() => {
  const fetchDashboard = async () => {
    // ... código de fetch
  };
  
  // Buscar imediatamente
  fetchDashboard();
  
  // Atualizar a cada 5 minutos
  const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

### Atualização manual

```javascript
const [lastUpdate, setLastUpdate] = useState(new Date());

const refreshDashboard = async () => {
  await fetchDashboard();
  setLastUpdate(new Date());
};

return (
  <div>
    <button onClick={refreshDashboard}>🔄 Atualizar</button>
    <small>Última atualização: {lastUpdate.toLocaleTimeString()}</small>
  </div>
);
```

---

## Cache e Performance

```javascript
// Usar React Query para cache automático
import { useQuery } from '@tanstack/react-query';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-financeiro'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/financeiro/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache válido por 5 minutos
    refetchInterval: 5 * 60 * 1000, // Refetch automático a cada 5 minutos
  });
}

// Usar no componente
function ContasAPagarHoje() {
  const { data, isLoading, error } = useDashboard();
  
  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;
  
  return (
    <div>
      <h3>Contas a Pagar HOJE!</h3>
      <p>{data.bills_due_today} contas</p>
      <p>R$ {data.amount_due_today.toFixed(2)}</p>
    </div>
  );
}
```

---

## Logs de Debug (Backend)

Ao fazer requisição, o backend registra logs úteis:

```
[Dashboard] Data atual: 2026-03-06
[Dashboard] Total de contas: 58
[Dashboard] Contas com vencimento hoje (2026-03-06): [
  {
    id: 123,
    name: 'Insumos Gira Kids',
    status: 'Em Aberto',
    value: 2000,
    due_date: '2026-03-06'
  }
]
[Dashboard] Conta vencendo HOJE: {
  id: 123,
  name: 'Insumos Gira Kids',
  status: 'Em Aberto',
  isPaid: false,
  isPending: true
}
[Dashboard] Resumo de alertas: {
  bills_due_today: 1,
  amount_due_today: 2000,
  bills_due_3_days: 3,
  amount_due_3_days: 5200,
  bills_up_to_date: 54,
  amount_up_to_date: 35000
}
```

---

## Troubleshooting

### Problema: Campo retorna 0 mas deveria mostrar contas

**Possíveis causas:**

1. **Status em formato incorreto**
   - ✅ Correto: "Em Aberto" ou "pending"
   - ❌ Errado: "Aberto", "Pendente", "Open"

2. **Data de vencimento em formato incorreto**
   - ✅ Correto: "2026-03-06" (formato YYYY-MM-DD)
   - ❌ Errado: "06/03/2026", "06-03-2026"

3. **Timezone do servidor diferente**
   - Verificar se o servidor está na timezone correta

4. **Conta já foi paga**
   - Contas com status "Pago" não aparecem em bills_due_today

### Problema: Erro 403 Forbidden

**Causa:** Usuário com role GERENCIADOR tentando acessar

**Solução:** Financeiro é bloqueado para gerenciadores. Use ADMIN, FUNCIONARIO ou MANUTENCAO.

---

## Resumo Rápido

```javascript
// 1. Fazer requisição
const response = await fetch('/financeiro/reports/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Pegar dados
const data = await response.json();

// 3. Usar no card
const contasHoje = data.bills_due_today;      // Número de contas
const valorHoje = data.amount_due_today;      // Valor total

// 4. Exibir
console.log(`${contasHoje} contas | R$ ${valorHoje.toFixed(2)}`);
```

---

## Estrutura Completa do Dashboard

```typescript
interface DashboardResponse {
  total_paid: number;           // Total pago
  total_open: number;           // Total em aberto
  totalBills: number;           // Total de contas
  upcoming_bills: number;       // Próximas 7 dias
  overdue_bills: number;        // Atrasadas
  
  // 🆕 Alertas de vencimento
  bills_due_today: number;      // Contas que vencem HOJE
  amount_due_today: number;     // Valor total HOJE
  bills_due_3_days: number;     // Contas próximos 3 dias
  amount_due_3_days: number;    // Valor próximos 3 dias
  bills_up_to_date: number;     // Contas em dia
  amount_up_to_date: number;    // Valor em dia
  
  bills_by_category: Array<{
    category: string;
    total: number;
  }>;
  
  bills_by_date: Array<{
    date: string;
    count: number;
  }>;
}
```

---

## ✅ Checklist de Implementação

- [ ] Configurar autenticação (Bearer Token)
- [ ] Criar requisição GET para `/financeiro/reports/dashboard`
- [ ] Extrair `bills_due_today` da resposta
- [ ] Extrair `amount_due_today` da resposta
- [ ] Formatar valor em reais (R$ X.XXX,XX)
- [ ] Renderizar no card vermelho "Contas a Pagar HOJE!"
- [ ] Tratar erros (401, 403, 500)
- [ ] Adicionar loading state
- [ ] (Opcional) Implementar atualização automática
- [ ] (Opcional) Adicionar cache

---

**Documentação criada em:** 06/03/2026  
**Última atualização:** 06/03/2026  
**Versão da API:** 1.0
