# 🔧 Sistema de Revisão de Veículos - Frontend

## 📋 Visão Geral

Implementar interface para gerenciar revisões de veículos que devem ocorrer a cada 10.000 km, a partir do km inicial cadastrado.

---

## 🎯 Requisitos Funcionais

### 1. Badge/Notificação de Revisões Pendentes

**Onde:** Ícone/menu de veículos ou dashboard principal

**Comportamento:**
- Exibir badge com número de veículos que precisam de revisão
- Badge deve ser visível e chamar atenção (cor vermelha/laranja)
- Clicar deve levar para a tela de revisões pendentes

**Exemplo:**
```jsx
<Badge count={revisoesPendentes.length} status="error">
  <CarOutlined /> Veículos
</Badge>
```

---

## 📡 Endpoints da API

### 1. Listar Revisões Pendentes

**GET** `/revisoes-veiculos`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "veiculoId": "uuid-123",
    "veiculoNome": "Carro 1",
    "veiculoModelo": "Toyota Corolla",
    "kmAtual": 45320,
    "kmRevisaoDevida": 40000,
    "proximaRevisaoKm": 50000,
    "diasAtrasado": 53
  },
  {
    "veiculoId": "uuid-456",
    "veiculoNome": "Moto Entrega",
    "veiculoModelo": "Honda CG 160",
    "kmAtual": 22100,
    "kmRevisaoDevida": 20000,
    "proximaRevisaoKm": 30000,
    "diasAtrasado": 21
  }
]
```

---

### 2. Verificar Revisão de Um Veículo

**POST** `/revisoes-veiculos/:veiculoId/verificar`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Alerta de revisão criado",
  "alerta": {
    "id": "uuid-alerta",
    "tipo": "revisao_veiculo",
    "mensagem": "🔧 REVISÃO PENDENTE...",
    "status": "pendente",
    "referenciaId": "uuid-123",
    "metadata": {
      "veiculoNome": "Carro 1",
      "kmAtual": 45320,
      "kmRevisaoDevida": 40000
    }
  }
}
```

---

### 3. Marcar Revisão Como Concluída

**POST** `/revisoes-veiculos/:veiculoId/concluir`

**Headers:**
```
Authorization: Bearer <token>
```

**Body (opcional):**
```json
{
  "kmRevisao": 45000
}
```
*Se não informar, usa o km atual do veículo*

**Response 200:**
```json
{
  "message": "Revisão marcada como concluída",
  "veiculo": {
    "id": "uuid-123",
    "nome": "Carro 1",
    "km": 45320,
    "ultimaRevisaoKm": 45000,
    "proximaRevisaoKm": 50000
  }
}
```

---

### 4. Verificar Todas as Revisões (Admin)

**POST** `/revisoes-veiculos/verificar-todas`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Verificação de revisões concluída",
  "alertasCriados": 3,
  "alertas": [...]
}
```

---

## 🎨 Tela: Lista de Revisões Pendentes

**Rota Sugerida:** `/veiculos/revisoes-pendentes`

### Layout

```
┌─────────────────────────────────────────────┐
│  🔧 Revisões Pendentes                      │
│  ─────────────────────────────────────────  │
│                                             │
│  ┌─ Carro 1 (Toyota Corolla) ─────────────┐│
│  │ KM Atual: 45.320                       ││
│  │ Revisão devida: 40.000 km              ││
│  │ Próxima revisão: 50.000 km             ││
│  │ ⚠️ Atrasada em ~5.320 km               ││
│  │                                        ││
│  │ [Marcar como Concluída]                ││
│  └────────────────────────────────────────┘│
│                                             │
│  ┌─ Moto Entrega (Honda CG 160) ──────────┐│
│  │ KM Atual: 22.100                       ││
│  │ Revisão devida: 20.000 km              ││
│  │ Próxima revisão: 30.000 km             ││
│  │ ⚠️ Atrasada em ~2.100 km               ││
│  │                                        ││
│  │ [Marcar como Concluída]                ││
│  └────────────────────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

### Código Exemplo (React)

