# Prompt para Copilot Frontend - Estoque de Lojas no Dashboard

## 🎯 Objetivo

Adicionar uma seção no Dashboard que mostre o estoque do depósito de cada loja, permitindo visualização rápida sem precisar entrar na edição de lojas.

**Permissões**: Esta seção deve estar visível para **ADMIN e FUNCIONÁRIO** (não apenas ADMIN).

## 📡 Backend - O que já está pronto e funcionando

### Endpoints Disponíveis

#### 1. Listar estoque de uma loja

```
GET /api/estoque-lojas/:lojaId
```

**Response:**

```json
[
  {
    "id": 1,
    "lojaId": 1,
    "produtoId": 5,
    "quantidade": 50,
    "estoqueMinimo": 20,
    "createdAt": "2025-12-23T10:00:00Z",
    "updatedAt": "2025-12-23T10:00:00Z",
    "produto": {
      "id": 5,
      "nome": "Urso de Pelúcia",
      "emoji": "🧸",
      "codigo": "URO-001",
      "preco": 25.0
    }
  },
  {
    "id": 2,
    "lojaId": 1,
    "produtoId": 8,
    "quantidade": 30,
    "estoqueMinimo": 15,
    "produto": {
      "id": 8,
      "nome": "Coelho Fofinho",
      "emoji": "🐰",
      "codigo": "COE-002",
      "preco": 20.0
    }
  }
]
```

#### 2. Listar todas as lojas

```
GET /api/lojas
```

**Response:**

```json
[
  {
    "id": 1,
    "nome": "Loja Shopping Center",
    "endereco": "Av. Principal, 123",
    "ativo": true
  },
  {
    "id": 2,
    "nome": "Loja Outlet",
    "endereco": "Rua Secundária, 456",
    "ativo": true
  }
]
```

## ✅ O que preciso que você faça no Dashboard

### 1. Adicionar uma nova seção após os cards de resumo

**Visível para**: ADMIN e FUNCIONÁRIO

A seção deve mostrar:

- **Título**: "📦 Estoque dos Depósitos" ou "Estoque das Lojas"
- **Descrição**: "Visualização rápida do estoque em cada loja"
- Lista de lojas com seus estoques

### 2. Layout sugerido

Para cada loja, mostrar um card expansível (accordion) com:

**Header do card (sempre visível):**

- Nome da loja
- Total de produtos diferentes no estoque
- Total de unidades (soma de todas quantidades)
- Botão para expandir/colapsar

**Conteúdo expansível:**

- Grade/lista de produtos com:
  - Emoji do produto
  - Nome do produto
  - Código (se existir)
  - Quantidade atual
  - Estoque mínimo configurado
  - Badge visual simples (opcional)

### 3. Código de exemplo para carregar os dados

```javascript
const [lojasComEstoque, setLojasComEstoque] = useState([]);
const [loadingEstoque, setLoadingEstoque] = useState(false);

const carregarEstoqueDasLojas = async () => {
  try {
    setLoadingEstoque(true);

    // 1. Buscar todas as lojas
    const lojasRes = await api.get("/lojas");
    const lojas = lojasRes.data || [];

    // 2. Para cada loja, buscar seu estoque
    const lojasComEstoquePromises = lojas.map(async (loja) => {
      try {
        const estoqueRes = await api.get(`/estoque-lojas/${loja.id}`);
        const estoque = estoqueRes.data || [];

        return {
          ...loja,
          estoque: estoque,
          totalProdutos: estoque.length,
          totalUnidades: estoque.reduce(
            (sum, item) => sum + item.quantidade,
            0
          ),
        };
      } catch (error) {
        console.error(`Erro ao carregar estoque da loja ${loja.id}:`, error);
        return {
          ...loja,
          estoque: [],
          totalProdutos: 0,
          totalUnidades: 0,
        };
      }
    });

    const resultado = await Promise.all(lojasComEstoquePromises);
    setLojasComEstoque(resultado);
  } catch (error) {
    console.error("Erro ao carregar estoque das lojas:", error);
    setLojasComEstoque([]);
  } finally {
    setLoadingEstoque(false);
  }
};

// Chamar quando o Dashboard carregar (ADMIN e FUNCIONÁRIO)
useEffect(() => {
  if (usuario?.role === "ADMIN" || usuario?.role === "FUNCIONARIO") {
    carregarEstoqueDasLojas();
  }
}, [usuario]);
```

### 4. Exemplo de renderização (estrutura básica)

```jsx
{
  /* Estoque dos Depósitos - Para ADMIN e FUNCIONÁRIO */
}
{
  (usuario?.role === "ADMIN" || usuario?.role === "FUNCIONARIO") &&
    lojasComEstoque.length > 0 && (
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-3xl">📦</span>
          Estoque dos Depósitos
        </h2>

        <div className="space-y-4">
          {lojasComEstoque.map((loja) => (
            <div key={loja.id} className="border border-gray-200 rounded-lg">
              {/* Header - sempre visível */}
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                onClick={() => toggleLojaEstoque(loja.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{loja.nome}</h3>
                    <p className="text-sm text-gray-600">
                      {loja.totalProdutos}{" "}
                      {loja.totalProdutos === 1 ? "produto" : "produtos"} ·{" "}
                      {loja.totalUnidades} unidades totais
                    </p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Conteúdo - expansível */}
              {lojaEstoqueExpanded[loja.id] && (
                <div className="p-4 bg-white">
                  {loja.estoque.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {loja.estoque.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {item.produto.emoji || "📦"}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">
                                {item.produto.nome}
                              </p>
                              {item.produto.codigo && (
                                <p className="text-xs text-gray-500">
                                  {item.produto.codigo}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {item.quantidade}
                            </span>
                            <span className="text-xs text-gray-600">
                              mín: {item.estoqueMinimo}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Nenhum produto no estoque
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
}
```

