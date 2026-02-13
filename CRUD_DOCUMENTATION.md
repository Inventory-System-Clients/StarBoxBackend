# 🏪 Sistema Completo de CRUD - Agarra Mais

## 📋 Visão Geral

Este documento descreve todas as páginas CRUD (Create, Read, Update, Delete) implementadas no sistema Agarra Mais para gerenciar lojas, máquinas, produtos e movimentações de pelúcias.

## 🎯 Páginas Criadas

### 1. **Lojas** 🏪

#### **Lojas.jsx** - Listagem de Lojas

- **Rota**: `/lojas`
- **Funcionalidades**:
  - Exibição de todas as lojas em tabela moderna
  - Cards de estatísticas: Total de lojas, lojas ativas, total de máquinas
  - Botões de ação: Ver detalhes, Editar, Excluir
  - Dialog de confirmação para exclusão
  - Filtros e busca
- **Acesso**: Todos os usuários autenticados

#### **LojaForm.jsx** - Formulário de Loja

- **Rotas**:
  - `/lojas/nova` (criar)
  - `/lojas/:id/editar` (editar)
- **Campos**:
  - Nome da loja \*
  - Responsável
  - Telefone \*
  - Endereço completo \*
  - Cidade \*
  - Estado \* (select com todos os estados brasileiros)
  - CEP
  - Status Ativo/Inativo
- **Validações**: Campos obrigatórios marcados com \*
- **Acesso**: Apenas ADMIN

#### **LojaDetalhes.jsx** - Detalhes da Loja

- **Rota**: `/lojas/:id`
- **Funcionalidades**:
  - Visualização completa dos dados da loja
  - Estatísticas: Total de máquinas, máquinas ativas, ocupação média
  - Lista de todas as máquinas da loja em cards
  - Cards clicáveis para editar máquina
  - Botão para adicionar nova máquina
  - Indicador visual de ocupação de cada máquina
- **Acesso**: Todos os usuários autenticados

---

### 2. **Máquinas** 🎰

#### **Maquinas.jsx** - Listagem de Máquinas

- **Rota**: `/maquinas`
- **Funcionalidades**:
  - Exibição de todas as máquinas em tabela
  - Cards de estatísticas: Total, ativas, capacidade total, estoque total
  - Filtro por loja (dropdown)
  - Indicador visual de ocupação (barra de progresso com cores)
  - Botões de ação: Editar, Excluir
  - Dialog de confirmação para exclusão
- **Colunas da tabela**:
  - Código
  - Nome
  - Loja
  - Capacidade
  - Estoque Atual
  - % Ocupação (visual)
  - Status (badge)
  - Ações
- **Acesso**: Todos os usuários autenticados

#### **MaquinaForm.jsx** - Formulário de Máquina

- **Rotas**:
  - `/maquinas/nova` (criar)
  - `/maquinas/:id/editar` (editar)
- **Campos**:
  - Código da máquina \*
  - Nome \*
  - Loja \* (select com lojas ativas)
  - Capacidade total \* (número)
  - Estoque atual \* (número)
  - Modelo
  - Ano de fabricação
  - Observações (textarea)
  - Status Ativo/Inativo
- **Recursos especiais**:
  - Indicador visual de taxa de ocupação em tempo real
  - Barra de progresso com cores (vermelho < 30%, amarelo < 60%, verde >= 60%)
  - Validação: estoque não pode exceder capacidade
- **Acesso**: Apenas ADMIN

---

### 3. **Produtos** 🧸

#### **Produtos.jsx** - Listagem de Produtos

- **Rota**: `/produtos`
- **Funcionalidades**:
  - Exibição de todos os produtos em tabela
  - Cards de estatísticas: Total, ativos, categorias, valor médio
  - Filtro por categoria (dropdown dinâmico)
  - Ícone emoji visual para cada produto
  - Badges de status com cores para estoque (vermelho < 10, amarelo < 30, verde >= 30)
  - Botões de ação: Editar, Excluir
  - Dialog de confirmação para exclusão
- **Colunas da tabela**:
  - Emoji (visual)
  - Código
  - Nome
  - Categoria
  - Preço (formatado em R$)
  - Estoque (badge colorido)
  - Status (badge)
  - Ações
- **Acesso**: Todos os usuários autenticados

#### **ProdutoForm.jsx** - Formulário de Produto

- **Rotas**:
  - `/produtos/novo` (criar)
  - `/produtos/:id/editar` (editar)
