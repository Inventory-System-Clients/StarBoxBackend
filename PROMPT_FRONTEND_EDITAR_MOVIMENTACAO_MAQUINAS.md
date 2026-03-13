# PROMPT FRONTEND - Editar Movimentações de Máquinas e Exibir Contadores

## 📋 OBJETIVO

Implementar no frontend a funcionalidade de **editar movimentações de máquinas no histórico** e **exibir os contadores IN e OUT (digitais e analógicos)** em todas as telas relevantes.

---

## 🎯 FUNCIONALIDADES A IMPLEMENTAR

### 1. Exibir Contadores IN e OUT no Histórico de Movimentações

**Onde:** Tela de histórico de movimentações de cada máquina

**Campos para exibir:**
- `contadorIn` - Contador IN (digital + analógico)
- `contadorOut` - Contador OUT (digital + analógico)
- `contadorMaquina` - Contador da máquina (se disponível)

**Nota:** Os campos `contadorInDigital`, `contadorOutDigital`, `contadorInManual` e `contadorOutManual` são usados apenas no registro da movimentação. O backend soma esses valores e salva em `contadorIn` e `contadorOut`. Portanto, **exibir apenas `contadorIn` e `contadorOut`** no histórico.

### 2. Botão de Editar Movimentação

**Onde:** Cada linha do histórico de movimentações

**Requisitos:**
- Botão "Editar" (ícone de lápis/edição)
- Ao clicar, abrir um modal/formulário com os dados da movimentação
- Permitir editar apenas os campos autorizados (ver lista abaixo)
- Validar permissões (apenas ADMIN ou o próprio usuário que criou pode editar)

### 3. Campos Editáveis na Movimentação

**Campos que podem ser editados:**
- `totalPre` - Quantidade antes da coleta (número inteiro)
- `sairam` - Quantidade de prêmios que saíram (número inteiro)
- `abastecidas` - Quantidade reposta (número inteiro)
- `fichas` - Número de fichas coletadas (número inteiro)
- `contadorIn` - Contador IN (número inteiro)
- `contadorOut` - Contador OUT (número inteiro)
- `contadorMaquina` - Valor do contador da máquina (número inteiro, opcional)
- `quantidade_notas_entrada` - Valor de notas inseridas (decimal)
- `valor_entrada_maquininha_pix` - Valor maquininha/PIX (decimal)
- `observacoes` - Observações (texto)
- `tipoOcorrencia` - Tipo de ocorrência (select: Normal, Manutenção, Troca de Máquina, Problema)
- `dataColeta` - Data da coleta (datetime)

**Campos calculados automaticamente (não editáveis):**
- `totalPos` - Calculado pelo backend (totalPre + abastecidas ou totalPre - sairam + abastecidas)
- `valorFaturado` - Calculado pelo backend (fichas * valorFicha + notas + digital)
- `mediaFichasPremio` - Calculado pelo backend (fichas / sairam)

---

## 🔌 ENDPOINTS DO BACKEND

### 1. Listar Movimentações
```
GET /api/movimentacoes?maquinaId={maquinaId}
```

**Resposta:** Array de movimentações com todos os campos, incluindo:
```json
{
  "id": "uuid",
  "maquinaId": "uuid",
  "dataColeta": "2026-03-12T10:30:00.000Z",
  "totalPre": 50,
  "sairam": 10,
  "abastecidas": 20,
  "totalPos": 70,
  "fichas": 100,
  "contadorIn": 1500,
  "contadorOut": 850,
  "contadorMaquina": 2350,
  "quantidade_notas_entrada": 25.00,
  "valor_entrada_maquininha_pix": 15.50,
  "valorFaturado": 540.50,
  "mediaFichasPremio": 10.00,
  "observacoes": "Coleta normal",
  "tipoOcorrencia": "Normal",
  "maquina": {
    "id": "uuid",
    "codigo": "M001",
    "nome": "Máquina Teste"
  },
  "usuario": {
    "id": "uuid",
    "nome": "João Silva"
  }
}
```

### 2. Obter Movimentação por ID
```
GET /api/movimentacoes/:id
```

**Resposta:** Objeto completo da movimentação (mesma estrutura acima)

