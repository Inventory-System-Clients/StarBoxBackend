# Desconto Automático de Estoque

## Funcionalidade

Quando uma máquina é abastecida com produtos, o sistema **automaticamente desconta** a quantidade abastecida do estoque da loja à qual a máquina pertence.

## Como Funciona

### Fluxo Automático

1. **Registro de Movimentação**: Ao registrar uma movimentação com produtos abastecidos
2. **Identificação da Loja**: O sistema identifica a loja da máquina através do relacionamento `Maquina -> Loja`
3. **Desconto do Estoque**: Para cada produto abastecido, o sistema:
   - Busca o estoque daquele produto na loja
   - Desconta a quantidade abastecida
   - Garante que a quantidade nunca fique negativa (mínimo = 0)

### Exemplo Prático

**Cenário:**

- Loja: "Shopping Center"
- Máquina: M01 (pertence à loja "Shopping Center")
- Produto: Pelúcia Urso (estoque atual na loja: 50 unidades)
- Abastecimento: 10 pelúcias na máquina M01

**Resultado:**

- Estoque da Pelúcia Urso na loja "Shopping Center" será atualizado de 50 para 40 unidades
- A movimentação registrará que 10 unidades foram abastecidas na máquina

## Endpoint Afetado

### POST `/api/movimentacoes`

**Request Body:**

```json
{
  "maquinaId": "uuid-da-maquina",
  "dataColeta": "2025-12-29",
  "totalPre": 100,
  "sairam": 25,
  "abastecidas": 30,
  "fichas": 150,
  "produtos": [
    {
      "produtoId": "uuid-do-produto",
      "quantidadeSaiu": 25,
      "quantidadeAbastecida": 30
    }
  ]
}
```

**Comportamento:**

- O sistema registra a movimentação
- Para cada produto no array `produtos`, se `quantidadeAbastecida > 0`:
  - Busca o estoque do produto na loja da máquina
  - Desconta a quantidade abastecida
  - Atualiza o registro de estoque

## Implementação Técnica

### Arquivo Modificado

- `src/controllers/movimentacaoController.js`

### Lógica Implementada

```javascript
// Após criar os detalhes dos produtos na movimentação
for (const produto of produtos) {
  if (produto.quantidadeAbastecida && produto.quantidadeAbastecida > 0) {
    // Buscar estoque do produto na loja da máquina
    const estoqueLoja = await EstoqueLoja.findOne({
      where: {
        lojaId: maquina.lojaId,
        produtoId: produto.produtoId,
      },
    });

    if (estoqueLoja) {
      // Descontar a quantidade abastecida (não permite negativo)
      const novaQuantidade = Math.max(
        0,
        estoqueLoja.quantidade - produto.quantidadeAbastecida
      );
      await estoqueLoja.update({ quantidade: novaQuantidade });
    }
  }
}
```

## Considerações Importantes

### Segurança

- O desconto só ocorre se `quantidadeAbastecida > 0`
- A quantidade nunca fica negativa (usa `Math.max(0, ...)`)
- Se o estoque não existir para o produto, não há erro - simplesmente não desconta

### Controle de Estoque

- **Importante**: Certifique-se de que o estoque da loja esteja cadastrado antes de abastecer máquinas
- Se o estoque não estiver cadastrado, o desconto não ocorrerá
- Monitore o estoque regularmente para evitar abastecimentos sem estoque disponível

### Alertas

- Configure `estoqueMinimo` nos produtos para receber alertas quando o estoque estiver baixo
- Isso ajuda a evitar situações onde não há estoque suficiente para abastecer as máquinas

## Verificação

Para verificar se o desconto está funcionando:

1. **Antes do Abastecimento:**

   - Verifique o estoque atual: `GET /api/estoque-lojas/:lojaId`
   - Anote a quantidade do produto

2. **Durante o Abastecimento:**

   - Registre a movimentação: `POST /api/movimentacoes`
   - Informe a `quantidadeAbastecida` no array de produtos

3. **Após o Abastecimento:**
   - Verifique novamente o estoque: `GET /api/estoque-lojas/:lojaId`
   - Confirme que a quantidade foi descontada corretamente

## Logs e Auditoria

Todas as movimentações ficam registradas na tabela `movimentacoes` e `movimentacao_produtos`, permitindo:

- Rastreabilidade completa de quando e quanto foi abastecido
- Histórico de todas as alterações de estoque
- Auditoria de quem fez cada abastecimento (através do `usuarioId`)

## Rollback

Se for necessário reverter um abastecimento:

1. O administrador pode deletar a movimentação (apenas ADMIN)
2. **Atenção**: O sistema NÃO reverte automaticamente o estoque
3. Será necessário ajustar manualmente o estoque da loja se desejar reverter o desconto

## Recomendações

1. **Configure o Estoque Inicial**: Antes de começar a usar o sistema, cadastre o estoque de todos os produtos em todas as lojas

2. **Monitore Regularmente**: Use o dashboard de estoque para acompanhar os níveis de estoque

3. **Estabeleça Alertas**: Configure estoques mínimos para receber alertas antes que acabem os produtos

4. **Treine a Equipe**: Certifique-se de que todos os operadores entendam que o estoque será descontado automaticamente

5. **Faça Inventários Periódicos**: Compare o estoque físico com o estoque do sistema regularmente para garantir precisão
