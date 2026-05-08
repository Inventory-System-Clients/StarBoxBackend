# Prompt para o frontend: status verde persistente durante execucao semanal do roteiro

Precisamos revisar a tela/fluxo de execucao de roteiros para garantir que lojas/pontos e maquinas nao voltem para branco/pendente no dia seguinte enquanto a rota semanal ainda estiver em andamento.

Regra de negocio correta:

- O funcionario inicia a rota normalmente, geralmente na segunda-feira.
- Depois que a rota foi iniciada, o botao deve deixar de ser "Comecar rota" e passar a ser "Continuar rota" enquanto `execucaoSemanal.emAndamento === true`.
- Toda maquina/ponto/loja que tiver pelo menos uma movimentacao durante a execucao atual do roteiro deve ficar verde/finalizada e permanecer assim ate:
  - o funcionario finalizar manualmente a rota no sabado/domingo; ou
  - ocorrer o reset semanal do backend no domingo as 21h.
- O frontend nao deve recalcular o verde olhando somente "hoje". Deve considerar o periodo da execucao semanal, usando `dataInicio`, `emAndamento`, `finalizadoEm`, `lojas[].status`, `maquinas[].status`, `movimentacoesConsideradas` e/ou `movimentacoesHoje` retornados pelo backend.
- Nao limpar estado visual verde ao virar o dia se a rota ainda estiver em andamento.

Endpoints a revisar no frontend:

- `GET /roteiros/:id/executar`
- `GET /roteiros/com-status`
- `GET /roteiros/:id/status-execucao`, se estiver sendo usado
- `GET /status-diario?maquinaId=...&roteiroId=...`, se estiver sendo usado
- `POST /roteiros/:id/iniciar`
- `POST /roteiros/:id/finalizar`
- `GET /roteiros/:id/status-semanal` ou endpoint equivalente, se existir no app

O que conferir/corrigir:

1. Ao abrir a lista de rotas, se `execucaoSemanal.emAndamento === true`, renderizar o botao como "Continuar rota", nao "Comecar rota".
2. Ao abrir a execucao da rota, usar preferencialmente `lojas[].status === "finalizado"` e `maquinas[].status === "finalizado"` vindos do backend.
3. Se houver logica local que filtra movimentacoes por data atual, remover ou adaptar para considerar o periodo `dataInicio` ate hoje enquanto `emAndamento === true`.
4. Se o app tiver cache/localStorage/store global, nao sobrescrever um ponto verde para branco quando chegar uma resposta parcial/antiga sem status, desde que a execucao semanal ainda seja a mesma.
5. Fallback desejado: manter um registro local por `roteiroId + dataInicio + maquinaId/lojaId` de pontos que ja ficaram verdes pelo menos uma vez. Enquanto `execucaoSemanal.emAndamento === true` e `dataInicio` nao mudou, se um ponto ja ficou verde uma vez, continuar mostrando verde mesmo que alguma resposta momentanea venha como pendente.
6. Limpar esse fallback local quando:
   - a rota for finalizada com sucesso;
   - `execucaoSemanal.dataInicio` mudar;
   - `execucaoSemanal.emAndamento` virar false por reset semanal;
   - o backend retornar claramente uma nova execucao semanal.
7. Conferir se alguma chamada diaria, efeito de montagem, polling, refresh automatico ou troca de aba esta refazendo o estado inicial com todos os pontos pendentes.
8. Conferir se apos registrar movimentacao o frontend envia `roteiroId` no payload da movimentacao. O backend foi reforcado, mas o correto e sempre enviar `roteiroId`.

Criterios de aceite:

- Uma loja feita na segunda continua verde na terca, quarta, quinta etc. ate finalizar ou resetar no domingo as 21h.
- Recarregar a pagina, fechar e abrir o app, ou trocar de rota nao deve apagar os verdes da execucao em andamento.
- O botao fica "Continuar rota" durante toda a execucao semanal.
- A rota nao deve ser finalizada automaticamente pelo frontend em mudanca de dia.
- Depois do reset semanal, a execucao nova pode comecar limpa.