```jsx
import React, { useEffect, useState } from 'react';
import { Card, Button, Tag, message, Modal, Input } from 'antd';
import { ToolOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../services/api';

const RevisoesPendentes = () => {
  const [revisoes, setRevisoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [kmRevisao, setKmRevisao] = useState('');

  useEffect(() => {
    carregarRevisoes();
  }, []);

  const carregarRevisoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/revisoes-veiculos');
      setRevisoes(response.data);
    } catch (error) {
      message.error('Erro ao carregar revisões pendentes');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalConcluir = (revisao) => {
    setVeiculoSelecionado(revisao);
    setKmRevisao(revisao.kmAtual.toString());
    setModalVisible(true);
  };

  const concluirRevisao = async () => {
    try {
      setLoading(true);
      await api.post(
        `/revisoes-veiculos/${veiculoSelecionado.veiculoId}/concluir`,
        { kmRevisao: parseInt(kmRevisao) }
      );
      message.success('Revisão marcada como concluída!');
      setModalVisible(false);
      carregarRevisoes();
    } catch (error) {
      message.error('Erro ao concluir revisão');
    } finally {
      setLoading(false);
    }
  };

  const formatarKm = (km) => {
    return km.toLocaleString('pt-BR');
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>
        <ToolOutlined /> Revisões Pendentes
      </h2>
      
      {revisoes.length === 0 ? (
        <Card>
          <p>✅ Nenhuma revisão pendente no momento!</p>
        </Card>
      ) : (
        revisoes.map((revisao) => (
          <Card
            key={revisao.veiculoId}
            style={{ marginBottom: '16px' }}
            title={
              <span>
                <WarningOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                {revisao.veiculoNome} ({revisao.veiculoModelo})
              </span>
            }
            extra={
              <Tag color="error">
                Atrasada ~{formatarKm(revisao.kmAtual - revisao.kmRevisaoDevida)} km
              </Tag>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong>KM Atual:</strong> {formatarKm(revisao.kmAtual)}
              </div>
              <div>
                <strong>Revisão devida aos:</strong> {formatarKm(revisao.kmRevisaoDevida)} km
              </div>
              <div>
                <strong>Próxima revisão:</strong> {formatarKm(revisao.proximaRevisaoKm)} km
              </div>
              
              <Button
                type="primary"
                icon={<ToolOutlined />}
                onClick={() => abrirModalConcluir(revisao)}
                style={{ marginTop: '12px' }}
              >
                Marcar como Concluída
              </Button>
            </div>
          </Card>
        ))
      )}

      <Modal
        title="Concluir Revisão"
        open={modalVisible}
        onOk={concluirRevisao}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        {veiculoSelecionado && (
          <>
            <p>
              <strong>Veículo:</strong> {veiculoSelecionado.veiculoNome}
            </p>
            <p>
              <strong>KM em que a revisão foi feita:</strong>
            </p>
            <Input
              type="number"
              value={kmRevisao}
              onChange={(e) => setKmRevisao(e.target.value)}
              placeholder="Ex: 45000"
            />
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              Deixe em branco para usar o KM atual ({formatarKm(veiculoSelecionado.kmAtual)})
            </p>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RevisoesPendentes;
```

---

## 🔔 Badge no Menu/Dashboard

```jsx
import React, { useEffect, useState } from 'react';
import { Badge } from 'antd';
import { CarOutlined } from '@ant-design/icons';
import api from '../services/api';

const MenuVeiculos = () => {
  const [countRevisoes, setCountRevisoes] = useState(0);

  useEffect(() => {
    verificarRevisoes();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(verificarRevisoes, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const verificarRevisoes = async () => {
    try {
      const response = await api.get('/revisoes-veiculos');
      setCountRevisoes(response.data.length);
    } catch (error) {
      console.error('Erro ao verificar revisões:', error);
    }
  };

  return (
    <Badge count={countRevisoes} status="error" offset={[10, 0]}>
      <CarOutlined style={{ fontSize: '20px' }} />
      <span style={{ marginLeft: '8px' }}>Veículos</span>
    </Badge>
  );
};

export default MenuVeiculos;
```

---

## 📱 Notificação Toast ao Detectar Nova Revisão

**Quando:** Após registrar movimentação que atualiza o KM do veículo

```jsx
// No componente de registro de movimentação
const registrarMovimentacao = async (dados) => {
  try {
    await api.post('/movimentacao-veiculos', dados);
    message.success('Movimentação registrada!');
    
    // Verificar se gerou revisão pendente
    const revisoes = await api.get('/revisoes-veiculos');
    if (revisoes.data.length > 0) {
      // Verificar se alguma é do veículo atual
      const revisaoVeiculo = revisoes.data.find(
        r => r.veiculoId === dados.veiculoId
      );
      
      if (revisaoVeiculo) {
        Modal.warning({
          title: '⚠️ Revisão Pendente',
          content: `O veículo ${revisaoVeiculo.veiculoNome} precisa de revisão! KM atual: ${revisaoVeiculo.kmAtual}`,
        });
      }
    }
  } catch (error) {
    message.error('Erro ao registrar movimentação');
  }
};
```

