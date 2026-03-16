# PROMPT FRONTEND - KM de Revisao Editavel por Veiculo (Aba Veiculos)

## Objetivo
Implementar na aba Veiculos um botao por item para editar o KM base (intervalo) usado no alerta de revisao pendente.

Hoje o sistema usa 10000 como padrao para todos.
Com essa melhoria, cada veiculo pode ter seu proprio intervalo (ex.: 5000, 8000, 12000).

---

## O que o backend ja entrega

### 1) Novo campo no objeto veiculo
Retornado em `GET /api/veiculos`:
- `intervaloRevisaoKm` (integer)
- `proximaRevisaoKm` (integer)

Exemplo:
```json
{
  "id": "uuid",
  "nome": "Fiorino 1",
  "modelo": "Fiorino",
  "km": 74231,
  "intervaloRevisaoKm": 8000,
  "proximaRevisaoKm": 80000,
  "alertaRevisaoPendente": false
}
```

### 2) Novo endpoint para editar apenas o intervalo de revisao
`PATCH /api/veiculos/:id/intervalo-revisao`

Body:
```json
{
  "intervaloRevisaoKm": 8000
}
```

Resposta de sucesso:
```json
{
  "message": "Intervalo de revisão atualizado com sucesso",
  "veiculo": {
    "id": "uuid",
    "intervaloRevisaoKm": 8000,
    "proximaRevisaoKm": 80000
  }
}
```

Erros esperados:
- `400`: `intervaloRevisaoKm e obrigatorio`
- `400`: `intervaloRevisaoKm deve ser um numero inteiro maior que zero`
- `404`: `Veiculo nao encontrado`

---

## Requisito de UX (aba Veiculos)

Para cada veiculo na listagem:
1. Exibir o valor atual de `intervaloRevisaoKm`.
2. Mostrar um botao `Editar KM Revisao`.
3. Ao clicar, abrir modal (ou inline edit) com input numerico inteiro.
4. Validar no frontend antes de enviar:
- obrigatorio
- inteiro > 0
5. Enviar PATCH para o veiculo selecionado.
6. Atualizar a lista local com `veiculo` retornado na resposta (sem reload total, se possivel).
7. Exibir feedback visual (loading, sucesso, erro).

---

## Exemplo de implementacao (React)

### Chamada de API
```javascript
async function atualizarIntervaloRevisao(veiculoId, intervaloRevisaoKm) {
  const response = await api.patch(`/veiculos/${veiculoId}/intervalo-revisao`, {
    intervaloRevisaoKm: Number(intervaloRevisaoKm),
  });
  return response.data;
}
```

### Estado sugerido
```javascript
const [veiculoEditandoIntervalo, setVeiculoEditandoIntervalo] = useState(null);
const [intervaloInput, setIntervaloInput] = useState("");
const [salvandoIntervalo, setSalvandoIntervalo] = useState(false);
```

### Abrir modal
```javascript
function abrirModalIntervalo(veiculo) {
  setVeiculoEditandoIntervalo(veiculo);
  setIntervaloInput(String(veiculo.intervaloRevisaoKm || 10000));
}
```

### Salvar
```javascript
async function salvarIntervaloRevisao() {
  const valor = Number(intervaloInput);

  if (!Number.isInteger(valor) || valor <= 0) {
    toast.error("Informe um KM inteiro maior que zero");
    return;
  }

  try {
    setSalvandoIntervalo(true);
    const { veiculo } = await atualizarIntervaloRevisao(
      veiculoEditandoIntervalo.id,
      valor,
    );

    setVeiculos((prev) =>
      prev.map((item) => (item.id === veiculo.id ? veiculo : item)),
    );

    toast.success("Intervalo de revisao atualizado");
    setVeiculoEditandoIntervalo(null);
    setIntervaloInput("");
  } catch (err) {
    toast.error(err?.response?.data?.error || "Erro ao atualizar intervalo");
  } finally {
    setSalvandoIntervalo(false);
  }
}
```

---

## Onde mostrar no card/tabela do veiculo

Adicionar bloco:
- `Intervalo revisao: X km`
- `Proxima revisao: Y km`

Exemplo visual:
- `Intervalo revisao: 8.000 km`
- `Proxima revisao: 80.000 km`

---

## Checklist de entrega frontend

- [ ] Mostrar `intervaloRevisaoKm` por veiculo
- [ ] Botao por veiculo: `Editar KM Revisao`
- [ ] Modal/input para editar valor
- [ ] Chamada `PATCH /api/veiculos/:id/intervalo-revisao`
- [ ] Validacao inteiro > 0
- [ ] Atualizar estado local apos sucesso
- [ ] Feedback de loading/sucesso/erro

---

## Observacao importante
Ao alterar o intervalo, o backend recalcula automaticamente `proximaRevisaoKm` e reavalia alerta pendente para aquele veiculo.
