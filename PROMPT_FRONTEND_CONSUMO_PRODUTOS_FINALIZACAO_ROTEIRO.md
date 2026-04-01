# Prompt Frontend - Consumo de Produtos na Finalizacao de Roteiro

Implementar no frontend o uso do novo resumo de consumo de produtos retornado pelo backend ao finalizar um roteiro.

## Regra de negocio
- Quando o funcionario entra em `GET /api/roteiros/:id/executar` (acao de continuar), o backend salva o estoque total inicial do usuario no dia.
- Quando finalizar em `POST /api/roteiros/:id/finalizar`, o backend calcula:
  - `estoqueInicialTotal`: total no inicio da execucao
  - `estoqueFinalTotal`: total no final da execucao
  - `consumoTotalProdutos`: diferenca `estoqueInicialTotal - estoqueFinalTotal` (minimo 0)
- O frontend deve exibir esse valor de consumo na mensagem de resumo da finalizacao da rota.

## Endpoint de finalizacao
`POST /api/roteiros/:id/finalizar`

### Novo formato relevante da resposta
```json
{
  "success": true,
  "status": "finalizado",
  "data": "2026-04-01",
  "resumoConsumoProdutos": {
    "usuarioIdReferencia": "uuid-do-funcionario",
    "estoqueInicialTotal": 120,
    "estoqueFinalTotal": 92,
    "consumoTotalProdutos": 28
  }
}
```

## O que implementar no frontend
1. Na acao de finalizar roteiro, ler `response.resumoConsumoProdutos`.
2. Mostrar no resumo final da rota:
- `Estoque inicial: X produtos`
- `Estoque final: Y produtos`
- `Total gasto na rota: Z produtos`
3. Usar `consumoTotalProdutos` como fonte oficial para "quanto gastou".
4. Se `resumoConsumoProdutos` vier nulo/parcial (cenario legado), exibir fallback:
- `Resumo de consumo indisponivel para esta finalizacao.`

## Exemplo de uso (React)
```jsx
const finalizarRoteiro = async (roteiroId) => {
  const { data } = await api.post(`/roteiros/${roteiroId}/finalizar`);

  const resumo = data?.resumoConsumoProdutos;

  if (resumo && Number.isFinite(resumo.consumoTotalProdutos)) {
    const mensagem = [
      "Rota finalizada com sucesso.",
      `Estoque inicial: ${resumo.estoqueInicialTotal ?? "-"} produtos`,
      `Estoque final: ${resumo.estoqueFinalTotal ?? "-"} produtos`,
      `Total gasto na rota: ${resumo.consumoTotalProdutos} produtos`
    ].join("\n");

    alert(mensagem);
  } else {
    alert("Rota finalizada com sucesso. Resumo de consumo indisponivel para esta finalizacao.");
  }
};
```

## Checklist
- [ ] Ler `resumoConsumoProdutos` na resposta da finalizacao
- [ ] Exibir `consumoTotalProdutos` no resumo da finalizacao
- [ ] Tratar fallback quando nao houver dados
- [ ] Garantir que a tela de execucao continue chamando `GET /api/roteiros/:id/executar` antes da finalizacao
