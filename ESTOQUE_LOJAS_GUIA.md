# 📦 Sistema de Estoque de Lojas - Guia de Implementação

## ✅ O que foi implementado

### Backend (já deployado no Render)

1. **Modelo EstoqueLoja** (`src/models/EstoqueLoja.js`)

   - Relaciona lojas com produtos
   - Armazena quantidade atual e estoque mínimo
   - Previne duplicatas com constraint único (lojaId + produtoId)

2. **Controller** (`src/controllers/estoqueLojaController.js`)

   - `GET /api/estoque-lojas/:lojaId` - Lista estoque da loja
   - `GET /api/estoque-lojas/:lojaId/alertas` - Produtos com estoque baixo
   - `PUT /api/estoque-lojas/:lojaId/:produtoId` - Atualiza 1 produto
   - `PUT /api/estoque-lojas/:lojaId/varios` - Atualiza vários produtos
   - `DELETE /api/estoque-lojas/:lojaId/:produtoId` - Remove produto

3. **Rotas** (`src/routes/estoqueLoja.routes.js`)
   - Todas requerem autenticação
   - Acessível para ADMIN e FUNCIONARIO

### Frontend (componentes criados)

#### 1. **Dashboard.jsx** (já modificado)

- **Localização**: Card "Alertas de Estoque" no topo
- **O que mostra**: Total combinado (máquinas + lojas)
- **Seção específica**: "Alertas de Estoque nas Lojas"
  - Cards coloridos (vermelho/laranja/amarelo)
  - Mostra: emoji, nome do produto, loja, quantidade, mínimo
  - Limite de 5 alertas + link "Ver todos"

#### 2. **Lojas.jsx** (NOVO - arquivo criado)

- **Rota**: `/lojas`
- **Funcionalidades**:
  - Lista todas as lojas em cards
  - Busca por nome ou endereço
  - Badge "Ativa" ou "Inativa"
  - **Alertas de estoque** direto no card da loja
  - Botões: "Editar" e "Deletar" (admin)
  - Botão "Nova Loja" (admin)

#### 3. **EditarLoja.jsx** (NOVO - arquivo criado)

- **Rota**: `/lojas/:id/editar`
- **Layout**: Dividido em 2 colunas

**Coluna 1 - Dados da Loja:**

- Nome
- Endereço
- Status (ativa/inativa)
- Botão salvar

**Coluna 2 - Estoque do Depósito:**

- Lista produtos com quantidade e mínimo
- Modo visualização: apenas leitura
- Modo edição: inputs para alterar valores
- Adicionar produtos disponíveis
- Remover produtos do estoque
- Badge "Estoque baixo" para alertas
- Botão "Salvar Estoque" (atualiza tudo de uma vez)

## 🎯 Por que não aparece no Dashboard?

Existem 3 possibilidades:

### 1. **Nenhum produto cadastrado no estoque** ✅ MAIS PROVÁVEL

- Você precisa PRIMEIRO cadastrar produtos no estoque das lojas
- Use a tela `/lojas/:id/editar` para adicionar produtos

### 2. **Nenhum alerta ativo**

- Os alertas só aparecem quando: `quantidade <= estoqueMinimo`
- Exemplo: se tem 10 unidades e mínimo é 5, NÃO aparece
- Se tem 5 unidades e mínimo é 10, APARECE

### 3. **Erro na API**

- Abra o console do navegador (F12)
- Procure por erros nas requisições para `/estoque-lojas`

## 📋 Como testar o sistema

### Passo 1: Verificar se tem produtos

```
1. Vá em /produtos
2. Certifique-se que há produtos cadastrados
```

### Passo 2: Adicionar estoque à loja

```
1. Vá em /lojas
2. Clique em "Editar" em uma loja
3. Clique no botão "✏️ Editar Estoque"
4. Na seção "Adicionar Produtos ao Estoque", clique nos produtos
5. Defina quantidade e estoque mínimo
6. Clique em "💾 Salvar Estoque"
```

### Passo 3: Criar alertas

```
Para criar alertas de estoque baixo:
1. Configure quantidade MENOR OU IGUAL ao mínimo
   Exemplo: Quantidade = 5, Mínimo = 10
2. Salve o estoque
3. O alerta aparecerá automaticamente no Dashboard
```

