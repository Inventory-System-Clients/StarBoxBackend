# PROMPT FRONTEND — Total de Pontos e Estoque Adicional no Resumo de Finalização

## Contexto

Ao finalizar uma rota, o backend retorna um campo `resumoTextoCopiar` com a mensagem completa para WhatsApp. O mesmo conteúdo pode ser obtido também via `GET /api/roteiros/:id/resumo-execucao`.

O backend foi atualizado para incluir dois novos campos na mensagem de resumo:

1. **Total de pontos na rota** — quantidade total de lojas (pontos) presentes na rota, exibido ANTES das linhas de pontos feitos/não feitos.
2. **Estoque adicional** — quantidade de produtos que o admin adicionou ao estoque do funcionário APÓS o início da rota. Exibido apenas quando for maior que zero, com breakdown da sobra do estoque inicial e sobra do estoque adicional.

---

## Formato atualizado da mensagem (`resumoTextoCopiar`)

```
Roteiro: {nome}
Veiculo da rota: {nome}       (se houver)
KM inicial: {N}
KM final: {N}
KM percorrido: {N}
Total de pontos na rota: {N}  ← NOVO (acima de pontos feitos/não feitos)
Pontos feitos: {N}
Pontos nao feitos: {N}
Maquinas feitas: {N}
Maquinas nao feitas: {N}
Estoque inicial: {N} produtos
Estoque adicional: {N} produtos     ← NOVO (só aparece se > 0)
Sobra estoque inicial: {N} produtos ← NOVO (só aparece se estoque adicional > 0)
Sobra estoque adicional: {N} produtos ← NOVO (só aparece se estoque adicional > 0)
Estoque final: {N} produtos
Total gasto na rota: {N} produtos
Despesa total: R$ X,XX
Sobra valor despesa: R$ X,XX
...
```

---

## O que precisa ser feito no Frontend

### 1. Tela/modal de resumo de finalização de rota

Na tela onde o resumo é exibido ao finalizar a rota (ou ao visualizar o resumo de uma rota já finalizada), adicionar as seguintes seções:

#### a) Total de pontos na rota

Exibir **acima** das linhas de "Pontos feitos" e "Pontos não feitos":

```
Total de pontos na rota: {totalPontosNaRota}
```

Como calcular no frontend (se você já tem a lista de lojas da rota):
```js
const totalPontosNaRota = lojas.length;
// OU, a partir dos dados do resumo:
const totalPontosNaRota = (resumo.pontosFeitos?.length ?? 0) + (resumo.pontosNaoFeitos?.length ?? 0);
```

#### b) Estoque adicional

Exibir **após** "Estoque inicial" e **antes** de "Estoque final", mas **somente quando `estoqueAdicional > 0`**:

```
Estoque adicional: {estoqueAdicional} produtos
Sobra estoque inicial: {sobraEstoqueInicial} produtos
Sobra estoque adicional: {sobraEstoqueAdicional} produtos
```

**Fórmulas para calcular no frontend:**
```js
const estoqueInicial = resumo.estoqueInicialTotal ?? 0;
const consumoTotal = resumo.consumoTotalProdutos ?? 0;

// estoqueAdicional vem do backend via resumoTextoCopiar (texto) ou precisa de endpoint próprio.
// Se o frontend não tem acesso ao valor numérico de estoqueAdicional diretamente,
// use o endpoint: GET /api/roteiros/:id/resumo-execucao e extraia do texto,
// ou peça ao backend para adicionar o campo no JSON de resposta (ver seção abaixo).

const sobraEstoqueInicial = Math.max(0, estoqueInicial - consumoTotal);
const consumoDoAdicional = Math.max(0, consumoTotal - estoqueInicial);
const sobraEstoqueAdicional = Math.max(0, estoqueAdicional - consumoDoAdicional);
```

---

## Adaptação na API (se necessário)

Se o frontend precisar exibir os valores numéricos de `estoqueAdicional`, `sobraEstoqueInicial` e `sobraEstoqueAdicional` separadamente (não apenas no texto), solicite ao backend que inclua esses campos no JSON de resposta de `GET /api/roteiros/:id/resumo-execucao` ou na resposta de `POST /api/roteiros/:id/finalizar`.

**Campos adicionais sugeridos a adicionar no JSON do response:**
```json
{
  "estoqueAdicional": 12,
  "sobraEstoqueInicial": 3,
  "sobraEstoqueAdicional": 7,
  "totalPontosNaRota": 8
}
```

Esses valores já são calculados pelo backend ao gerar a mensagem de WhatsApp. Basta expô-los também no JSON.

---

## Comportamento visual esperado

### Quando `estoqueAdicional === 0`
- Não exibir nenhuma linha relacionada a estoque adicional.
- Manter o layout atual com Estoque inicial → Estoque final → Total gasto.

### Quando `estoqueAdicional > 0`
Exibir seção expandida de estoque:

| Campo | Valor |
|---|---|
| Estoque inicial | N produtos |
| Estoque adicional | N produtos ← destaque visual (cor diferente ou badge) |
| Sobra estoque inicial | N produtos |
| Sobra estoque adicional | N produtos |
| Estoque final | N produtos |
| Total gasto na rota | N produtos |

Sugestão: destacar a linha "Estoque adicional" com uma cor de aviso/informação (ex: azul ou amarelo) para indicar que o admin adicionou mais estoque durante a rota.

---

## Botão "Copiar Resumo"

O campo `resumoTextoCopiar` na resposta de `POST /api/roteiros/:id/finalizar` contém o texto completo já atualizado com as novas linhas. O botão de copiar deve continuar usando esse campo diretamente:

```js
await navigator.clipboard.writeText(response.resumoTextoCopiar);
```

A mensagem copiada já incluirá automaticamente:
- `Total de pontos na rota: N` (sempre presente)
- `Estoque adicional: N produtos` + linhas de sobra (apenas quando > 0)

---

## Resumo das mudanças necessárias no Frontend

1. **Exibir "Total de pontos na rota"** acima de "Pontos feitos / Pontos não feitos" na UI do resumo.
2. **Exibir bloco de estoque adicional** (3 linhas) condicionalmente após "Estoque inicial", somente quando `estoqueAdicional > 0`.
3. **Botão copiar resumo** — nenhuma alteração necessária, o texto já está atualizado.
4. (Opcional) Solicitar ao backend campos numéricos adicionais no JSON se precisar renderizar dinamicamente sem parsear o texto.
