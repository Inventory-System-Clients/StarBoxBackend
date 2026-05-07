# Implementação Frontend - Ver Andamento de Roteiro em Execução

## 📋 Visão Geral

Quando um usuário tenta iniciar um roteiro que **já foi iniciado por outro usuário**, ele deve:
1. Receber uma mensagem indicando que o roteiro está em andamento
2. Ter a opção de "**Ver andamento**"
3. Ao clicar, visualizar a execução do roteiro em **modo somente leitura**

---

## 🔄 Fluxo de Funcionamento

### 1️⃣ **Tentativa de Iniciar Roteiro em Andamento**

**Cenário:** Usuário A iniciou um roteiro. Usuário B tenta iniciar o mesmo roteiro.

**Resposta do Backend:**
```json
{
  "error": "Este roteiro já foi iniciado por outro usuário",
  "statusRota": "em_andamento_por_outro",
  "usuarioAssociado": 123
}
```

**Ação do Frontend:**
- ❌ Não mostrar modal/dialog de iniciar roteiro
- ✅ Mostrar **toast/alerta** com mensagem: `"Este roteiro já está em andamento. Clique em 'Ver andamento' para visualizar."`
- ✅ Adicionar botão "Ver andamento" na interface do roteiro
- 🚫 **NÃO permitir** acesso ao editor/dashboard de edição do roteiro

---

### 2️⃣ **Listar Roteiros com Status**

A listagem de roteiros agora retorna informações de execução semanal:

```json
{
  "id": 1,
  "nome": "Rota Centro",
  "execucaoSemanal": {
    "emAndamento": true,
    "usuarioAssociado": {
      "id": 123,
      "nome": "João Silva"
    },
    "dataInicio": "2026-05-07",
    "iniciadoEm": "2026-05-07T08:30:00Z",
    "finalizadoEm": null
  }
}
```

**Mudança de UI na Listagem:**
- Se `execucaoSemanal.emAndamento === true` e o usuário atual é diferente:
  - Mostrar badge/rótulo: 🟢 "Em andamento por **Nome do Usuário**"
  - Botão "Iniciar" → Desabilitado ou renomeado para "Ver andamento"
  - Clique leva para tela de visualização (read-only)

- Se `execucaoSemanal.emAndamento === true` e é o usuário atual:
  - Mostrar badge/rótulo: 🔵 "Seu roteiro em andamento"
  - Botão permanece funcional para voltar ao editor

---

### 3️⃣ **Tela de Andamento - Modo Somente Leitura**

**Endpoint:** `GET /api/roteiros/:id/ver-andamento`

**Resposta:**
```json
{
  "roteiro": {
    "id": 1,
    "nome": "Rota Centro",
    "orcamentoDiario": 150.00,
    "observacao": "Visitas Centro-Oeste"
  },
  "execucaoSemanal": {
    "emAndamento": true,
    "usuarioAssociado": {
      "id": 123,
      "nome": "João Silva"
    },
    "dataInicio": "2026-05-07"
  },
  "lojas": [
    {
      "id": 1,
      "nome": "Loja Centro",
      "status": "finalizado",
      "maquinas": [
        {
          "id": 101,
          "nome": "Máquina 1",
          "status": "finalizado"
        },
        {
          "id": 102,
          "nome": "Máquina 2",
          "status": "pendente"
        }
      ]
    }
  ],
  "resumoFinalizacao": {
    "estoqueInicialTotal": 100,
    "estoqueFinalTotal": 45,
    "consumoTotalProdutos": 55,
    "finalizadoPorId": 123,
    "finalizadoEm": "2026-05-07T17:45:00Z"
  },
  "mensagemResumo": "...",
  "modoLeitura": true,
  "avisoPermissoes": "Você está visualizando este roteiro em modo de leitura..."
}
```

**Interface - Modo Somente Leitura:**

