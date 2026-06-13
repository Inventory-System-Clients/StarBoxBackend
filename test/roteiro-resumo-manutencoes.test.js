import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularConsumoProdutosRota,
  fecharResumoExecucao,
} from "../src/services/roteiroResumoExecucaoService.js";
import {
  GastoRoteiro,
  Manutencao,
  Movimentacao,
  Roteiro,
  RoteiroExecucaoSemanal,
  RoteiroResumoExecucao,
} from "../src/models/index.js";

test("resumo de rota considera manutencao feita apenas dentro da execucao e no escopo da rota", async () => {
  const originalResumoFindOne = RoteiroResumoExecucao.findOne;
  const originalResumoCreate = RoteiroResumoExecucao.create;
  const originalRoteiroFindByPk = Roteiro.findByPk;
  const originalGastoSum = GastoRoteiro.sum;
  const originalExecucaoFindOne = RoteiroExecucaoSemanal.findOne;
  const originalManutencaoFindAll = Manutencao.findAll;

  let payloadCriado = null;

  RoteiroResumoExecucao.findOne = async () => null;
  RoteiroResumoExecucao.create = async (payload) => {
    payloadCriado = payload;
    return payload;
  };
  Roteiro.findByPk = async () => ({
    id: "roteiro-1",
    orcamentoDiario: 2000,
  });
  GastoRoteiro.sum = async () => 0;
  RoteiroExecucaoSemanal.findOne = async () => ({
    id: "execucao-1",
    dataInicio: "2026-06-10",
    iniciadoEm: new Date("2026-06-10T12:00:00.000Z"),
    finalizadoEm: new Date("2026-06-10T18:00:00.000Z"),
  });
  Manutencao.findAll = async () => [
    {
      id: "manutencao-dentro",
      descricao: "Troca de garra",
      status: "feito",
      lojaId: "loja-1",
      maquinaId: "maquina-1",
      concluidoEm: new Date("2026-06-10T15:00:00.000Z"),
      loja: { id: "loja-1", nome: "Loja Centro" },
    },
    {
      id: "manutencao-antes",
      descricao: "Antes da rota",
      status: "feito",
      lojaId: "loja-1",
      maquinaId: "maquina-1",
      concluidoEm: new Date("2026-06-10T10:00:00.000Z"),
      loja: { id: "loja-1", nome: "Loja Centro" },
    },
    {
      id: "manutencao-depois",
      descricao: "Depois da rota",
      status: "feito",
      lojaId: "loja-1",
      maquinaId: "maquina-1",
      concluidoEm: new Date("2026-06-10T19:00:00.000Z"),
      loja: { id: "loja-1", nome: "Loja Centro" },
    },
    {
      id: "manutencao-outra-maquina",
      descricao: "Outra maquina",
      status: "feito",
      lojaId: "loja-1",
      maquinaId: "maquina-fora",
      concluidoEm: new Date("2026-06-10T15:00:00.000Z"),
      loja: { id: "loja-1", nome: "Loja Centro" },
    },
    {
      id: "manutencao-pendente",
      descricao: "Pendente",
      status: "pendente",
      lojaId: "loja-1",
      maquinaId: "maquina-1",
      concluidoEm: null,
      loja: { id: "loja-1", nome: "Loja Centro" },
    },
  ];

  try {
    await fecharResumoExecucao({
      roteiroId: "roteiro-1",
      data: "2026-06-10",
      fechadoPorId: "user-1",
      roteiroNome: "Rota Centro",
      lojas: [
        {
          id: "loja-1",
          nome: "Loja Centro",
          status: "finalizado",
          maquinas: [
            {
              id: "maquina-1",
              nome: "Maquina 1",
              status: "finalizado",
            },
          ],
        },
      ],
      estoqueInicialTotal: 10,
      estoqueFinalTotal: 5,
      consumoTotalProdutos: 5,
    });

    assert.equal(payloadCriado.totalManutencoesRealizadas, 1);
    assert.deepEqual(payloadCriado.lojasComManutencaoRealizada, ["Loja Centro"]);
    assert.deepEqual(payloadCriado.manutencoesRealizadas, [
      "Troca de garra (Loja Centro)",
    ]);
    assert.deepEqual(payloadCriado.manutencoesNaoRealizadas, [
      "Pendente (Loja Centro)",
    ]);
  } finally {
    RoteiroResumoExecucao.findOne = originalResumoFindOne;
    RoteiroResumoExecucao.create = originalResumoCreate;
    Roteiro.findByPk = originalRoteiroFindByPk;
    GastoRoteiro.sum = originalGastoSum;
    RoteiroExecucaoSemanal.findOne = originalExecucaoFindOne;
    Manutencao.findAll = originalManutencaoFindAll;
  }
});

test("consumo de produtos da rota soma abastecimentos do usuario no periodo e nas maquinas da rota", async () => {
  const originalExecucaoFindOne = RoteiroExecucaoSemanal.findOne;
  const originalMovimentacaoFindAll = Movimentacao.findAll;

  let whereRecebido = null;

  RoteiroExecucaoSemanal.findOne = async () => ({
    id: "execucao-1",
    dataInicio: "2026-06-10",
    iniciadoEm: new Date("2026-06-10T12:00:00.000Z"),
    finalizadoEm: new Date("2026-06-10T18:00:00.000Z"),
  });
  Movimentacao.findAll = async ({ where }) => {
    whereRecebido = where;
    return [
      {
        id: "mov-1",
        detalhesProdutos: [
          { quantidadeAbastecida: 4 },
          { quantidadeAbastecida: 6 },
        ],
      },
      {
        id: "mov-2",
        detalhesProdutos: [{ quantidadeAbastecida: 3 }],
      },
    ];
  };

  try {
    const total = await calcularConsumoProdutosRota({
      roteiroId: "roteiro-1",
      data: "2026-06-10",
      usuarioId: "func-1",
      lojas: [
        {
          id: "loja-1",
          maquinas: [
            { id: "maquina-1" },
            { id: "maquina-2" },
          ],
        },
      ],
      fimExecucao: new Date("2026-06-10T18:00:00.000Z"),
    });

    assert.equal(total, 13);
    assert.equal(whereRecebido.usuarioId, "func-1");
    const maquinaIdSymbols = Object.getOwnPropertySymbols(whereRecebido.maquinaId);
    assert.equal(maquinaIdSymbols.length, 1);
    assert.deepEqual(whereRecebido.maquinaId[maquinaIdSymbols[0]], [
      "maquina-1",
      "maquina-2",
    ]);
  } finally {
    RoteiroExecucaoSemanal.findOne = originalExecucaoFindOne;
    Movimentacao.findAll = originalMovimentacaoFindAll;
  }
});
