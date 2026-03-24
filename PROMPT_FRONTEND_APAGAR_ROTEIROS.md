# Prompt Frontend - Excluir Roteiros

## Objetivo
Implementar no frontend a acao de apagar roteiro com confirmacao, tratamento de erros e atualizacao da lista sem recarregar a pagina.

---

## Backend (ja implementado)

### Endpoint
`DELETE /api/roteiros/:id`

### Autenticacao e permissao
- Requer token JWT no header `Authorization: Bearer <token>`
- Acesso apenas para perfil `ADMIN`

### Resposta de sucesso
Status: `200`

```json
{
  "success": true,
  "message": "Roteiro apagado com sucesso"
}
```

### Respostas de erro esperadas
- `401` sem token ou token invalido
- `403` sem permissao de ADMIN
- `404` roteiro nao encontrado

```json
{
  "error": "Roteiro nao encontrado"
}
```

- `500` erro interno ao apagar roteiro

```json
{
  "error": "Erro ao apagar roteiro"
}
```

### Regra de negocio no backend
Ao apagar um roteiro, o backend remove dados diretamente ligados ao roteiro (como associacoes de lojas, finalizacoes diarias, gastos e logs de ordem) e desvincula historicos operacionais (movimentacoes/manutencoes) para nao quebrar referencia.

---

## Implementacao sugerida no frontend

### 1. Botao de excluir por item
Adicionar um botao de excluir em cada roteiro da listagem (tabela/card).

Exemplo React:

```jsx
async function handleExcluirRoteiro(roteiro) {
  const confirmar = window.confirm(
    `Deseja realmente apagar o roteiro "${roteiro.nome}"? Essa acao nao pode ser desfeita.`
  );

  if (!confirmar) return;

  try {
    const response = await fetch(`/api/roteiros/${roteiro.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        alert("Sessao expirada. Faca login novamente.");
        return;
      }

      if (response.status === 403) {
        alert("Voce nao tem permissao para apagar roteiros.");
        return;
      }

      if (response.status === 404) {
        alert("Roteiro nao encontrado. Atualize a lista.");
        await carregarRoteiros();
        return;
      }

      alert(payload.error || "Nao foi possivel apagar o roteiro.");
      return;
    }

    alert(payload.message || "Roteiro apagado com sucesso.");

    // Atualizacao otimista local (ou substitua por carregarRoteiros())
    setRoteiros((prev) => prev.filter((r) => r.id !== roteiro.id));
  } catch (error) {
    console.error("Erro ao apagar roteiro:", error);
    alert("Erro de rede ao apagar roteiro. Tente novamente.");
  }
}
```

---

### 2. UX recomendada
- Mostrar modal de confirmacao antes de apagar.
- Desabilitar botao enquanto a requisicao estiver em andamento.
- Mostrar estado de loading por item (ex.: "Apagando...").
- Atualizar a lista ao final sem reload completo.

---

### 3. Controle de permissao no frontend
- Exibir botao "Apagar" apenas para usuarios ADMIN.
- Mesmo com controle visual, manter tratamento de `403` no client.

Exemplo:

```jsx
{usuario?.perfil === "ADMIN" && (
  <button onClick={() => handleExcluirRoteiro(roteiro)}>
    Apagar
  </button>
)}
```

---

## Checklist rapido
- Endpoint chamado com metodo `DELETE`
- Token JWT enviado no header
- Confirmacao antes da exclusao
- Tratamento de `401`, `403`, `404`, `500`
- Lista atualizada apos sucesso
