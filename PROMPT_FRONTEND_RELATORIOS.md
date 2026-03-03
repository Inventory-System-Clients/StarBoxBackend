# PROMPT FRONTEND — Correção dos Cards "Resumo Geral da Loja" na Tela de Relatórios

## Problema Atual

Na tela de relatórios da loja, os 3 cards de "Resumo Geral da Loja" estão mostrando **R$ 0,00** para:
- **Card 1** (verde): Dinheiro + Cartão/Pix
- **Card 2** (azul): Fichas (Qtd e Valor unitário)
- **Card 3** (vermelho): Produtos saídos

Porém, a tabela de **Comissão da Loja** logo abaixo mostra valores corretos (ex: MAQTESTE5 R$ 534,00, MAQTESTE6 R$ 589,98). Isso significa que os dados existem no backend, mas os cards estão puxando de um endpoint errado ou mapeando os campos incorretamente.

---

## Campos de Valor no Model Produto

O model **Produto** tem dois campos de preço:
- `custoUnitario` — Custo do produto (DECIMAL 10,2)
- `preco` — Preço de venda (DECIMAL 10,2)

Ambos agora são retornados pelo endpoint `/relatorios/impressao` como:
- `valorUnitario` = custoUnitario (custo do produto)
- `preco` = preço de venda

**Para o cálculo do card "Produtos saídos", usar `valorUnitario` (custo unitário)**, pois esse é o mesmo valor usado pelo endpoint `lucro-dia` para calcular `custoProdutos`.

---

## Endpoint 1: `/api/relatorios/impressao` (Dados detalhados por produto)

### Endpoint
```
GET /api/relatorios/impressao?lojaId={ID}&dataInicio={YYYY-MM-DD}&dataFim={YYYY-MM-DD}
```

### Resposta — `produtosSairam[]` (ATUALIZADO)
Cada produto agora retorna `valorUnitario` e `preco`:
```json
{
  "produtosSairam": [
    {
      "id": "uuid-do-produto",
      "nome": "ProdutoTeste1",
      "codigo": "ProdutoTeste1",
      "emoji": "🧸",
      "quantidade": 2366,
      "valorUnitario": 2.50,
      "preco": 5.00
    }
  ],
  "produtosEntraram": [
    {
      "id": "uuid-do-produto",
      "nome": "ProdutoTeste2",
      "codigo": "ProdutoTeste2",
      "emoji": "🎈",
      "quantidade": 100,
      "valorUnitario": 1.80,
      "preco": 3.50
    }
  ],
  "maquinas": [
    {
      "maquina": { "id": 1, "codigo": "MAQ01", "nome": "MAQTESTE5" },
      "totais": { "fichas": 50, "produtosSairam": 120, "produtosEntraram": 30, "movimentacoes": 3, "dinheiro": 0, "cartaoPix": 0 },
      "produtosSairam": [
        {
          "id": "uuid",
          "nome": "ProdutoTeste1",
          "codigo": "ProdutoTeste1",
          "emoji": "🧸",
          "quantidade": 80,
          "valorUnitario": 2.50,
          "preco": 5.00
        }
      ],
      "produtosEntraram": [...]
    }
  ]
}
```

### Cálculo do Card "Produtos Saídos" usando este endpoint
```javascript
// Calcular valor total dos produtos que saíram
const totalProdutosSaidos = produtosSairam.reduce((acc, produto) => {
  return acc + (produto.quantidade * produto.valorUnitario);
}, 0);
```

---

## Endpoint 2: `/api/movimentacao/relatorio/lucro-dia` (Resumo financeiro completo)

Os 3 cards de resumo podem usar **qualquer um dos dois endpoints**, dependendo do que já estiver disponível na tela:

### Opção A: Usar `/api/movimentacao/relatorio/lucro-dia` (RECOMENDADO — valor já calculado)

### Endpoint
```
GET /api/movimentacao/relatorio/lucro-dia?lojaId={ID_DA_LOJA}&data={YYYY-MM-DD}
```

### Headers
```
Authorization: Bearer {TOKEN}
```

### Exemplo de chamada
```javascript
const response = await api.get('/movimentacao/relatorio/lucro-dia', {
  params: {
    lojaId: lojaIdSelecionada,
    data: dataSelecionada // formato "2026-03-03"
  }
});
const dados = response.data;
```

