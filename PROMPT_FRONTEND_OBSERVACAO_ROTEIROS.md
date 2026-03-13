# PROMPT FRONTEND - Campo de Observação em Roteiros

## Objetivo
Adicionar no frontend um campo de observação em roteiros para que:
- o ADMIN consiga criar/editar a observação;
- a observação fique visível para o funcionário na tela de execução do roteiro.

A observação deve ser persistida no backend na coluna `observacao` da tabela `Roteiros`.

---

## Contrato de API (backend já preparado)

### 1. Criar roteiro (admin)
`POST /api/roteiros`

Body:
```json
{
  "nome": "Roteiro Centro",
  "diasSemana": ["SEG", "QUA", "SEX"],
  "observacao": "Priorizar lojas com maior fluxo após as 14h"
}
```

### 2. Atualizar roteiro
`PATCH /api/roteiros/:id`

Body (enviar apenas o que mudou):
```json
{
  "observacao": "Levar troco para loja X e conferir máquina M004"
}
```

### 3. Buscar execução do roteiro (funcionário)
`GET /api/roteiros/:id/executar`

Resposta inclui:
```json
{
  "id": "uuid",
  "nome": "Roteiro Centro",
  "observacao": "Levar troco para loja X e conferir máquina M004",
  "status": "pendente",
  "lojas": []
}
```

### 4. Listar roteiros com status
`GET /api/roteiros/com-status`

Cada item inclui:
```json
{
  "id": "uuid",
  "nome": "Roteiro Centro",
  "observacao": "Priorizar lojas com maior fluxo",
  "status": "pendente"
}
```

---

## Requisitos de interface

### A. Tela de cadastro/edição de roteiro (ADMIN)
1. Adicionar campo de texto multi-linha:
- label: `Observação do roteiro`
- name: `observacao`
- placeholder: `Ex: conferir máquina M003, levar peças de reposição...`
- opcional (pode ficar vazio)

2. No submit:
- incluir `observacao` no payload de `POST /api/roteiros` e `PATCH /api/roteiros/:id`;
- enviar `null` ou string vazia quando admin apagar o conteúdo.

3. Validação frontend:
- aceitar texto livre;
- limite recomendado: 1000 caracteres;
- trim antes de enviar (`valor.trim()`).

### B. Tela de execução do roteiro (FUNCIONÁRIO)
1. Ao carregar `GET /api/roteiros/:id/executar`, exibir o bloco de observação no topo da tela.
2. Mostrar o bloco apenas quando `observacao` tiver conteúdo.
3. Layout sugerido:
- título: `Observações do Admin`
- conteúdo: texto com quebra de linha preservada
- destaque visual leve (caixa com fundo suave)

---

## Exemplo de implementação (React)

### Estado do formulário (admin)
```jsx
const [formData, setFormData] = useState({
  nome: "",
  diasSemana: [],
  observacao: "",
});
```

### Submit criar/editar roteiro
```jsx
const payload = {
  nome: formData.nome,
  diasSemana: formData.diasSemana,
  observacao: formData.observacao?.trim() || null,
};

if (modoEdicao) {
  await api.patch(`/roteiros/${roteiroId}`, payload);
} else {
  await api.post('/roteiros', payload);
}
```

### Render na execução do roteiro (funcionário)
```jsx
{roteiro?.observacao && (
  <section className="roteiro-observacao-admin">
    <h3>Observações do Admin</h3>
    <p style={{ whiteSpace: 'pre-wrap' }}>{roteiro.observacao}</p>
  </section>
)}
```

---

## Checklist
- [ ] Campo `observacao` no formulário de criação de roteiro
- [ ] Campo `observacao` no formulário de edição de roteiro
- [ ] Envio de `observacao` no `POST /api/roteiros`
- [ ] Envio de `observacao` no `PATCH /api/roteiros/:id`
- [ ] Exibição da observação em `/:id/executar` para funcionário
- [ ] Tratamento visual quando não houver observação
- [ ] Toast de sucesso/erro no salvar

---

## Testes manuais sugeridos
1. Criar roteiro com observação e verificar persistência.
2. Editar observação existente e validar atualização.
3. Apagar observação e verificar se some na execução.
4. Logar como funcionário e abrir execução do roteiro:
- a observação do admin deve aparecer no topo.
5. Validar quebra de linha (texto com múltiplas linhas).