### 3. Atualizar Movimentação (✨ NOVO)
```
PUT /api/movimentacoes/:id
Authorization: Bearer {token}
```

**Body (JSON):**
```json
{
  "totalPre": 55,
  "sairam": 12,
  "abastecidas": 25,
  "fichas": 120,
  "contadorIn": 1550,
  "contadorOut": 900,
  "contadorMaquina": 2450,
  "quantidade_notas_entrada": 30.00,
  "valor_entrada_maquininha_pix": 20.00,
  "observacoes": "Coleta revisada",
  "tipoOcorrencia": "Normal",
  "dataColeta": "2026-03-12T10:30:00.000Z"
}
```

**Observação:** Enviar apenas os campos que foram alterados. O backend mantém os valores originais para campos não enviados.

**Resposta de sucesso (200):**
```json
{
  "id": "uuid",
  "... todos os campos atualizados ..."
}
```

**Resposta de erro (403):**
```json
{
  "error": "Você não pode editar esta movimentação"
}
```

**Resposta de erro (404):**
```json
{
  "error": "Movimentação não encontrada"
}
```

---

## 🎨 INTERFACE SUGERIDA

### Histórico de Movimentações

**Tabela com colunas:**
| Data | Total Pré | Saíram | Abastecidas | Total Pós | Fichas | IN | OUT | Valor Faturado | Ações |
|------|-----------|---------|-------------|-----------|--------|-----|-----|----------------|-------|
| 12/03 | 50 | 10 | 20 | 70 | 100 | 1500 | 850 | R$ 540,50 | ✏️ |

**Dica:** Você pode usar um ícone de olho (👁️) para expandir detalhes adicionais como:
- Contador da máquina
- Notas de entrada
- Valor maquininha/PIX
- Observações
- Tipo de ocorrência
- Usuário que registrou

### Modal de Edição

**Layout sugerido:**

```
┌─────────────────────────────────────────────┐
│  Editar Movimentação - M001                 │
├─────────────────────────────────────────────┤
│                                             │
│  Data da Coleta: [12/03/2026 10:30]        │
│                                             │
│  📦 QUANTIDADES                             │
│  Total Pré:      [50]                       │
│  Saíram:         [10]                       │
│  Abastecidas:    [20]                       │
│  Total Pós:      70 (calculado)             │
│                                             │
│  🎰 FICHAS E CONTADORES                     │
│  Fichas:         [100]                      │
│  Contador IN:    [1500]                     │
│  Contador OUT:   [850]                      │
│  Contador Máq:   [2350]                     │
│                                             │
│  💰 VALORES                                 │
│  Notas Entrada:  [R$ 25,00]                 │
│  Maquininha/PIX: [R$ 15,50]                 │
│  Valor Faturado: R$ 540,50 (calculado)      │
│                                             │
│  📝 OBSERVAÇÕES                             │
│  Tipo:           [Normal ▼]                 │
│  Observações:    [____________]             │
│                               [____________] │
│                                             │
│  [Cancelar]              [Salvar Alterações]│
└─────────────────────────────────────────────┘
```

---

## 🔐 VALIDAÇÕES E PERMISSÕES

### Permissões
- ✅ **ADMIN**: Pode editar qualquer movimentação
- ✅ **Usuário criador**: Pode editar apenas suas próprias movimentações
- ❌ **Outros usuários**: Não podem editar

### Validações no Frontend
1. Campos numéricos devem aceitar apenas números
2. Valores monetários devem aceitar decimais (ex: 25.50)
3. Data deve estar em formato válido
4. Mostrar mensagem de confirmação antes de salvar
5. Mostrar loading durante a requisição
6. Mostrar mensagem de sucesso ou erro após salvar

### Tratamento de Erros
```javascript
try {
  const response = await api.put(`/movimentacoes/${id}`, dados);
  // Sucesso - atualizar a lista local
  toast.success('Movimentação atualizada com sucesso!');
  atualizarListaMovimentacoes();
  fecharModal();
} catch (error) {
  if (error.response?.status === 403) {
    toast.error('Você não tem permissão para editar esta movimentação');
  } else if (error.response?.status === 404) {
    toast.error('Movimentação não encontrada');
  } else {
    toast.error('Erro ao atualizar movimentação');
  }
}
```