---

## 🎨 Card no Dashboard Principal

```jsx
const DashboardRevisoes = () => {
  const [revisoes, setRevisoes] = useState([]);

  useEffect(() => {
    carregarRevisoes();
  }, []);

  const carregarRevisoes = async () => {
    const response = await api.get('/revisoes-veiculos');
    setRevisoes(response.data.slice(0, 3)); // Top 3
  };

  return (
    <Card
      title="🔧 Revisões Pendentes"
      extra={<a href="/veiculos/revisoes">Ver todas</a>}
      style={{ marginBottom: '16px' }}
    >
      {revisoes.length === 0 ? (
        <p>✅ Nenhuma revisão pendente</p>
      ) : (
        <ul>
          {revisoes.map((r) => (
            <li key={r.veiculoId}>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              {' '}{r.veiculoNome} - {r.kmAtual.toLocaleString('pt-BR')} km
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
```

---

## ⚙️ Fluxo Automático

### Backend já implementado:

1. ✅ Ao criar veículo → inicializa campos de revisão
2. ✅ Ao atualizar KM do veículo → verifica se precisa revisão
3. ✅ Ao registrar movimentação com KM → verifica revisão
4. ✅ Cria alerta automático no WhatsApp (se configurado)
5. ✅ Atualiza próxima revisão ao marcar como concluída

### Frontend deve:

1. Exibir badge com contador de revisões pendentes
2. Permitir visualizar lista de revisões pendentes
3. Permitir marcar revisão como concluída
4. Mostrar notificação quando nova revisão for detectada

---

## 🔐 Permissões

- **Todos os usuários autenticados** podem ver revisões pendentes
- **Gerentes/Admins** podem marcar revisões como concluídas
- **Admins** podem executar verificação manual de todas as revisões

---

## 📝 Considerações Importantes

1. **KM Inicial:** É definido quando o veículo é cadastrado ou pode ser atualizado manualmente pelos admins

2. **Múltiplos de 10.000:** Sistema detecta 10.000, 20.000, 30.000, etc.

3. **Alertas WhatsApp:** Se configurado, envia alertas automáticos (requer `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`)

4. **Não duplica alertas:** Se já existe alerta pendente para o veículo, não cria outro

5. **Revisões atrasadas:** Se veículo está com 45.000 km e última revisão foi aos 30.000 km, o sistema identifica que está atrasada

---

## 🚀 Rotina de Verificação (Opcional)

Criar uma rotina no frontend que verifica periodicamente:

```jsx
// App.js ou layout principal
useEffect(() => {
  const verificarRevisoes = async () => {
    const response = await api.get('/revisoes-veiculos');
    if (response.data.length > 0) {
      // Atualizar badge/contador global
      setRevisoesPendentes(response.data.length);
    }
  };

  // Verificar ao iniciar
  verificarRevisoes();

  // Verificar a cada 10 minutos
  const interval = setInterval(verificarRevisoes, 10 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

---

## 📦 Pacotes Recomendados

- `antd` ou `@mui/material` - Componentes UI
- `axios` - HTTP requests
- `react-router-dom` - Rotas
- `dayjs` ou `date-fns` - Manipulação de datas (se necessário)

---

## ✅ Checklist de Implementação

- [ ] Criar endpoint service no frontend (`/services/revisoesVeiculos.js`)
- [ ] Criar página de revisões pendentes
- [ ] Adicionar badge no menu de veículos
- [ ] Adicionar card no dashboard principal
- [ ] Implementar modal de conclusão de revisão
- [ ] Adicionar notificação ao registrar movimentação
- [ ] Testar com diferentes cenários de KM
- [ ] Adicionar permissões de acordo com role do usuário

---

## 🎯 Resultado Esperado

- Usuários visualizam facilmente quais veículos precisam de revisão
- Sistema alerta automaticamente a cada 10.000 km
- Processo de marcação de revisão concluída é simples e rápido
- Histórico de revisões é mantido no banco de dados
- Alertas WhatsApp são enviados (se configurado)