### Resposta do Backend
```json
{
  "lojaId": 1,
  "data": "2026-03-03",
  "receitaBruta": 1123.98,
  "detalhesReceita": {
    "fichasQuantidade": 150,
    "fichasValor": 375.00,
    "dinheiro": 200.50,
    "pixCartao": 548.48
  },
  "custoProdutos": 85.00,
  "comissaoTotal": 171.24,
  "custosFixos": 0,
  "custosVariaveis": 0,
  "lucroTotal": 867.74
}
```

---

## Mapeamento dos Cards

### Card 1 — "Total recebido em dinheiro, cartão e pix" (verde)
```javascript
// Valor principal (grande): receitaBruta = dinheiro + pixCartao + fichasValor
const totalRecebido = dados.receitaBruta;

// Sub-label "Dinheiro":
const dinheiro = dados.detalhesReceita.dinheiro;

// Sub-label "Cartão/Pix":
const cartaoPix = dados.detalhesReceita.pixCartao;
```

**Renderização:**
```
R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
[Dinheiro: R$ {dinheiro}]  [Cartão/Pix: R$ {cartaoPix}]
```

### Card 2 — "Total em fichas vendidas" (azul)
```javascript
// Valor principal: total em R$ das fichas
const fichasValorTotal = dados.detalhesReceita.fichasValor;

// Sub-label "Qtd": quantidade de fichas
const fichasQtd = dados.detalhesReceita.fichasQuantidade;

// Sub-label "Valor unitário": calcular ou usar valor fixo da máquina
// Como podem haver máquinas com valorFicha diferente, usar a divisão:
const valorUnitario = fichasQtd > 0 ? (fichasValorTotal / fichasQtd) : 0;
```

**Renderização:**
```
R$ {fichasValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
[Qtd: {fichasQtd}]  [Valor unitário: R$ {valorUnitario.toFixed(2)}]
```

### Card 3 — "Valor total dos produtos que saíram" (vermelho)

**Opção A — Usando `lucro-dia` (valor já calculado no backend):**
```javascript
const produtosSaidos = dados.custoProdutos;
```

**Opção B — Usando `relatorios/impressao` (cálculo no frontend com detalhes por produto):**
```javascript
// Se já tem os dados de /relatorios/impressao carregados:
const totalProdutosSaidos = dadosImpressao.produtosSairam.reduce((acc, produto) => {
  return acc + (produto.quantidade * produto.valorUnitario);
}, 0);
```

Ambas opções retornam o mesmo valor, pois usam a mesma fórmula: `SUM(quantidade × custoUnitario)`.

A Opção B é útil quando você quer mostrar o **detalhamento por produto** (lista de produtos com nome, quantidade e valor individual) além do total.

---

## Código de Exemplo Completo (React)

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api'; // axios instance com baseURL e token

function ResumoGeralLoja({ lojaId, data }) {
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lojaId) return;
    
    const fetchResumo = async () => {
      setLoading(true);
      try {
        const { data: dados } = await api.get('/movimentacao/relatorio/lucro-dia', {
          params: { lojaId, data }
        });
        setResumo(dados);
      } catch (err) {
        console.error('Erro ao buscar resumo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResumo();
  }, [lojaId, data]);

  if (loading || !resumo) return <p>Carregando...</p>;

  const fmt = (v) => (v || 0).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, maximumFractionDigits: 2 
  });

  return (
    <div className="resumo-cards">
      {/* Card 1 - Dinheiro + Cartão/Pix (verde) */}
      <div className="card card-verde">
        <h2>R$ {fmt(resumo.receitaBruta)}</h2>
        <span>Dinheiro: R$ {fmt(resumo.detalhesReceita.dinheiro)}</span>
        <span>Cartão/Pix: R$ {fmt(resumo.detalhesReceita.pixCartao)}</span>
        <p>Total recebido em dinheiro, cartão e pix</p>
      </div>

      {/* Card 2 - Fichas (azul) */}
      <div className="card card-azul">
        <h2>R$ {fmt(resumo.detalhesReceita.fichasValor)}</h2>
        <span>Qtd: {resumo.detalhesReceita.fichasQuantidade}</span>
        <span>Valor unitário: R$ {fmt(
          resumo.detalhesReceita.fichasQuantidade > 0
            ? resumo.detalhesReceita.fichasValor / resumo.detalhesReceita.fichasQuantidade
            : 0
        )}</span>
        <p>Total em fichas vendidas</p>
      </div>

      {/* Card 3 - Produtos (vermelho) */}
      <div className="card card-vermelho">
        <h2>R$ {fmt(resumo.custoProdutos)}</h2>
        <p>Valor total dos produtos que saíram</p>
      </div>
    </div>
  );
}