### 5. Estado para controlar expansão (opcional)

```javascript
const [lojaEstoqueExpanded, setLojaEstoqueExpanded] = useState({});

const toggleLojaEstoque = (lojaId) => {
  setLojaEstoqueExpanded((prev) => ({
    ...prev,
    [lojaId]: !prev[lojaId],
  }));
};
```

## ⚠️ Importante - O que NÃO fazer

1. **NÃO criar alertas de estoque baixo** - apenas mostre os números
2. **NÃO usar o endpoint `/alertas`** - use apenas `/estoque-lojas/:lojaId`
3. **NÃO criar cards vermelhos/laranjas** de alerta - mantenha visual neutro
4. **NÃO adicionar badges de "estoque baixo"** - só mostre a informação

## 🎨 Sugestões de Design

### Cores neutras

- Cards em cinza claro (`bg-gray-50`)
- Bordas simples (`border-gray-200`)
- Texto padrão (sem vermelho/laranja de alerta)

### Layout

- **Compacto**: Grid de 3 colunas em tela grande
- **Responsivo**: 1 coluna em mobile, 2 em tablet
- **Expansível**: Cards colapsados por padrão para não poluir

### Informações mínimas

- Emoji do produto (visual)
- Nome do produto
- Quantidade atual (destaque)
- Estoque mínimo (informativo, sem comparação)

## 📍 Onde colocar no Dashboard

### Para ADMIN:

1. Cards de resumo (Faturamento, Fichas, Prêmios, Alertas) - **ADMIN apenas**
2. Total de Produtos Vendidos - **ADMIN apenas**
3. **📦 ESTOQUE DOS DEPÓSITOS - NOVO** (adicionar aqui) - **ADMIN e FUNCIONÁRIO**
4. Buscar Lojas e Máquinas - **Todos**
5. Alertas de Estoque em Máquinas - **ADMIN apenas**
6. Alertas de Estoque nas Lojas - **ADMIN apenas**
7. Performance por Loja - **ADMIN apenas**

### Para FUNCIONÁRIO:

1. **📦 ESTOQUE DOS DEPÓSITOS** - mostrar no topo
2. Buscar Lojas e Máquinas

**Importante**: Os cards de estatísticas, gráficos e relatórios devem permanecer **apenas para ADMIN**.

## ✅ Checklist

- [ ] Criar função `carregarEstoqueDasLojas()`
- [ ] Adicionar estados: `lojasComEstoque`, `loadingEstoque`, `lojaEstoqueExpanded`
- [ ] Criar seção com título "Estoque dos Depósitos"
- [ ] Implementar cards expansíveis por loja
- [ ] Mostrar total de produtos e unidades por loja
- [ ] Grid de produtos com emoji, nome, quantidade e mínimo
- [ ] Garantir que ADMIN e FUNCIONÁRIO veem esta seção
- [ ] Manter cards de estatísticas/relatórios/alertas apenas para ADMIN
- [ ] Design neutro, SEM indicadores de alerta
- [ ] Responsividade mobile/tablet/desktop

## 🧪 Como testar

### Como ADMIN:

1. Faça login como ADMIN
2. Acesse o Dashboard
3. Verifique que vê: cards de estatísticas + estoque dos depósitos
4. Role até a seção "Estoque dos Depósitos"
5. Clique em uma loja para expandir
6. Verifique se mostra os produtos corretos

### Como FUNCIONÁRIO:

1. Faça login como FUNCIONÁRIO
2. Acesse o Dashboard
3. Verifique que NÃO vê: cards de estatísticas, gráficos, alertas
4. Verifique que VÊ: seção "Estoque dos Depósitos" (no topo)
5. Clique em uma loja para expandir
6. Verifique acesso completo ao estoque

### Testes gerais:

7. Teste com lojas sem estoque (deve mostrar mensagem)
8. Teste responsividade em diferentes tamanhos de tela

## 📝 Observações

- Esta é uma **visualização rápida** do estoque
- Para **editar** estoque, o usuário deve ir em `/lojas/:id/editar`
- O endpoint retorna automaticamente os dados do produto incluídos
- Não é necessário fazer join ou busca adicional de produtos
- Performance: carrega dados de todas as lojas de uma vez (OK se forem poucas lojas)

### Permissões importantes:

- **FUNCIONÁRIO**: Acesso a lojas, máquinas e estoque (sem relatórios/gráficos)
- **ADMIN**: Acesso completo a tudo
- Cards de estatísticas, gráficos e alertas devem continuar apenas para ADMIN

---

**Objetivo final**: Permitir que o ADMIN veja rapidamente o estoque de todas as lojas sem precisar entrar na edição individual de cada uma, mas de forma informativa e não alarmista.