---

## 📱 IMPLEMENTAÇÃO PASSO A PASSO

### Passo 1: Adicionar Contadores na Tabela de Histórico

1. Localizar o componente que exibe o histórico de movimentações
2. Adicionar colunas para `contadorIn` e `contadorOut` na tabela
3. Formatar os valores (número inteiro com separador de milhares)

**Exemplo:**
```jsx
<td>{movimentacao.contadorIn?.toLocaleString() || '-'}</td>
<td>{movimentacao.contadorOut?.toLocaleString() || '-'}</td>
```

### Passo 2: Adicionar Botão de Edição

1. Adicionar coluna "Ações" na tabela
2. Adicionar botão "Editar" com ícone
3. Verificar permissão antes de exibir o botão:

```jsx
{(usuario.role === 'ADMIN' || movimentacao.usuarioId === usuario.id) && (
  <button onClick={() => abrirModalEdicao(movimentacao)}>
    <FaPencilAlt /> Editar
  </button>
)}
```

### Passo 3: Criar Modal de Edição

1. Criar componente `ModalEditarMovimentacao.jsx`
2. Incluir todos os campos editáveis (ver lista acima)
3. Preencher valores atuais ao abrir o modal
4. Implementar função de salvar:

```jsx
const salvarEdicao = async () => {
  try {
    setLoading(true);
    const response = await api.put(`/movimentacoes/${movimentacao.id}`, {
      totalPre: parseInt(formData.totalPre),
      sairam: parseInt(formData.sairam),
      abastecidas: parseInt(formData.abastecidas),
      fichas: parseInt(formData.fichas),
      contadorIn: parseInt(formData.contadorIn) || null,
      contadorOut: parseInt(formData.contadorOut) || null,
      contadorMaquina: parseInt(formData.contadorMaquina) || null,
      quantidade_notas_entrada: parseFloat(formData.quantidade_notas_entrada) || null,
      valor_entrada_maquininha_pix: parseFloat(formData.valor_entrada_maquininha_pix) || null,
      observacoes: formData.observacoes,
      tipoOcorrencia: formData.tipoOcorrencia,
      dataColeta: formData.dataColeta,
    });
    
    toast.success('Movimentação atualizada com sucesso!');
    onSucesso(response.data); // Atualizar lista
    onClose();
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    toast.error(error.response?.data?.error || 'Erro ao atualizar movimentação');
  } finally {
    setLoading(false);
  }
};
```

### Passo 4: Atualizar Lista Após Edição

1. Após salvar com sucesso, atualizar a lista de movimentações
2. Opção 1: Refazer o GET para buscar dados atualizados
3. Opção 2: Atualizar apenas o item editado localmente

```jsx
const atualizarMovimentacaoNaLista = (movimentacaoAtualizada) => {
  setMovimentacoes(prev => 
    prev.map(mov => 
      mov.id === movimentacaoAtualizada.id ? movimentacaoAtualizada : mov
    )
  );
};
```

---

## 📊 EXEMPLO COMPLETO DE COMPONENTE

