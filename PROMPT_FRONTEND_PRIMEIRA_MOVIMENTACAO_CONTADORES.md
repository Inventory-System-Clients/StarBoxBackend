Objetivo:
Atualizar o frontend para suportar a nova regra da primeira movimentação de máquina:
- Na primeira movimentação de uma máquina, o formulário deve exibir 2 campos extras:
  - contadorInAnterior
  - contadorOutAnterior
- Ao enviar, o backend cria 2 movimentações:
  - 1ª com os contadores anteriores
  - 2ª com os contadores atuais

Mudança aplicada no backend:
1. POST /api/movimentacoes agora aceita:
   - contadorInAnterior
   - contadorOutAnterior
2. Se for a primeira movimentação da máquina:
   - contadorInAnterior, contadorOutAnterior, contadorIn e contadorOut são obrigatórios.
3. Resposta do POST inclui:
   - primeiraMovimentacaoDuplicada (boolean)
   - movimentacaoAnteriorId (UUID|null)
4. GET /api/maquinas/:maquinaId/calcular-quantidade-atual (ou rota equivalente já usada na tela) agora retorna:
   - totalMovimentacoes
   - primeiraMovimentacao

Regras para o frontend:
1. Ao abrir o formulário de movimentação da máquina, consultar endpoint de cálculo/quantidade atual.
2. Se primeiraMovimentacao === true:
   - exibir os campos contadorInAnterior e contadorOutAnterior.
   - tornar obrigatórios os 4 contadores:
     - contadorInAnterior
     - contadorOutAnterior
     - contadorIn
     - contadorOut
3. Se primeiraMovimentacao === false:
   - manter comportamento atual (sem exigir campos anteriores).
4. Enviar os novos campos no payload apenas quando primeiraMovimentacao === true (ou enviar null quando não for).

Exemplo de payload (primeira movimentação):
{
  "maquinaId": "uuid-maquina",
  "totalPre": 80,
  "abastecidas": 20,
  "fichas": 100,
  "contadorInAnterior": 1000,
  "contadorOutAnterior": 500,
  "contadorIn": 1100,
  "contadorOut": 520,
  "observacoes": "Primeira movimentacao da maquina"
}

Exemplo de resposta esperada no POST:
{
  "id": "uuid-da-movimentacao-atual",
  "primeiraMovimentacaoDuplicada": true,
  "movimentacaoAnteriorId": "uuid-da-movimentacao-anterior",
  "...": "demais campos"
}

Checklist frontend:
1. Form: renderização condicional dos campos anteriores.
2. Validação: obrigatoriedade condicional dos campos anteriores na primeira movimentação.
3. API: incluir novos campos no body quando aplicável.
4. UX: exibir mensagem curta explicando que a primeira movimentação cria dois registros automaticamente.
5. Testes:
   - máquina sem histórico: exibe campos anteriores e POST com sucesso.
   - máquina com histórico: não exibe campos anteriores e mantém fluxo atual.

Critérios de aceitação:
1. Primeira movimentação exige os 2 contadores anteriores e os 2 atuais.
2. Frontend não depende de heurística local; usa primeiraMovimentacao do backend.
3. Usuário consegue registrar primeira movimentação sem erro de validação indevida.
4. Fluxo atual de máquinas com histórico continua funcionando sem regressão.