```
┌─────────────────────────────────────┐
│  🔒 VISUALIZANDO ROTEIRO EM ANDAMENTO
├─────────────────────────────────────┤
│
│  Roteiro: Rota Centro
│  Responsável: João Silva
│  Data Início: 07/05/2026
│
│  ─────────────────────────────────
│  ORÇAMENTO E LOJAS (Pontos)
│  ─────────────────────────────────
│  
│  📍 Loja Centro [✅ FINALIZADO]
│     • Máquina 1 ............ ✅
│     • Máquina 2 ............ ⏳
│
│  📍 Loja Zona Leste [⏳ PENDENTE]
│     • Máquina 3 ............ ⏳
│
│  ─────────────────────────────────
│  RESUMO DE CONSUMO (SE FINALIZADO)
│  ─────────────────────────────────
│
│  Estoque Inicial: 100 un
│  Estoque Final: 45 un
│  Consumo Total: 55 un
│
│  ─────────────────────────────────
│  MENSAGEM DE FINALIZAÇÃO
│  ─────────────────────────────────
│
│  [Mensagem de resumo em modo de leitura]
│  [Apenas cópia, sem edição]
│
│  ─────────────────────────────────
│  ⚠️  Você está visualizando em modo de leitura.
│     Não é possível fazer edições enquanto
│     o roteiro está sendo executado.
│
│  [ ← Voltar ]  [ 🔄 Atualizar ]
└─────────────────────────────────────┘
```

---

## 🚀 Implementação no Frontend

### **Passo 1: Interceptar resposta de "Iniciar Roteiro"**