```jsx
import React, { useState } from 'react';
import { FaPencilAlt, FaEye } from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';
import ModalEditarMovimentacao from './ModalEditarMovimentacao';

const HistoricoMovimentacoes = ({ maquinaId }) => {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] = useState(null);
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  useEffect(() => {
    carregarMovimentacoes();
  }, [maquinaId]);

  const carregarMovimentacoes = async () => {
    try {
      const response = await api.get(`/movimentacoes?maquinaId=${maquinaId}`);
      setMovimentacoes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar movimentações');
    }
  };

  const abrirModalEdicao = (movimentacao) => {
    setMovimentacaoSelecionada(movimentacao);
    setModalAberto(true);
  };

  const podeEditar = (movimentacao) => {
    return usuario.role === 'ADMIN' || movimentacao.usuarioId === usuario.id;
  };

  const atualizarMovimentacao = (movimentacaoAtualizada) => {
    setMovimentacoes(prev =>
      prev.map(mov =>
        mov.id === movimentacaoAtualizada.id ? movimentacaoAtualizada : mov
      )
    );
  };

  return (
    <div className="historico-movimentacoes">
      <h2>Histórico de Movimentações</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Total Pré</th>
            <th>Saíram</th>
            <th>Abastecidas</th>
            <th>Total Pós</th>
            <th>Fichas</th>
            <th>IN</th>
            <th>OUT</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map(mov => (
            <tr key={mov.id}>
              <td>{new Date(mov.dataColeta).toLocaleDateString()}</td>
              <td>{mov.totalPre}</td>
              <td>{mov.sairam}</td>
              <td>{mov.abastecidas}</td>
              <td>{mov.totalPos}</td>
              <td>{mov.fichas}</td>
              <td>{mov.contadorIn?.toLocaleString() || '-'}</td>
              <td>{mov.contadorOut?.toLocaleString() || '-'}</td>
              <td>R$ {mov.valorFaturado?.toFixed(2)}</td>
              <td>
                {podeEditar(mov) && (
                  <button
                    onClick={() => abrirModalEdicao(mov)}
                    className="btn-editar"
                    title="Editar movimentação"
                  >
                    <FaPencilAlt />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalAberto && (
        <ModalEditarMovimentacao
          movimentacao={movimentacaoSelecionada}
          onClose={() => setModalAberto(false)}
          onSucesso={atualizarMovimentacao}
        />
      )}
    </div>
  );
};

export default HistoricoMovimentacoes;
```

---

## 🧪 TESTES MANUAIS SUGERIDOS

1. ✅ Exibir histórico com contadores IN e OUT
2. ✅ Clicar em "Editar" e abrir modal com dados preenchidos
3. ✅ Editar valores e salvar com sucesso
4. ✅ Verificar que lista é atualizada após salvar
5. ✅ Tentar editar sem permissão (deve mostrar erro 403)
6. ✅ Editar como ADMIN (deve funcionar)
7. ✅ Editar como criador da movimentação (deve funcionar)
8. ✅ Verificar cálculos automáticos (totalPos, valorFaturado)
9. ✅ Testar com campos vazios/nulos
10. ✅ Testar cancelar edição sem salvar

---

## 🚨 OBSERVAÇÕES IMPORTANTES

1. **Contadores Digitais vs Analógicos:** No backend, os campos `contadorInDigital`, `contadorOutDigital`, `contadorInManual` e `contadorOutManual` são usados apenas no **registro inicial** da movimentação. O backend soma esses valores e salva em `contadorIn` e `contadorOut`. Portanto, ao editar, apenas `contadorIn` e `contadorOut` devem ser editados.

2. **Campos Calculados:** Os campos `totalPos`, `valorFaturado` e `mediaFichasPremio` são calculados automaticamente pelo backend. **Não enviar** esses campos no PUT.

3. **Validações:** O backend já realiza validações de negócio (ex: não permitir IN menor que o anterior para não-admin). O frontend deve apenas validar tipos de dados.

4. **Permissões:** Sempre verificar permissões antes de exibir o botão de edição e tratar erros 403.

5. **Data/Hora:** O campo `dataColeta` deve ser enviado como string ISO (ex: "2026-03-12T10:30:00.000Z").

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Adicionar colunas IN e OUT na tabela de histórico
- [ ] Adicionar botão "Editar" com verificação de permissão
- [ ] Criar componente ModalEditarMovimentacao
- [ ] Implementar formulário com todos os campos editáveis
- [ ] Implementar função de salvar (PUT /api/movimentacoes/:id)
- [ ] Tratar erros (403, 404, 500)
- [ ] Atualizar lista após edição bem-sucedida
- [ ] Adicionar loading durante requisição
- [ ] Adicionar mensagens de sucesso/erro (toast)
- [ ] Testar todas as funcionalidades
- [ ] Testar permissões (ADMIN, criador, outros)
- [ ] Validar campos numéricos e de data

---

## ✅ CONCLUSÃO

Com essas alterações, o sistema permitirá:
- ✅ Visualizar contadores IN e OUT no histórico
- ✅ Editar movimentações com validações adequadas
- ✅ Controlar permissões de edição
- ✅ Manter dados consistentes com cálculos automáticos

**Boa implementação! 🚀**
