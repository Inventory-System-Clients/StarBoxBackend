Objetivo:
Validar no frontend o comportamento semanal das rotas (roteiros) após ajuste no backend.

Regras principais:
1) Roteiro inicia uma vez na semana (botao "comecar rota").
2) Enquanto estiver em andamento, pontos/maquinas concluidos permanecem concluidos nos dias seguintes.
3) O botao deve virar "continuar rota" enquanto nao houver finalizacao.
4) Finalizacao manual ocorre no sabado ou domingo.
5) Reset semanal (domingo) volta tudo para pendente e encerra o andamento.

Fontes de verdade no backend:
- GET /api/roteiro-status/:id/status-execucao
- GET /api/roteiros/:id/executar
- GET /api/roteiros/com-status
- GET /api/status-diario?maquinaId=...&roteiroId=...

O que checar no frontend:
1) Nao usar data atual para decidir se a loja/maquina esta concluida.
2) Remover cache/reset visual diario (se existir).
3) Manter o status exibido conforme o backend retorna.
4) Quando o usuario iniciar o roteiro, a tela deve manter o estado nos dias seguintes.
5) Ao finalizar, mostrar roteiro finalizado ate o reset semanal.

Cenarios de teste:
1) Segunda: iniciar roteiro, concluir algumas maquinas e confirmar que ficam concluidas.
2) Terça: abrir a mesma tela e confirmar status mantido.
3) Sabado/Domingo: finalizar roteiro e verificar status finalizado.
4) Segunda seguinte: confirmar reset semanal e tudo pendente.

Criterios de aceitacao:
1) Status nao reseta no dia seguinte enquanto o roteiro estiver em andamento.
2) Botao alterna corretamente entre "comecar rota" e "continuar rota".
3) Finalizacao so some apos reset semanal.
4) Nenhum filtro por "hoje" aplicado ao status de conclusao.
