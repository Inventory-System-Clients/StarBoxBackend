import test from "node:test";
import assert from "node:assert/strict";

import {
  atualizarAjusteAtualMaquina,
} from "../src/controllers/adminAjusteMaquinaController.js";
import { Maquina, Movimentacao } from "../src/models/index.js";

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

test("admin ajuste atual: atualiza somente campos enviados na ultima referencia", async () => {
  const originalMaquinaFindByPk = Maquina.findByPk;
  const originalMovFindOne = Movimentacao.findOne;
  const originalMovUpdate = Movimentacao.update;
  const originalMovFindByPk = Movimentacao.findByPk;
  const originalTransaction = Movimentacao.sequelize.transaction;

  let committed = false;
  let updatePayload = null;
  let updateOptions = null;

  Maquina.findByPk = async () => ({
    id: "maq-1",
    codigo: "M01",
    nome: "Maquina 01",
    lojaId: "loja-1",
    capacidadePadrao: 100,
    loja: {
      id: "loja-1",
      nome: "Loja Centro",
      cidade: "Sao Paulo",
    },
  });

  Movimentacao.findOne = async () => ({
    id: "mov-1",
    totalPos: 50,
    contadorIn: 1000,
    contadorOut: 500,
    dataColeta: "2026-05-21T10:00:00.000Z",
    updatedAt: "2026-05-21T10:00:00.000Z",
  });

  Movimentacao.update = async (payload, options) => {
    updatePayload = payload;
    updateOptions = options;
    return [1];
  };

  Movimentacao.findByPk = async () => ({
    id: "mov-1",
    totalPos: 42,
    contadorIn: 1100,
    contadorOut: 550,
    dataColeta: "2026-05-21T10:00:00.000Z",
    updatedAt: "2026-05-21T10:05:00.000Z",
  });

  Movimentacao.sequelize.transaction = async () => ({
    async commit() {
      committed = true;
    },
    async rollback() {},
  });

  try {
    const req = {
      params: { maquinaId: "maq-1" },
      body: {
        lojaId: "loja-1",
        quantidadeAtual: 42,
        contadorIn: 1100,
        contadorOut: 550,
      },
      usuario: { id: "admin-1", role: "ADMIN" },
    };
    const res = createMockRes();

    await atualizarAjusteAtualMaquina(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(committed, true);
    assert.deepEqual(updatePayload, {
      totalPos: 42,
      contadorIn: 1100,
      contadorOut: 550,
    });
    assert.equal(updateOptions.hooks, false);
    assert.equal(updateOptions.where.id, "mov-1");
    assert.equal(res.body?.valoresAtuais?.quantidadeAtual, 42);
    assert.equal(res.body?.valoresAnteriores?.quantidadeAtual, 50);
  } finally {
    Maquina.findByPk = originalMaquinaFindByPk;
    Movimentacao.findOne = originalMovFindOne;
    Movimentacao.update = originalMovUpdate;
    Movimentacao.findByPk = originalMovFindByPk;
    Movimentacao.sequelize.transaction = originalTransaction;
  }
});

test("admin ajuste atual: exige ao menos um campo editavel", async () => {
  const originalTransaction = Movimentacao.sequelize.transaction;
  let transactionCalled = false;

  Movimentacao.sequelize.transaction = async () => {
    transactionCalled = true;
    return {
      async commit() {},
      async rollback() {},
    };
  };

  try {
    const req = {
      params: { maquinaId: "maq-1" },
      body: { lojaId: "loja-1" },
      usuario: { id: "admin-1", role: "ADMIN" },
    };
    const res = createMockRes();

    await atualizarAjusteAtualMaquina(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(transactionCalled, false);
  } finally {
    Movimentacao.sequelize.transaction = originalTransaction;
  }
});
