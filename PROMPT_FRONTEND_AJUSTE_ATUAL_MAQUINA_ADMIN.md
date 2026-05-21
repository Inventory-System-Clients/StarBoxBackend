Implemente uma nova aba no dashboard administrativo chamada "Ajuste da Maquina" ou "Quantidade Atual".

Objetivo da tela:
- Permitir que usuarios ADMIN ajustem diretamente os valores atuais exibidos para uma maquina.
- O usuario deve escolher primeiro a loja, depois a maquina daquela loja, e depois escolher quais campos quer editar.
- A interface nunca deve mencionar movimentacao, ultima movimentacao, rota, roteiro ou historico. Para o usuario, a tela deve parecer uma edicao direta dos valores atuais da maquina.

Fluxo da tela:
1. Carregar lojas usando a rota ja existente de lojas.
2. Ao selecionar uma loja, carregar maquinas usando a rota ja existente `GET /api/maquinas?lojaId={lojaId}`.
3. Ao selecionar uma maquina, buscar os valores atuais em:
   `GET /api/admin/maquinas/{maquinaId}/ajuste-atual?lojaId={lojaId}`
4. Mostrar os campos atuais:
   - Quantidade atual na maquina (`valoresAtuais.quantidadeAtual`)
   - Contador IN atual (`valoresAtuais.contadorIn`)
   - Contador OUT atual (`valoresAtuais.contadorOut`)
   - Ultima atualizacao (`valoresAtuais.ultimaAtualizacao`), como texto discreto se ja existir padrao visual para datas.
5. Permitir selecionar o que editar:
   - Checkbox/toggle "Quantidade atual"
   - Checkbox/toggle "Contador IN"
   - Checkbox/toggle "Contador OUT"
6. Habilitar input numerico apenas para os campos selecionados.
7. Ao salvar, enviar somente os campos selecionados:
   `PATCH /api/admin/maquinas/{maquinaId}/ajuste-atual`

Body exemplo para alterar apenas quantidade:
```json
{
  "lojaId": "uuid-da-loja",
  "quantidadeAtual": 42
}
```

Body exemplo para alterar contadores:
```json
{
  "lojaId": "uuid-da-loja",
  "contadorIn": 12345,
  "contadorOut": 6789
}
```

Body exemplo para alterar tudo:
```json
{
  "lojaId": "uuid-da-loja",
  "quantidadeAtual": 42,
  "contadorIn": 12345,
  "contadorOut": 6789
}
```

Resposta esperada:
```json
{
  "maquina": {
    "id": "uuid",
    "codigo": "M01",
    "nome": "Maquina 01",
    "lojaId": "uuid",
    "capacidadePadrao": 100
  },
  "loja": {
    "id": "uuid",
    "nome": "Loja Centro",
    "cidade": "Sao Paulo"
  },
  "valoresAtuais": {
    "quantidadeAtual": 42,
    "contadorIn": 12345,
    "contadorOut": 6789,
    "ultimaAtualizacao": "2026-05-21T12:00:00.000Z",
    "atualizadoEm": "2026-05-21T12:05:00.000Z"
  },
  "valoresAnteriores": {
    "quantidadeAtual": 50,
    "contadorIn": 12000,
    "contadorOut": 6700
  },
  "camposEditaveis": ["quantidadeAtual", "contadorIn", "contadorOut"]
}
```

Validações no frontend:
- Exibir a aba somente para ADMIN.
- Todos os inputs devem aceitar apenas inteiros maiores ou iguais a zero.
- Bloquear o botao salvar se nenhuma loja ou maquina estiver selecionada.
- Bloquear o botao salvar se nenhum campo estiver marcado para edicao.
- Mostrar confirmacao antes de salvar, com resumo simples:
  "Confirmar ajuste dos valores atuais desta maquina?"
- Depois de salvar, recarregar os valores pelo retorno da API ou chamando novamente o GET.

Tratamento de erros:
- `404` com `code: "MAQUINA_SEM_VALORES_ATUAIS"`: mostrar "Esta maquina ainda nao possui valores atuais para editar."
- `400`: mostrar a mensagem `error` retornada pela API.
- `403`: mostrar "Seu usuario nao tem permissao para fazer este ajuste."

Observacoes importantes:
- Nao usar rotas de movimentacao para essa tela.
- Nao criar movimentacao nova.
- Nao redirecionar para roteiro/rota.
- Nao exibir termos tecnicos internos como "ultima movimentacao" ou "totalPos".
- Nomear o campo `quantidadeAtual` como "Quantidade atual na maquina".
