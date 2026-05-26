import test from "node:test";
import assert from "node:assert/strict";

import {
  obterStatusMaquinasConcluidasDaExecucao,
} from "../src/utils/roteiroStatusSemanal.js";
import {
  GastoRoteiro,
  Manutencao,
  Movimentacao,
  Roteiro,
  RoteiroResumoExecucao,
} from "../src/models/index.js";
import MovimentacaoStatusDiario from "../src/models/MovimentacaoStatusDiario.js";
import { salvarSnapshotResumoExecucao } from "../src/services/roteiroResumoExecucaoService.js";

test("deduplica status e movimentacoes consideradas por maquina sem perder conclusao", async () => {
  const originalStatusFindAll = MovimentacaoStatusDiario.findAll;
  const originalMovimentacaoFindAll = Movimentacao.findAll;

  MovimentacaoStatusDiario.findAll = async () => [
    {
      maquina_id: "maq-1",
      roteiro_id: "rot-1",
      data: "2026-05-26",
      concluida: true,
    },
    {
      maquina_id: "maq-1",
      roteiro_id: "rot-1",
      data: "2026-05-26",
      concluida: true,
    },
  ];
  Movimentacao.findAll = async () => [
    {
      maquinaId: "maq-1",
      roteiroId: "rot-1",
      dataColeta: new Date("2026-05-26T10:00:00-03:00"),
    },
    {
      maquinaId: "maq-1",
      roteiroId: "rot-1",
      dataColeta: new Date("2026-05-26T11:00:00-03:00"),
    },
    {
      maquinaId: "maq-2",
      roteiroId: "rot-1",
      dataColeta: new Date("2026-05-26T12:00:00-03:00"),
    },
  ];

  try {
    const resultado = await obterStatusMaquinasConcluidasDaExecucao({
      roteiroId: "rot-1",
      dataInicio: "2026-05-26",
      maquinaIds: ["maq-1", "maq-2"],
    });

    assert.equal(resultado.statusMaquinas.length, 1);
    assert.equal(resultado.movimentacoesConsideradas.length, 2);
    assert.equal(resultado.maquinasConcluidas.has("maq-1"), true);
    assert.equal(resultado.maquinasConcluidas.has("maq-2"), true);
  } finally {
    MovimentacaoStatusDiario.findAll = originalStatusFindAll;
    Movimentacao.findAll = originalMovimentacaoFindAll;
  }
});

test("snapshot do resumo conta maquina duplicada uma unica vez pelo codigo", async () => {
  const originalResumoFindOne = RoteiroResumoExecucao.findOne;
  const originalResumoCreate = RoteiroResumoExecucao.create;
  const originalRoteiroFindByPk = Roteiro.findByPk;
  const originalGastoSum = GastoRoteiro.sum;
  const originalManutencaoFindAll = Manutencao.findAll;

  let payloadCriado = null;

  RoteiroResumoExecucao.findOne = async () => null;
  RoteiroResumoExecucao.create = async (payload) => {
    payloadCriado = payload;
    return payload;
  };
  Roteiro.findByPk = async () => ({ id: "rot-1", orcamentoDiario: 2000 });
  GastoRoteiro.sum = async () => 0;
  Manutencao.findAll = async () => [];

  try {
    await salvarSnapshotResumoExecucao({
      roteiroId: "rot-1",
      data: "2026-05-26",
      roteiroNome: "Rota Teste",
      lojas: [
        {
          nome: "Loja A",
          status: "finalizado",
          maquinas: [
            {
              id: "maq-1",
              codigo: "M001",
              nome: "Maquina 001",
              status: "finalizado",
            },
          ],
        },
        {
          nome: "Loja A",
          status: "finalizado",
          maquinas: [
            {
              id: "maq-duplicada",
              codigo: "M001",
              nome: "Maquina 001",
              status: "finalizado",
            },
          ],
        },
      ],
      estoqueInicialTotal: 10,
      estoqueFinalTotal: 8,
      consumoTotalProdutos: 2,
    });

    assert.deepEqual(payloadCriado.maquinasFeitas, ["Maquina 001"]);
    assert.deepEqual(payloadCriado.maquinasNaoFeitas, []);
  } finally {
    RoteiroResumoExecucao.findOne = originalResumoFindOne;
    RoteiroResumoExecucao.create = originalResumoCreate;
    Roteiro.findByPk = originalRoteiroFindByPk;
    GastoRoteiro.sum = originalGastoSum;
    Manutencao.findAll = originalManutencaoFindAll;
  }
});