```javascript
const iniciarRoteiro = async (roteiroId) => {
  try {
    const response = await fetch(`/api/roteiros/${roteiroId}/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* dados */ })
    });

    const data = await response.json();

    if (response.status === 403 && data.statusRota === 'em_andamento_por_outro') {
      // ❌ Roteiro já em andamento por outro usuário
      mostrarToast({
        tipo: 'warning',
        mensagem: `Este roteiro já está em andamento por ${data.usuarioAssociado || 'outro usuário'}.`,
        acao: {
          texto: 'Ver andamento',
          callback: () => irParaVisualizar(roteiroId)
        }
      });
      return;
    }

    if (response.ok && data.statusRota === 'iniciado') {
      // ✅ Roteiro iniciado com sucesso
      irParaDashboardRoteiro(roteiroId);
    }
  } catch (error) {
    mostrarErro('Erro ao iniciar roteiro');
  }
};
```

### **Passo 2: Atualizar Listagem de Roteiros**

```javascript
const renderizarItemRoteiro = (roteiro) => {
  const estaEmAndamento = roteiro.execucaoSemanal?.emAndamento;
  const ehSeuRoteiro = roteiro.execucaoSemanal?.usuarioAssociado?.id === usuarioAtual.id;

  return (
    <div className="roteiro-item">
      <h3>{roteiro.nome}</h3>
      
      {estaEmAndamento && (
        <div className={`badge ${ehSeuRoteiro ? 'seu-roteiro' : 'outro-usuario'}`}>
          {ehSeuRoteiro ? '🔵 Seu roteiro em andamento' : 
                         `🟢 Em andamento por ${roteiro.execucaoSemanal.usuarioAssociado.nome}`}
        </div>
      )}

      <button 
        onClick={() => estaEmAndamento && !ehSeuRoteiro 
          ? irParaVisualizar(roteiro.id)
          : iniciarRoteiro(roteiro.id)
        }
        disabled={estaEmAndamento && !ehSeuRoteiro}
      >
        {estaEmAndamento && !ehSeuRoteiro ? 'Ver andamento' : 'Iniciar'}
      </button>
    </div>
  );
};
```

### **Passo 3: Componente de Visualização (Modo Leitura)**

```javascript
const VisualizarAndamentoRoteiro = ({ roteiroId }) => {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarAndamento();
    const intervalo = setInterval(carregarAndamento, 5000); // Atualizar a cada 5s
    return () => clearInterval(intervalo);
  }, []);

  const carregarAndamento = async () => {
    try {
      const response = await fetch(`/api/roteiros/${roteiroId}/ver-andamento`);
      
      if (response.status === 404) {
        // Roteiro finalizou ou não está mais em andamento
        voltar();
        mostrarToast('Roteiro finalizado', 'success');
        return;
      }

      const data = await response.json();
      setDados(data);
    } catch (error) {
      mostrarErro('Erro ao carregar andamento');
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) return <Carregando />;

  return (
    <div className="visualizar-andamento">
      <div className="cabecalho">
        <h1>🔒 {dados.roteiro.nome}</h1>
        <p>Responsável: {dados.execucaoSemanal.usuarioAssociado.nome}</p>
        <p>Iniciado em: {formatarData(dados.execucaoSemanal.dataInicio)}</p>
      </div>

      <section className="lojas-maquinas">
        <h2>📍 Pontos de Parada</h2>
        {dados.lojas.map(loja => (
          <div key={loja.id} className={`loja ${loja.status}`}>
            <h3>{loja.nome} - {loja.status === 'finalizado' ? '✅' : '⏳'}</h3>
            <ul>
              {loja.maquinas.map(maquina => (
                <li key={maquina.id}>
                  {maquina.nome} - {maquina.status === 'finalizado' ? '✅' : '⏳'}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {dados.resumoFinalizacao && (
        <section className="resumo-finalizacao">
          <h2>📊 Resumo de Consumo</h2>
          <p>Estoque Inicial: {dados.resumoFinalizacao.estoqueInicialTotal}</p>
          <p>Estoque Final: {dados.resumoFinalizacao.estoqueFinalTotal}</p>
          <p>Consumo Total: {dados.resumoFinalizacao.consumoTotalProdutos}</p>
        </section>
      )}

      {dados.mensagemResumo && (
        <section className="mensagem-resumo">
          <h2>📝 Mensagem de Finalização</h2>
          <div className="mensagem-readonly">
            {dados.mensagemResumo}
          </div>
          <p className="nota">Esta mensagem foi enviada pelo responsável da rota.</p>
        </section>
      )}

      <div className="aviso">
        <strong>⚠️ Aviso:</strong> {dados.avisoPermissoes}
      </div>

      <div className="acoes">
        <button onClick={voltar}>← Voltar</button>
        <button onClick={carregarAndamento}>🔄 Atualizar</button>
      </div>
    </div>
  );
};
```

---

## 🔐 Pontos Críticos de Segurança

### **NO FRONTEND - Desabilitar:**
1. ❌ Botão de "Adicionar Loja"
2. ❌ Botão de "Remover Loja"
3. ❌ Botão de "Iniciar Roteiro" (quando outro usuário)
4. ❌ Botão de "Finalizar Roteiro" (quando outro usuário)
5. ❌ Campos de edição (todos os inputs)
6. ❌ Campos de orçamento (apenas visualização)
7. ❌ Edição de mensagem de resumo

### **NO BACKEND - Proteção:**
- ✅ `iniciarRoteiro`: Retorna erro 403 se outro usuário já iniciou
- ✅ `finalizarRoteiro`: Valida permissões (apenas o usuário associado ou ADMIN)
- ✅ `verAndamentoRoteiro`: Apenas retorna dados, sem permitir POST/PUT/DELETE
- ✅ Mensagem de finalização: Apenas quem finalizou pode visualizar como editor

---

## 📡 Endpoints Necessários

### 1. **Verificar Status do Roteiro (Opcional)**
```
GET /api/roteiros/:id/status
```
Retorna informações de execução semanal do roteiro.

### 2. **Ver Andamento (Leitura)**
```
GET /api/roteiros/:id/ver-andamento
```
Retorna dados completos do roteiro em modo somente leitura.

### 3. **Iniciar Roteiro (Modificado)**
```
POST /api/roteiros/:id/iniciar
```
Agora retorna erro 403 se outro usuário já iniciou.

---

## 🎨 Sugestões de UX

1. **Cor de Destaque:** Use azul ou âmbar para indicar "em andamento por outro"
2. **Ícone de Cadeado:** 🔒 na tela de visualização
3. **Atualização Automática:** Recarregar dados a cada 5-10 segundos
4. **Notificação:** Se o roteiro for finalizado enquanto você visualiza, mostrar toast
5. **Breadcrumb:** "Roteiros > [Nome do Roteiro] > Visualizando"

---

## ✅ Checklist de Implementação

- [ ] Interceptar erro 403 ao iniciar roteiro
- [ ] Mostrar toast com opção "Ver andamento"
- [ ] Atualizar listagem para mostrar `execucaoSemanal`
- [ ] Criar componente de visualização read-only
- [ ] Desabilitar todos os botões de edição
- [ ] Implementar atualização automática de dados
- [ ] Testes: Dois usuários, um inicia, outro tenta iniciar
- [ ] Validar que apenas o responsável pode finalizar
- [ ] CSS: Indicadores visuais de modo leitura

---

## 💡 Próximos Passos

Após implementar a visualização, você pode:
1. Adicionar **notificações em tempo real** (WebSocket) quando o roteiro for finalizado
2. Implementar **modo de acompanhamento ao vivo** com atualização em tempo real
3. Adicionar **comentários** que apenas o responsável pode ver/editar
