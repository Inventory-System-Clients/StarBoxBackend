Objetivo:
Atualizar o frontend para refletir o novo comportamento de execução de roteiro no backend:
- Máquina/loja concluída permanece concluída durante a semana.
- Só volta para pendente quando ocorrer o reset semanal do roteiro.

Mudança de regra no backend:
1. O status não é mais diário.
2. O backend não considera mais apenas "hoje" para marcar concluído.
3. Se uma máquina foi feita uma vez no roteiro, ela continua como concluída até o reset semanal.
4. O reset semanal agora limpa:
   - status de máquinas concluídas no roteiro
   - finalizações manuais de roteiro

Endpoints impactados:
1. GET /api/roteiro-status/:id/status-execucao
2. GET /api/roteiros/:id/executar
3. GET /api/roteiros/com-status
4. GET /api/status-diario?maquinaId=...&roteiroId=...

Importante para o frontend:
1. Não tratar mais status como "por data".
2. Remover lógica de reset visual diário local (se existir).
3. Considerar como fonte de verdade o status vindo das rotas acima.
4. Exibir loja/máquina como pendente apenas quando backend retornar pendente.

Comportamento esperado na UI:
1. Usuário marca máquina como feita.
2. Tela continua mostrando máquina/loja finalizada nos próximos dias da semana.
3. Após reset semanal do backend, status volta para pendente automaticamente.

Checklist de implementação frontend:
1. Revisar hooks/queries que dependem de data atual para status de roteiro.
2. Ajustar cache invalidation para manter estado sincronizado após registrar movimentação.
3. Garantir que filtros por "hoje" não sejam aplicados sobre status de conclusão.
4. Testar fluxos:
   - concluir uma máquina hoje
   - abrir tela amanhã e confirmar que continua concluída
   - após reset semanal confirmar volta para pendente

Critérios de aceitação:
1. Máquina concluída não volta para pendente no dia seguinte.
2. Loja finalizada mantém status até reset semanal.
3. Roteiro finalizado mantém status até reset semanal.
4. Frontend não depende de data para determinar conclusão.
