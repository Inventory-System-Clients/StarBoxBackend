# 🔧 Sistema de Revisão de Veículos - Backend

## 📋 Resumo da Implementação

Sistema automático de alertas de revisão para veículos a cada 10.000 km, a partir do km inicial cadastrado.

---

## 🗄️ Alterações no Banco de Dados

### Migration: `20260310-add-revisao-fields-veiculos.js`

**Novas colunas na tabela `veiculos`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `km_inicial_cadastro` | INTEGER | KM do veículo quando foi cadastrado |
| `proxima_revisao_km` | INTEGER | Próximo KM de revisão (múltiplo de 10.000) |
| `ultima_revisao_km` | INTEGER | KM da última revisão realizada |

**Como executar:**

```bash
# Rodar migration
npm run migrate

# OU manualmente (se necessário)
node src/database/migrations/20260310-add-revisao-fields-veiculos.js
```

---

## 📁 Novos Arquivos Criados

### 1. Service: `src/services/revisaoVeiculoService.js`

**Funções:**

- `verificarRevisaoPendente(veiculoId)` - Verifica se veículo precisa de revisão
- `listarRevisoesPendentes()` - Lista todos os veículos com revisão pendente
- `concluirRevisao(veiculoId, kmRevisao)` - Marca revisão como concluída
- `verificarTodasRevisoes()` - Verifica revisões de todos os veículos

### 2. Controller: `src/controllers/revisaoVeiculoController.js`

**Endpoints:**

- `GET /revisoes-veiculos` - Lista revisões pendentes
- `POST /revisoes-veiculos/:veiculoId/concluir` - Marca revisão como concluída
- `POST /revisoes-veiculos/verificar-todas` - Verifica todas as revisões (admin)
- `POST /revisoes-veiculos/:veiculoId/verificar` - Verifica revisão de um veículo

### 3. Routes: `src/routes/revisaoVeiculo.routes.js`

Configuração das rotas de revisão (todas requerem autenticação).

---

## 📝 Arquivos Modificados

### 1. `src/models/Veiculo.js`

Adicionados novos campos ao modelo:
- `kmInicialCadastro`
- `proximaRevisaoKm`
- `ultimaRevisaoKm`

### 2. `src/controllers/veiculoController.js`

**Modificações:**

- **Criar veículo:** Inicializa campos de revisão automaticamente
- **Atualizar veículo:** Verifica revisão quando km é atualizado

### 3. `src/controllers/movimentacaoVeiculoController.js`

**Modificações:**

- **Registrar movimentação:** Verifica revisão quando km é informado

### 4. `src/routes/index.js`

Adicionada rota: `router.use("/revisoes-veiculos", revisaoVeiculoRoutes)`

---

## 🔄 Fluxo de Funcionamento

### 1. Criação de Veículo

```javascript
// Ao criar um veículo com 5.000 km
{
  km: 5000,
  kmInicialCadastro: 5000,
  proximaRevisaoKm: 10000  // Próxima revisão aos 10.000 km
}
```

### 2. Atualização de KM

```javascript
// Veículo atinge 10.500 km
PATCH /veiculos/:id
{ km: 10500 }

// Sistema detecta automaticamente:
// - KM atual (10500) >= próxima revisão (10000)
// - Cria alerta de revisão pendente no WhatsApp
// - Atualiza proximaRevisaoKm para 20000
```

### 3. Alerta Criado

```javascript
// WhatsAppAlerta gerado:
{
  tipo: "revisao_veiculo",
  mensagem: "🔧 REVISÃO PENDENTE\n\nVeículo: Carro 1...",
  status: "pendente",
  referenciaTipo: "veiculo",
  referenciaId: "uuid-veiculo",
  metadata: {
    veiculoNome: "Carro 1",
    kmAtual: 10500,
    kmRevisaoDevida: 10000,
    proximaRevisaoKm: 20000
  }
}
```

### 4. Conclusão da Revisão

```javascript
POST /revisoes-veiculos/:veiculoId/concluir
{
  kmRevisao: 10500  // Opcional
}

// Sistema:
// - Atualiza ultimaRevisaoKm
// - Recalcula proximaRevisaoKm
// - Marca alertas como "enviado" (resolvidos)
```

---

## 📡 API Endpoints

### GET `/revisoes-veiculos`

Lista todas as revisões pendentes.

**Response:**
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
  }
]
```

### POST `/revisoes-veiculos/:veiculoId/concluir`

Marca revisão como concluída.

**Body (opcional):**
```json
{
  "kmRevisao": 45000
}
```

**Response:**
```json
{
  "message": "Revisão marcada como concluída",
  "veiculo": { ... }
}
```

### POST `/revisoes-veiculos/verificar-todas`

Verifica revisões de todos os veículos (útil para rotinas administrativas).

**Response:**
```json
{
  "message": "Verificação de revisões concluída",
  "alertasCriados": 3,
  "alertas": [ ... ]
}
```

### POST `/revisoes-veiculos/:veiculoId/verificar`

Verifica revisão de um veículo específico.

**Response:**
```json
{
  "message": "Alerta de revisão criado",
  "alerta": { ... }
}
```

---

## 🔐 Autenticação

Todas as rotas requerem autenticação via middleware `authMiddleware`.

```javascript
Headers: {
  Authorization: "Bearer <token>"
}
```

---

## 🎯 Lógica de Cálculo de Revisão

### Cálculo da Próxima Revisão

```javascript
// Exemplo: Veículo está com 45.320 km
const kmAtual = 45320;

// Última revisão devida (múltiplo de 10.000)
const revisoesPassadas = Math.floor(kmAtual / 10000) * 10000;
// revisoesPassadas = 40000

