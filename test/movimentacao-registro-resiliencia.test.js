import test from "node:test";
import assert from "node:assert/strict";

import {
  registrarMovimentacao,
  isErroCriticoMovimentacao,
} from "../src/controllers/movimentacaoController.js";
import {
  Movimentacao,
  Maquina,
} from "../src/models/index.js";
import MovimentacaoStatusDiario from "../src/models/MovimentacaoStatusDiario.js";

const createMockRes = () => ({
  statusCode: 200,
  body: undefined,
  locals: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("unit: classifica erro critico vs nao critico", () => {
  assert.equal(isErroCriticoMovimentacao({ name: "SequelizeDatabaseError" }), true);
  assert.equal(isErroCriticoMovimentacao({ code: "MOVIMENTACAO_VALIDATION" }), true);
  assert.equal(isErroCriticoMovimentacao({ name: "Error", code: "WARN_ONLY" }), false);
});

test("unit: primeira movimentacao sem contadores retorna 422 e nao persiste", async () => {
  const originalFindOne = Movimentacao.findOne;
  const originalCreate = Movimentacao.create;

  let createCalled = false;
  Movimentacao.findOne = async () => null;
  Movimentacao.create = async () => {
    createCalled = true;
    return { id: "nao-deveria-criar" };
  };

  try {
    const req = {
      headers: {},
      body: {
        maquinaId: "maq-1",
        totalPre: 0,
        abastecidas: 0,
        fichas: 0,
      },
      usuario: { id: "user-1", role: "ADMIN" },
    };
    const res = createMockRes();

    await registrarMovimentacao(req, res);

    assert.equal(res.statusCode, 422);
    assert.equal(
      res.body?.code,
      "MOVIMENTACAO_VALIDATION_FIRST_COUNTERS_REQUIRED",
    );
    assert.equal(createCalled, false);
  } finally {
    Movimentacao.findOne = originalFindOne;
    Movimentacao.create = originalCreate;
  }
});

test("integracao controller: persistencia ok + falha secundaria nao derruba resposta", async () => {
  const originalFindOne = Movimentacao.findOne;
  const originalFindAll = Movimentacao.findAll;
  const originalCreate = Movimentacao.create;
  const originalTransaction = Movimentacao.sequelize.transaction;
  const originalMaquinaFindByPk = Maquina.findByPk;
  const originalStatusFindOne = MovimentacaoStatusDiario.findOne;
  const originalStatusUpsert = MovimentacaoStatusDiario.upsert;

  let createCount = 0;
  let committed = false;

  Movimentacao.findOne = async () => null;
  Movimentacao.findAll = async () => [];
  Maquina.findByPk = async () => ({
    id: "maq-2",
    lojaId: "loja-1",
    nome: "Machine",
    capacidadePadrao: 100,
    valorFicha: 5,
  });

  Movimentacao.create = async (payload) => {
    createCount += 1;
    return {
      ...payload,
      id: createCount === 1 ? "mov-ant" : "mov-principal",
      toJSON() {
        return this;
      },
    };
  };

  Movimentacao.sequelize.transaction = async () => ({
    async commit() {
      committed = true;
    },
    async rollback() {},
  });

  MovimentacaoStatusDiario.findOne = async () => null;
  MovimentacaoStatusDiario.upsert = async () => {
    throw new Error("falha secundaria");
  };

  try {
    const req = {
      headers: { "x-request-id": "req-ok-1" },
      body: {
        maquinaId: "maq-2",
        totalPre: 0,
        abastecidas: 0,
        fichas: 0,
        contadorInAnterior: 1000,
        contadorOutAnterior: 500,
        contadorIn: 1000,
        contadorOut: 500,
        produtos: [],
      },
      usuario: { id: "user-2", role: "ADMIN", nome: "Admin" },
    };
    const res = createMockRes();

    await registrarMovimentacao(req, res);

    assert.equal(committed, true);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body?.id, "mov-principal");
    assert.equal(res.body?.maquinaId, "maq-2");
    assert.equal(res.body?.contadores?.contadorIn, 1000);
    assert.equal(Array.isArray(res.body?.warnings), true);
    assert.equal(res.body.warnings.length > 0, true);
  } finally {
    Movimentacao.findOne = originalFindOne;
    Movimentacao.findAll = originalFindAll;
    Movimentacao.create = originalCreate;
    Movimentacao.sequelize.transaction = originalTransaction;
    Maquina.findByPk = originalMaquinaFindByPk;
    MovimentacaoStatusDiario.findOne = originalStatusFindOne;
    MovimentacaoStatusDiario.upsert = originalStatusUpsert;
  }
});

test("integracao controller: retry idempotente nao duplica primeira movimentacao", async () => {
  const originalFindOne = Movimentacao.findOne;
  const originalCreate = Movimentacao.create;

  let createCalled = false;
  let findOneCalls = 0;

  Movimentacao.findOne = async () => {
    findOneCalls += 1;
    if (findOneCalls === 1) return null; // ultima movimentacao
    return {
      id: "mov-existente",
      maquinaId: "maq-3",
      contadorIn: 1000,
      contadorOut: 500,
    };
  };

  Movimentacao.create = async () => {
    createCalled = true;
    return { id: "nao-deveria-criar" };
  };

  try {
    const req = {
      headers: {
        "x-request-id": "req-idempotente-1",
        "x-idempotency-key": "idem-123",
      },
      body: {
        maquinaId: "maq-3",
        totalPre: 0,
        abastecidas: 0,
        contadorInAnterior: 1000,
        contadorOutAnterior: 500,
        contadorIn: 1000,
        contadorOut: 500,
        origemCadastroMaquina: true,
      },
      usuario: { id: "user-3", role: "ADMIN" },
    };
    const res = createMockRes();

    await registrarMovimentacao(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.id, "mov-existente");
    assert.equal(res.body?.idempotent, true);
    assert.equal(createCalled, false);
  } finally {
    Movimentacao.findOne = originalFindOne;
    Movimentacao.create = originalCreate;
  }
});
