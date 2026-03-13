# PROMPT FRONTEND - Gastos Diários no Executar Roteiro + Aba no Dashboard Admin

## Objetivo
Implementar no frontend:
1. Registro de gastos diários durante a execução de roteiro pelo funcionário.
2. Exibição do saldo restante baseado em um orçamento diário do roteiro.
3. Edição do orçamento diário por admin (valor padrão: 2000).
4. Nova aba no dashboard admin para listar gastos com detalhes (roteiro, funcionário, data e hora).

---

## Regras de negócio
- Cada roteiro possui `orcamentoDiario` (default `2000.00`).
- Cada gasto lançado desconta do saldo diário do roteiro.
- Não permitir lançar gasto acima do saldo disponível (backend já valida).
- Categorias válidas:
  - `transporte`
  - `estadia`
  - `abastecimento`
  - `alimentacao`
  - `outros`
- Observação do gasto é opcional.

---

## Endpoints do backend

### 1) Buscar execução do roteiro (já inclui resumo de gastos do dia)
`GET /api/roteiros/:id/executar`

Resposta (campos relevantes):
```json
{
  "id": "uuid",
  "nome": "Roteiro Centro",
  "observacao": "Observação do admin",
  "orcamentoDiario": 2000,
  "totalGastoHoje": 350.75,
  "saldoGastoHoje": 1649.25,
  "gastosHoje": [
    {
      "id": "uuid",
      "categoria": "alimentacao",
      "valor": 45.90,
      "observacao": "Almoço equipe",
      "dataHora": "2026-03-13T14:10:00.000Z",
      "usuario": { "id": "uuid", "nome": "João" }
    }
  ]
}
```

### 2) Listar gastos do roteiro em um dia
`GET /api/roteiros/:id/gastos?data=AAAA-MM-DD`

Resposta:
```json
{
  "roteiro": { "id": "uuid", "nome": "Roteiro Centro" },
  "data": "2026-03-13",
  "categoriasDisponiveis": ["transporte", "estadia", "abastecimento", "alimentacao", "outros"],
  "orcamentoDiario": 2000,
  "totalGasto": 350.75,
  "saldoDisponivel": 1649.25,
  "gastos": []
}
```

### 3) Lançar gasto diário no roteiro
`POST /api/roteiros/:id/gastos`

Body:
```json
{
  "categoria": "transporte",
  "valor": 120.50,
  "observacao": "Uber entre lojas"
}
```

Sucesso:
```json
{
  "message": "Gasto diário registrado com sucesso",
  "gasto": {
    "id": "uuid",
    "categoria": "transporte",
    "valor": 120.5,
    "observacao": "Uber entre lojas",
    "dataHora": "2026-03-13T15:22:11.000Z"
  },
  "resumoDia": {
    "data": "2026-03-13",
    "orcamentoDiario": 2000,
    "totalGasto": 471.25,
    "saldoDisponivel": 1528.75
  }
}
```

Erro de saldo insuficiente (`400`):
```json
{
  "error": "Saldo diário insuficiente para este lançamento",
  "orcamentoDiario": 2000,
  "totalGastoAtual": 1950,
  "saldoDisponivel": 50
}
```

### 4) Atualizar orçamento diário (somente admin)
`PATCH /api/roteiros/:id/orcamento-diario`

Body:
```json
{
  "orcamentoDiario": 2500
}
```

### 5) Nova aba do dashboard admin - gastos de roteiros
`GET /api/dashboard/gastos-roteiros?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD&roteiroId=&usuarioId=&categoria=`

Resposta:
```json
{
  "totalRegistros": 10,
  "totalValor": 1250.90,
  "gastos": [
    {
      "id": "uuid",
      "categoria": "abastecimento",
      "valor": 300,
      "observacao": "Posto X",
      "dataHora": "2026-03-13T11:30:00.000Z",
      "roteiro": { "id": "uuid", "nome": "Roteiro Zona Sul" },
      "usuario": { "id": "uuid", "nome": "Maria" }
    }
  ]
}
```

---

## Implementação no frontend

## 1) Tela de executar roteiro (funcionário)
- Ao carregar a tela, chamar `GET /api/roteiros/:id/executar`.
- Exibir card de gastos com:
  - Orçamento diário
  - Total gasto hoje
  - Saldo disponível
- Exibir formulário para lançar gasto:
  - Select categoria (5 opções)
  - Input valor (decimal)
  - Textarea observação (opcional)
  - Botão `Lançar gasto`
- Após salvar com sucesso:
  - atualizar lista de gastos do dia
  - atualizar total e saldo

Exemplo de estado:
```jsx
const [gastoForm, setGastoForm] = useState({
  categoria: 'transporte',
  valor: '',
  observacao: '',
});
```

Exemplo submit:
```jsx
const handleLancarGasto = async () => {
  await api.post(`/roteiros/${roteiroId}/gastos`, {
    categoria: gastoForm.categoria,
    valor: Number(gastoForm.valor),
    observacao: gastoForm.observacao?.trim() || null,
  });

  await carregarExecucaoRoteiro();
};
```

## 2) Tela admin de edição do roteiro
- Adicionar campo `Orçamento diário` no formulário de roteiro.
- Ao salvar, usar endpoint:
  - `PATCH /api/roteiros/:id/orcamento-diario`

## 3) Dashboard admin - nova aba "Gastos de Roteiro"
- Criar nova aba no dashboard, no mesmo padrão da aba de revisões de veículos.
- Tabela com colunas:
  - Roteiro
  - Funcionário
  - Categoria
  - Valor
  - Observação
  - Data
  - Hora
- Fonte de dados: `GET /api/dashboard/gastos-roteiros`
- Adicionar filtros de período, roteiro, funcionário e categoria.

---

## UX recomendada
- Mostrar valores em Real (R$) com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Destacar saldo:
  - verde quando saldo positivo alto
  - amarelo quando saldo < 25%
  - vermelho quando saldo <= 0
- Confirmar envio do gasto com feedback de loading e toast de sucesso/erro.

---

## Checklist
- [ ] Form de gastos na execução do roteiro
- [ ] Select de categoria com 5 opções
- [ ] Input de valor decimal
- [ ] Observação opcional
- [ ] Atualização visual do saldo após lançar
- [ ] Campo de orçamento diário editável pelo admin
- [ ] Nova aba no dashboard para listar gastos
- [ ] Exibir roteiro, funcionário, data e hora no dashboard
- [ ] Filtros na aba de gastos
