# Prompt Frontend - Bases Secundarias no Dashboard

## Contexto
Implementar uma nova box no dashboard, abaixo da box da base principal, chamada **Bases Secundarias**.

Essa nova area e **somente para ADMIN** e deve servir apenas para controle informativo:
- Quantos produtos existem em cada base secundaria
- Quais modelos de produtos existem em cada base secundaria

Importante:
- Nao usar esta informacao para calculos de estoque
- Nao descontar nada do deposito principal
- Nao descontar nada do estoque dos usuarios
- Nao alterar nenhuma regra atual da base principal

---

## Endpoints backend disponiveis

### 1) Listar bases secundarias
- Metodo: `GET`
- URL: `/api/dashboard/bases-secundarias`
- Auth: Bearer token
- Acesso: ADMIN estrito

Exemplo de resposta:
```json
[
  {
    "id": "uuid-1",
    "nomeBase": "Base Secundaria 01",
    "quantidadeProdutos": 120,
    "modelosProdutos": "Pelucia Stitch, Pelucia Ursinho, Chaveiro Anime",
    "ativo": true,
    "createdAt": "2026-04-09T12:00:00.000Z",
    "updatedAt": "2026-04-09T12:00:00.000Z"
  }
]
```

### 2) Criar base secundaria
- Metodo: `POST`
- URL: `/api/dashboard/bases-secundarias`
- Auth: Bearer token
- Acesso: ADMIN estrito

Body:
```json
{
  "nomeBase": "Base Secundaria 02",
  "quantidadeProdutos": 75,
  "modelosProdutos": "Pelucia Capivara, Pelucia Panda",
  "ativo": true
}
```

### 3) Editar base secundaria
- Metodo: `PUT`
- URL: `/api/dashboard/bases-secundarias/:id`
- Auth: Bearer token
- Acesso: ADMIN estrito

Body:
```json
{
  "nomeBase": "Base Secundaria 02",
  "quantidadeProdutos": 80,
  "modelosProdutos": "Pelucia Capivara, Pelucia Panda, Pelucia Coelho",
  "ativo": true
}
```

---

## Requisitos de UI

1. Criar box "Bases Secundarias" abaixo da box da base principal no dashboard.
2. Exibir lista de cards, um card por base secundaria.
3. Cada card deve mostrar:
   - Nome da base
   - Quantidade de produtos
   - Modelos de produtos (texto livre)
   - Data de ultima atualizacao
4. Exibir botao "Adicionar base secundaria" (apenas ADMIN).
5. Em cada card, exibir botao "Editar" (apenas ADMIN).
6. Formularios com validacao:
   - `nomeBase`: obrigatorio
   - `quantidadeProdutos`: inteiro >= 0
   - `modelosProdutos`: opcional
7. Se usuario nao for ADMIN, esconder totalmente a box de bases secundarias.

---

## Requisitos de comportamento

1. Carregar dados no mount da tela (`GET /api/dashboard/bases-secundarias`).
2. Ao salvar criacao/edicao, atualizar a lista local sem quebrar o restante do dashboard.
3. Tratar estados:
   - loading
   - vazio (nenhuma base cadastrada)
   - erro de API
4. Nao reaproveitar regras de desconto de estoque dessa sessao.
5. Nao acoplar com componentes de estoque de loja/usuario.

---

## Criticos de qualidade

1. Nao pode haver regressao na box da base principal.
2. Nao pode haver efeito colateral em fluxos existentes de estoque.
3. Nao chamar endpoints de movimentacao de estoque para essa feature.
4. A feature deve ser totalmente independente e apenas informativa.
