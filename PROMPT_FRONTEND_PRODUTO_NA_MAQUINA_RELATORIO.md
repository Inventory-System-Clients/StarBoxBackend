Objetivo:
Atualizar o frontend para usar o novo campo de backend `produtoNaMaquinaId` e renderizar corretamente o detalhamento de produtos saídos no relatório de impressão.

Contexto de backend:
1. Movimentações agora podem salvar `produtoNaMaquinaId`.
2. O endpoint `/api/relatorios/impressao` continua retornando:
   - `totais.produtosSairam`
   - `totais.custoProdutosSairam`
   - `produtosSairam[]`
   - `maquinas[].totais.produtosSairam`
   - `maquinas[].totais.custoProdutosSairam`
   - `maquinas[].produtosSairam[]`
3. O backend prioriza itens reais; placeholder `__SEM_DETALHE__` deve aparecer apenas em legado excepcional.

Tarefas obrigatorias no frontend:
1. Exibir lista detalhada de produtos saídos no consolidado e por máquina quando `totais.produtosSairam > 0`.
2. Cada item deve mostrar:
   - nome
   - codigo
   - quantidade
   - valorUnitario
   - valorTotal
3. Validar consistência na camada de UI (sem bloquear render):
   - Soma das quantidades dos itens vs `totais.produtosSairam`
   - Soma de `valorTotal` dos itens vs `totais.custoProdutosSairam`
4. Formatar moeda em pt-BR (R$).
5. Tratar `__SEM_DETALHE__` como caso legado:
   - Exibir label: "Produto não detalhado (legado)"
   - Exibir aviso visual discreto informando ausência de detalhamento histórico.

Contrato de item `produtosSairam[]`:
- `produtoId`
- `nome`
- `codigo`
- `quantidade`
- `valorUnitario`
- `valorTotal`

Critérios de aceitação:
1. Com saídas no período, o usuário vê produtos reais no consolidado e por máquina.
2. Custo total exibido bate com `totais.custoProdutosSairam`.
3. Quantidade total exibida bate com `totais.produtosSairam`.
4. Placeholder legado não quebra a tela.

Implementação sugerida:
1. Criar utilitário para somar quantidade/custo de `produtosSairam`.
2. Reusar o mesmo componente de tabela para consolidado e por máquina.
3. Mostrar badge de divergência se totais não baterem (apenas aviso).