export default ResumoGeralLoja;
```

---

## Resumo das Fontes de Dados por Seção da Tela

| Seção da Tela | Endpoint | Campos Usados |
|---|---|---|
| Card Dinheiro/Cartão/Pix | `GET /movimentacao/relatorio/lucro-dia` | `receitaBruta`, `detalhesReceita.dinheiro`, `detalhesReceita.pixCartao` |
| Card Fichas | `GET /movimentacao/relatorio/lucro-dia` | `detalhesReceita.fichasValor`, `detalhesReceita.fichasQuantidade` |
| Card Produtos Saídos (total) | `GET /movimentacao/relatorio/lucro-dia` | `custoProdutos` |
| Card Produtos Saídos (detalhado) | `GET /relatorios/impressao` | `produtosSairam[].quantidade`, `produtosSairam[].valorUnitario` |
| Tabela Comissão da Loja | `GET /movimentacao/relatorio/comissao-dia` | `detalhesPorMaquina[].maquinaNome`, `.receitaTotal`, `.percentualComissao`, `.comissaoTotal`, `comissaoTotal` (total geral) |
| Lucro Líquido (se existir) | `GET /movimentacao/relatorio/lucro-dia` | `lucroTotal` |
| Detalhes por Máquina + Produtos | `GET /relatorios/impressao` | `maquinas[]`, `produtosSairam[]`, `produtosEntraram[]` |

---

## ⚠️ Erros Comuns a Evitar

1. **NÃO usar** o endpoint `GET /movimentacao/relatorio/movimentacoes-dia` para os cards de resumo — esse endpoint retorna as movimentações brutas com campo `valorFaturado` que frequentemente é NULL.

2. **NÃO usar** `GET /movimentacoes` (listagem geral) para calcular totais no frontend — o cálculo correto já é feito no backend pelo endpoint `lucro-dia`.

3. **Usar UMA única chamada** ao endpoint `lucro-dia` para preencher todos os 3 cards. Não precisa fazer 3 chamadas separadas.

4. **Verificar o `lojaId`** — o endpoint retorna erro 400 se `lojaId` não for enviado.

5. **Formato da data** — enviar como `YYYY-MM-DD` (ex: `2026-03-03`). Se não enviar, o backend usa a data de hoje.
6. **Para o card de Produtos Saídos**, o campo correto é `valorUnitario` (custo unitário). **NÃO usar** `produto.preco`, `produto.valor` ou `produto.precoVenda` — esses não existem ou significam outra coisa. O campo `preco` existe mas é o preço de venda, não o custo.

7. **Fórmula do card Produtos Saídos**: `SUM(quantidade × valorUnitario)` — é a mesma fórmula usada pelo backend no `custoProdutos` do endpoint `lucro-dia`.
---

## Endpoints Disponíveis para Relatórios

| Endpoint | Descrição |
|---|---|
| `GET /api/movimentacao/relatorio/lucro-dia?lojaId=X&data=YYYY-MM-DD` | Resumo financeiro completo: receita, fichas, dinheiro, pix, custos, comissão, lucro |
| `GET /api/movimentacao/relatorio/comissao-dia?lojaId=X&data=YYYY-MM-DD` | Detalhamento de comissão por máquina |
| `GET /api/movimentacao/relatorio/movimentacoes-dia?lojaId=X&data=YYYY-MM-DD` | Lista de movimentações brutas do dia (para tabelas detalhadas) |
| `GET /api/relatorios/impressao?lojaId=X&dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` | Dados completos para PDF: produtos saídos/entrados com valorUnitario, por máquina, fichas, etc. |

---

## Respostas às Perguntas do Frontend

### 1. Qual é o nome correto do campo de valor/preço no model Produto?
O model Produto tem **dois campos**:
- `custoUnitario` (DECIMAL 10,2) — Custo do produto. **Retornado como `valorUnitario` na API.**
- `preco` (DECIMAL 10,2) — Preço de venda. **Retornado como `preco` na API.**

Para o cálculo de "produtos saídos" (card vermelho), usar `valorUnitario` (= custoUnitario).

### 2. O endpoint /relatorios/impressao já inclui esse campo?
**SIM, agora inclui.** Foi adicionado `custoUnitario` e `preco` no `attributes` do Sequelize include, e mapeado como `valorUnitario` e `preco` na resposta.

### 3. O `custoProdutos` do endpoint lucro-dia usa a mesma fórmula?
**SIM.** O cálculo é: `SUM(quantidadeSaiu × custoUnitario)` para todos os MovimentacaoProduto do dia/loja. É exatamente `quantidade × valorUnitario`.