// Próxima revisão
const proximaRevisao = revisoesPassadas + 10000;
// proximaRevisao = 50000
```

### Detecção de Revisão Pendente

```javascript
if (kmAtual >= proximaRevisaoKm) {
  // Veículo precisa de revisão
  // Criar alerta
}
```

---

## 🔔 Sistema de Alertas WhatsApp

### Configuração Necessária

Variáveis de ambiente:
```env
WHATSAPP_ACCESS_TOKEN=seu_token
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id
```

### Mensagem Enviada

```
🔧 REVISÃO PENDENTE

Veículo: Carro 1 (Toyota Corolla)
KM Atual: 45.320
Revisão deveria ter sido feita aos: 40.000 km

Próxima revisão: 50.000 km
```

### Comportamento

- ✅ Alerta criado automaticamente quando veículo atinge múltiplo de 10.000 km
- ✅ Não duplica alertas (verifica se já existe alerta pendente)
- ✅ Status do alerta: `pendente` → `enviado` (quando enviad ou revisão concluída)

---

## 🧪 Testes

### Testar Criação de Veículo

```bash
POST /veiculos
{
  "nome": "Carro Teste",
  "modelo": "Test Model",
  "tipo": "carro",
  "km": 5000
}

# Verificar no banco:
# - km_inicial_cadastro = 5000
# - proxima_revisao_km = 10000
```

### Testar Atualização de KM

```bash
PATCH /veiculos/:id
{
  "km": 10500
}

# Verificar:
# 1. Veículo atualizado com novo km
# 2. Alerta criado na tabela whatsapp_alertas
# 3. proxima_revisao_km atualizado para 20000
```

### Testar Listagem de Revisões Pendentes

```bash
GET /revisoes-veiculos

# Deve retornar lista de veículos com km >= proximaRevisaoKm
```

### Testar Conclusão de Revisão

```bash
POST /revisoes-veiculos/:veiculoId/concluir
{
  "kmRevisao": 10500
}

# Verificar:
# 1. ultima_revisao_km = 10500
# 2. proxima_revisao_km recalculado
# 3. Alertas marcados como "enviado"
```

---

## 🚨 Tratamento de Erros

### Erro ao verificar revisão

```javascript
try {
  await verificarRevisaoPendente(veiculoId);
} catch (error) {
  console.error("[Revisão] Erro:", error);
  // Não bloqueia operação principal
}
```

### Alerta já existe

```javascript
// Sistema verifica antes de criar novo alerta
const alertaExistente = await WhatsAppAlerta.findOne({
  where: {
    tipo: "revisao_veiculo",
    referenciaId: veiculoId,
    status: "pendente"
  }
});

if (alertaExistente) {
  return alertaExistente; // Não cria duplicado
}
```

---

## 📊 Monitoramento e Logs

### Logs Implementados

```javascript
console.log(`[Revisão] Alerta criado para veículo ${veiculo.nome} - KM ${kmAtual}`);
console.log(`[Revisão] Alerta já existe para veículo ${veiculo.nome}`);
console.log(`[Revisão] Revisão concluída para veículo ${veiculo.nome}`);
console.log(`[Revisão] Verificação completa: ${alertasCriados.length} alertas criados`);
```

### Verificação Manual

```bash
# Listar veículos
SELECT id, nome, km, proxima_revisao_km, ultima_revisao_km FROM veiculos;

# Listar alertas de revisão
SELECT * FROM whatsapp_alertas WHERE tipo = 'revisao_veiculo' AND status = 'pendente';

# Veículos que precisam revisão
SELECT * FROM veiculos WHERE km >= proxima_revisao_km;
```

---

## 🔄 Rotina de Verificação Periódica (Opcional)

Para verificar automaticamente todos os veículos periodicamente, pode-se usar um cron job:

```javascript
// Em um arquivo separado: src/jobs/verificarRevisoes.js
import cron from 'node-cron';
import { verificarTodasRevisoes } from '../services/revisaoVeiculoService.js';

// Executar todos os dias às 8h da manhã
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] Verificando revisões de veículos...');
  await verificarTodasRevisoes();
});
```

---

## ✅ Checklist de Implementação Completa

- [x] Migration para adicionar campos de revisão
- [x] Service com lógica de negócio
- [x] Controller com endpoints REST
- [x] Routes configuradas
- [x] Modelo Veiculo atualizado
- [x] Controller de veículos modificado
- [x] Controller de movimentação modificado
- [x] Integração com WhatsApp Alertas
- [x] Documentação para frontend gerada

---

## 📖 Documentos Relacionados

- `PROMPT_FRONTEND_REVISAO_VEICULOS.md` - Guia completo para implementação no frontend

---

## 🎯 Próximos Passos

1. ✅ Rodar migration no banco de dados
2. ✅ Testar endpoints via Postman/Insomnia
3. ⏳ Frontend implementar interface de revisões
4. ⏳ Configurar WhatsApp (opcional)
5. ⏳ Configurar rotina de verificação periódica (opcional)

---

## 🐛 Troubleshooting

### Campos não aparecem no modelo

Executar migration:
```bash
npm run migrate
```

### Alertas não são criados

Verificar:
1. Campo `proximaRevisaoKm` está populado?
2. KM do veículo é >= `proximaRevisaoKm`?
3. Verificar logs do console

### Duplicação de alertas

Sistema já previne duplicação, mas verificar manualmente:
```sql
SELECT * FROM whatsapp_alertas 
WHERE tipo = 'revisao_veiculo' 
AND referencia_id = 'uuid-veiculo' 
AND status = 'pendente';
```

---

**Data de Implementação:** 10/03/2026  
**Versão:** 1.0
