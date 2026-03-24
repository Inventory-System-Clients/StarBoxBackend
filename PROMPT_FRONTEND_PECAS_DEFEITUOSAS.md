# Prompt Frontend - Pecas Defeituosas (Funcionario + Admin)

## Objetivo
Implementar no frontend o fluxo de pecas defeituosas:
1. Ao concluir manutencao com peca usada, backend ja cria automaticamente a pendencia da peca defeituosa para o funcionario.
2. Todo funcionario deve ver sua aba de pecas defeituosas no dashboard.
3. Apenas ADMIN pode confirmar devolucao.
4. Ao confirmar, item sai das pendencias e vai para a base de pecas defeituosas.
5. ADMIN deve ter botao "Esvaziar base" para limpar toda a base.

---

## Endpoints Backend

### 1) Dashboard do funcionario logado
`GET /api/dashboard/pecas-defeituosas`

Resposta esperada:
```json
{
  "usuarioId": "uuid",
  "pendentes": [
    {
      "id": "uuid",
      "nomePecaOriginal": "bobina fina",
      "nomePecaDefeituosa": "bobina fina defeituosa",
      "quantidade": 1,
      "criadoEm": "2026-03-24T10:00:00.000Z"
    }
  ],
  "naBase": [
    {
      "id": "uuid",
      "nomePecaOriginal": "bobina fina",
      "nomePecaDefeituosa": "bobina fina defeituosa",
      "quantidade": 1,
      "confirmadoEm": "2026-03-24T13:00:00.000Z",
      "confirmadoPorId": "uuid-admin"
    }
  ],
  "totais": {
    "pendentes": 2,
    "naBase": 5
  }
}
```

### 2) Admin - Resumo por funcionario
`GET /api/admin/pecas-defeituosas/resumo-funcionarios`

Retorna lista de usuarios com:
- `pendentes` (o que precisa devolver)
- `naBase` (o que ja foi devolvido e confirmado)
- `totais`

### 3) Admin - Confirmar um item pendente
`POST /api/admin/pecas-defeituosas/:id/confirmar`

### 4) Admin - Confirmar tudo de um funcionario
`POST /api/admin/pecas-defeituosas/confirmar-usuario/:usuarioId`

### 5) Admin - Esvaziar base
`DELETE /api/admin/pecas-defeituosas/base/esvaziar`

---

## Regras de permissao
- Funcionario comum: ve apenas a propria aba (`/dashboard/pecas-defeituosas`).
- ADMIN: ve resumo completo e executa confirmacoes/esvaziar base.
- Em caso de `403`, mostrar mensagem de sem permissao.

---

## Implementacao de UI (sugestao)

### Dashboard do funcionario
Criar card/aba "Pecas defeituosas" com duas secoes:
1. `Pendentes de devolucao`
2. `Ja confirmadas (na base)`

Estados:
- loading inicial
- vazio (sem pendencias)
- erro de rede

### Painel Admin
Criar tela "Controle de pecas defeituosas" com:
1. Lista por funcionario
2. Tabela de pendentes por funcionario
3. Botao "Confirmar item" por linha
4. Botao "Confirmar tudo do funcionario"
5. Secao/historico de itens na base
6. Botao de risco: "Esvaziar base"

---

## Exemplo de servico frontend

```ts
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export async function getMinhasPecasDefeituosas() {
  const response = await fetch("/api/dashboard/pecas-defeituosas", {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Erro ao carregar dados");
  return payload;
}

export async function getResumoPecasDefeituosasAdmin() {
  const response = await fetch("/api/admin/pecas-defeituosas/resumo-funcionarios", {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Erro ao carregar resumo");
  return payload;
}

export async function confirmarPecaDefeituosa(itemId: string) {
  const response = await fetch(`/api/admin/pecas-defeituosas/${itemId}/confirmar`, {
    method: "POST",
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Erro ao confirmar devolucao");
  return payload;
}

export async function confirmarTudoFuncionario(usuarioId: string) {
  const response = await fetch(`/api/admin/pecas-defeituosas/confirmar-usuario/${usuarioId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Erro ao confirmar em lote");
  return payload;
}

export async function esvaziarBasePecasDefeituosas() {
  const response = await fetch("/api/admin/pecas-defeituosas/base/esvaziar", {
    method: "DELETE",
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Erro ao esvaziar base");
  return payload;
}
```

---

## UX obrigatoria
- Confirmacao antes de:
  - confirmar devolucao individual
  - confirmar tudo do funcionario
  - esvaziar base (acao destrutiva)
- Desabilitar botoes durante requisicao
- Feedback visual de sucesso/erro
- Atualizacao da lista sem reload completo da pagina

---

## Checklist rapido
- [ ] Exibir aba "Pecas defeituosas" no dashboard de todo funcionario
- [ ] Consumir `GET /api/dashboard/pecas-defeituosas`
- [ ] Tela ADMIN com resumo por funcionario
- [ ] Confirmacao individual (`POST /:id/confirmar`)
- [ ] Confirmacao em lote por funcionario
- [ ] Botao "Esvaziar base" com dupla confirmacao
- [ ] Tratar `401`, `403`, `404`, `500`