- **Campos**:
  - Emoji do produto \* (seletor visual com 20 opções de pelúcias)
  - Código do produto \*
  - Nome do produto \*
  - Categoria \* (input com datalist de sugestões)
  - Preço de venda \* (R$)
  - Custo do produto (R$)
  - Estoque atual (número)
  - Estoque mínimo (número, para alertas)
  - Descrição (textarea)
  - Status Ativo/Inativo
- **Recursos especiais**:
  - Seletor visual de emoji com 20 opções (🧸 🐻 🐼 🐨 🐰 🐱 🐶 🐷 🐯 🦁 etc.)
  - Preview do emoji selecionado em tamanho grande
  - Cálculo automático de margem de lucro
  - Sugestões de categorias (Ursos, Coelhos, Unicórnios, etc.)
- **Acesso**: Apenas ADMIN

---

### 4. **Movimentações** 🔄

#### **Movimentacoes.jsx** - Registro e Histórico

- **Rota**: `/movimentacoes`
- **Funcionalidades**:
  - Exibição de histórico completo de movimentações
  - Cards de estatísticas: Total entradas, total saídas, saldo, movimentações
  - Formulário inline para nova movimentação
  - Botão para mostrar/ocultar formulário
  - Filtros e ordenação por data
- **Formulário de Nova Movimentação**:
  - Tipo \* (Entrada/Saída - select)
  - Quantidade \* (número)
  - Máquina \* (select com nome da máquina e loja)
  - Produto \* (select com emoji e nome)
  - Observação (textarea)
- **Colunas da tabela**:
  - Data/Hora (formatada em PT-BR)
  - Tipo (badge verde=entrada, vermelho=saída)
  - Produto (com emoji)
  - Máquina (com nome da loja)
  - Quantidade (+ para entrada, - para saída em cores)
  - Observação
- **Acesso**: Todos os usuários autenticados

---

## 🎨 Design System Utilizado

Todas as páginas seguem o design system moderno com:

### Cores

- **Primary**: `#F2A20C` (Laranja)
- **Secondary**: `#F2B705` (Amarelo)
- **Accent Cream**: `#F2DC99` (Creme)
- **Background Light**: `#F2F2F2` (Cinza claro)
- **Background Dark**: `#0D0D0D` (Preto)

### Componentes Reutilizáveis

- **PageHeader**: Cabeçalho com título, subtítulo, ícone e botão de ação
- **StatsGrid**: Grid de cards de estatísticas
- **DataTable**: Tabela moderna com hover effects
- **Badge**: Indicadores de status coloridos
- **ConfirmDialog**: Modal de confirmação para ações destrutivas
- **AlertBox**: Alertas de sucesso/erro
- **PageLoader**: Loading animado com gradientes
- **EmptyState**: Estado vazio elegante com call-to-action

### Classes CSS Personalizadas

- `.card-gradient`: Card com gradiente e sombra
- `.btn-primary`: Botão principal com gradiente
- `.btn-secondary`: Botão secundário
- `.input-field`: Campo de input estilizado
- `.select-field`: Select estilizado
- `.stat-card`: Card de estatística
- `.table-modern`: Tabela moderna
- `.teddy-pattern`: Padrão de fundo com emojis de pelúcia

---

## 🔐 Controle de Acesso

### Rotas Públicas

- `/login`
- `/registrar`

### Rotas Autenticadas (Todos os usuários)

- `/` - Dashboard
- `/lojas` - Listagem de lojas
- `/lojas/:id` - Detalhes da loja
- `/maquinas` - Listagem de máquinas
- `/produtos` - Listagem de produtos
- `/movimentacoes` - Registro e histórico

### Rotas Restritas (Apenas ADMIN)

- `/usuarios` - Gestão de usuários
- `/lojas/nova` - Criar loja
- `/lojas/:id/editar` - Editar loja
- `/maquinas/nova` - Criar máquina
- `/maquinas/:id/editar` - Editar máquina
- `/produtos/novo` - Criar produto
- `/produtos/:id/editar` - Editar produto

---

## 🔌 Integração com Backend

Todas as páginas estão integradas com o backend Express.js através do Axios:

### Endpoints Utilizados

#### Lojas

- `GET /api/lojas` - Listar todas
- `GET /api/lojas/:id` - Buscar por ID
- `POST /api/lojas` - Criar nova
- `PUT /api/lojas/:id` - Atualizar
- `DELETE /api/lojas/:id` - Excluir