### Passo 4: Verificar Dashboard

```
1. Volte para /dashboard
2. Veja o card "Alertas de Estoque" (mostra total)
3. Role para baixo até "Alertas de Estoque nas Lojas"
4. Você verá os produtos com estoque baixo
```

## 🔄 Diferença entre Estoques

| Tipo                   | Onde Gerenciar | Endpoint         | O que é                    |
| ---------------------- | -------------- | ---------------- | -------------------------- |
| **Estoque de Máquina** | Movimentações  | `/movimentacoes` | Produtos dentro da máquina |
| **Estoque de Loja**    | Editar Loja    | `/estoque-lojas` | Depósito/armazém da loja   |

## 🎨 Integração no seu projeto

### Adicionar rotas no React Router

```jsx
// No seu arquivo de rotas (ex: App.jsx ou routes.jsx)
import { Lojas } from './Lojas';
import { EditarLoja } from './EditarLoja';

// Adicione estas rotas:
<Route path="/lojas" element={<Lojas />} />
<Route path="/lojas/:id/editar" element={<EditarLoja />} />
```

### Adicionar link no menu

```jsx
// No seu Navbar.jsx ou menu
<Link to="/lojas" className="nav-link">
  🏪 Lojas
</Link>
```

## 🐛 Troubleshooting

### Dashboard não mostra alertas de lojas

1. **Verifique o console do navegador**

   ```
   F12 → Console
   Procure por: "Alertas de estoque de lojas"
   Deve mostrar um array, mesmo que vazio
   ```

2. **Teste a API diretamente**

   ```
   GET /api/estoque-lojas/1/alertas
   (substitua 1 pelo ID da sua loja)
   ```

3. **Verifique se há dados**
   ```
   GET /api/estoque-lojas/1
   Deve retornar array de produtos
   ```

### Erro ao salvar estoque

- Verifique se o usuário está autenticado
- Verifique se os produtos existem
- Console do navegador mostrará o erro específico

### Produtos não aparecem para adicionar

- Certifique-se que há produtos cadastrados em `/produtos`
- Produtos inativos não aparecem

## 📊 Estrutura de Dados

### EstoqueLoja (Banco de Dados)

```javascript
{
  id: 1,
  lojaId: 1,
  produtoId: 5,
  quantidade: 10,        // Quantidade atual
  estoqueMinimo: 20,     // Quando alertar
  createdAt: "2025-12-23",
  updatedAt: "2025-12-23"
}
```

### Alerta (Response da API)

```javascript
{
  id: 1,
  lojaId: 1,
  produtoId: 5,
  quantidade: 10,
  estoqueMinimo: 20,
  produto: {
    id: 5,
    nome: "Urso de Pelúcia",
    emoji: "🧸",
    codigo: "URO-001"
  },
  lojaNome: "Loja Shopping Center"  // Adicionado pelo Dashboard
}
```

## ✨ Recursos Visuais

### Cards de Alerta (Dashboard)

- 🔴 **Vermelho**: 0-25% do mínimo (CRÍTICO)
- 🟠 **Laranja**: 26-50% do mínimo (ALTO)
- 🟡 **Amarelo**: 51-100% do mínimo (MÉDIO)

### Badges

- ✅ Verde: "Ativa" (loja ativa)
- ❌ Vermelho: "Inativa" (loja inativa)
- ⚠️ Laranja: "Estoque baixo" (alerta)

## 🚀 Próximos Passos

1. **Configure produtos** em pelo menos uma loja
2. **Teste alertas** configurando quantidade < mínimo
3. **Verifique Dashboard** para ver alertas
4. **Ajuste estoques** conforme necessário

## 📝 Observações Importantes

1. **Não precisa criar nova migration** - o modelo já está no banco
2. **Backend já está deployado** - endpoints funcionando
3. **Separe bem os conceitos**:
   - Estoque de loja = depósito/armazém
   - Estoque de máquina = produtos carregados na máquina
4. **Permissões**: Funcionários podem editar estoque de lojas
5. **Auto-salvamento**: Ao adicionar produto, ele já entra com quantidade 0

---

**Criado em**: 23/12/2025
**Status**: ✅ Pronto para uso
**Deploy**: ✅ Backend em produção
