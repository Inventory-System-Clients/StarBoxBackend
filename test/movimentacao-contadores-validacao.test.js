import test from "node:test";
import assert from "node:assert/strict";

import { registrarMovimentacao } from "../src/controllers/movimentacaoController.js";
import { Movimentacao } from "../src/models/index.js";

const createMockRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("criação rejeita contador IN negativo antes de consultar ou persistir", async () => {
  const originalFindOne = Movimentacao.findOne;
  const originalCreate = Movimentacao.create;
  let persistiu = false;

  Movimentacao.findOne = async () => {
    assert.fail("não deveria consultar movimentação com contador inválido");
  };
  Movimentacao.create = async () => {
    persistiu = true;
  };

  try {
    const res = createMockRes();
    await registrarMovimentacao(
      {
        headers: {},
        body: {
          maquinaId: "maq-1",
          totalPre: 10,
          abastecidas: 0,
          contadorIn: -1,
          contadorOut: 10,
        },
        usuario: { id: "func-1", role: "FUNCIONARIO" },
      },
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /contador IN/);
    assert.equal(persistiu, false);
  } finally {
    Movimentacao.findOne = originalFindOne;
    Movimentacao.create = originalCreate;
  }
});

test("criação aceita contadores inteiros de FUNCIONARIO sem descartá-los", async () => {
  const originalFindOne = Movimentacao.findOne;
  const originalFindAll = Movimentacao.findAll;
  let whereUltimaMovimentacao;

  Movimentacao.findOne = async (options) => {
    whereUltimaMovimentacao = options.where;
    return {
      id: "mov-anterior",
      maquinaId: "maq-1",
      totalPos: 50,
      contadorIn: 100,
      contadorOut: 50,
    };
  };
  Movimentacao.findAll = async () => [];

  try {
    const res = createMockRes();
    await registrarMovimentacao(
      {
        headers: {},
        body: {
          maquinaId: "maq-1",
          totalPre: 50,
          abastecidas: 0,
          contadorIn: 99,
          contadorOut: 60,
        },
        usuario: { id: "func-1", role: "FUNCIONARIO" },
      },
      res,
    );

    assert.deepEqual(whereUltimaMovimentacao, { maquinaId: "maq-1" });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /contador IN \(99\)/);
  } finally {
    Movimentacao.findOne = originalFindOne;
    Movimentacao.findAll = originalFindAll;
  }
});

test("modelo aceita zero e rejeita contadores negativos", async () => {
  const valida = Movimentacao.build({
    maquinaId: "00000000-0000-4000-8000-000000000001",
    usuarioId: "00000000-0000-4000-8000-000000000002",
    totalPre: 0,
    sairam: 0,
    abastecidas: 0,
    totalPos: 0,
    fichas: 0,
    contadorIn: 0,
    contadorOut: 0,
  });

  await assert.doesNotReject(valida.validate());

  const invalida = Movimentacao.build({
    maquinaId: "00000000-0000-4000-8000-000000000001",
    usuarioId: "00000000-0000-4000-8000-000000000002",
    totalPre: 0,
    sairam: 0,
    abastecidas: 0,
    totalPos: 0,
    fichas: 0,
    contadorIn: -1,
    contadorOut: -2,
  });

  await assert.rejects(invalida.validate(), /Validation min on contador/);
});