#### Máquinas

- `GET /api/maquinas` - Listar todas
- `GET /api/maquinas/:id` - Buscar por ID
- `POST /api/maquinas` - Criar nova
- `PUT /api/maquinas/:id` - Atualizar
- `DELETE /api/maquinas/:id` - Excluir

#### Produtos

- `GET /api/produtos` - Listar todos
- `GET /api/produtos/:id` - Buscar por ID
- `POST /api/produtos` - Criar novo
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Excluir

#### Movimentações

- `GET /api/movimentacoes` - Listar todas
- `POST /api/movimentacoes` - Registrar nova movimentação

---

## 📱 Responsividade

Todas as páginas são **totalmente responsivas**:

- **Desktop (>= 1024px)**: Layout completo com sidebar, grids de 3-4 colunas
- **Tablet (768px - 1023px)**: Grids de 2 colunas, navegação adaptada
- **Mobile (< 768px)**: Layout em coluna única, menu hamburger, cards empilhados

---

## ✨ Recursos Especiais

### Validações Client-Side

- Campos obrigatórios marcados com \*
- Validação de tipos (número, email, telefone)
- Validação de limites (estoque não pode exceder capacidade)
- Feedback visual de erros

### Feedback do Usuário

- Loading states durante requisições
- Mensagens de sucesso após ações
- Mensagens de erro descritivas
- Confirmação antes de ações destrutivas
- Estados vazios elegantes

### UX/UI Avançado

- Animações suaves de transição
- Hover effects em cards e botões
- Indicadores visuais de progresso
- Emojis para identificação visual rápida
- Gradientes e sombras modernas
- Cores semânticas (verde=sucesso, vermelho=erro, amarelo=atenção)

---

## 🚀 Como Usar

### 1. Iniciar o Projeto

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev
```

### 2. Fluxo de Trabalho Recomendado

1. **Login** como ADMIN
2. **Criar Lojas** em `/lojas`
3. **Adicionar Máquinas** para cada loja em `/maquinas`
4. **Cadastrar Produtos** (pelúcias) em `/produtos`
5. **Registrar Movimentações** de entrada/saída em `/movimentacoes`
6. **Monitorar Dashboard** para ver estatísticas e alertas

### 3. Gestão de Usuários (ADMIN)

- Criar novos funcionários em `/usuarios`
- Definir roles (ADMIN ou FUNCIONÁRIO)
- Funcionários podem visualizar e registrar movimentações
- Apenas ADMIN pode criar/editar/excluir dados mestres

---

## 📊 Estrutura de Dados

### Modelo de Loja

```javascript
{
  id: number,
  nome: string,
  endereco: string,
  cidade: string,
  estado: string,
  cep: string,
  telefone: string,
  responsavel: string,
  ativo: boolean
}
```

### Modelo de Máquina

```javascript
{
  id: number,
  codigo: string,
  nome: string,
  loja_id: number,
  capacidade: number,
  estoque_atual: number,
  modelo: string,
  ano_fabricacao: number,
  observacoes: string,
  ativo: boolean
}
```

### Modelo de Produto

```javascript
{
  id: number,
  codigo: string,
  nome: string,
  categoria: string,
  preco: decimal,
  custo: decimal,
  emoji: string,
  estoque_minimo: number,
  estoque_atual: number,
  descricao: string,
  ativo: boolean
}
```

### Modelo de Movimentação

```javascript
{
  id: number,
  maquina_id: number,
  produto_id: number,
  tipo: 'entrada' | 'saida',
  quantidade: number,
  data_movimentacao: datetime,
  observacao: string
}
```

---

## 🎯 Roadmap de Melhorias Futuras

- [ ] Relatórios e gráficos de vendas
- [ ] Export para Excel/PDF
- [ ] Notificações push para alertas de estoque
- [ ] App mobile (React Native)
- [ ] Sistema de metas e comissões
- [ ] Integração com sistemas de pagamento
- [ ] Dashboard em tempo real com WebSocket
- [ ] Sistema de backup automático
- [ ] Auditoria de ações dos usuários

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:

- `DESIGN.md` - Guia completo do design system
- `README_DESIGN.md` - Documentação de componentes
- `QUICK_START.md` - Início rápido

---

**Desenvolvido com ❤️ para Agarra Mais** 🧸
