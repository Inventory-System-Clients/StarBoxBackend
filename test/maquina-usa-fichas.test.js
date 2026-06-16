import test from "node:test";
import assert from "node:assert/strict";

import {
  criarMaquina,
  atualizarMaquina,
  listarMaquinas,
} from "../src/controllers/maquinaController.js";
import {
  serializarMaquinaRoteiroExecucao,
} from "../src/controllers/roteiroExecucaoController.js";
import { GastoFixoLoja, Loja, Maquina } from "../src/models/index.js";

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

test("cria maquina com usaFichas=true", async () => {
  const originalLojaFindByPk = Loja.findByPk;
  const originalGastoFindAll = GastoFixoLoja.findAll;
  const originalMaquinaFindOne = Maquina.findOne;
  const originalMaquinaCreate = Maquina.create;
  const originalTransaction = Maquina.sequelize.transaction;

  let createPayload = null;

  Loja.findByPk = async () => ({ id: "loja-1" });
  GastoFixoLoja.findAll = async () => [];
  Maquina.findOne = async () => null;
  Maquina.sequelize.transaction = async () => ({
    async commit() {},
    async rollback() {},
  });
  Maquina.create = async (payload) => {
    createPayload = payload;
    return {
      id: "maq-1",
      ...payload,
      toJSON() {
        return { id: this.id, ...payload };
      },
    };
  };

  try {
    const req = {
      body: {
        codigo: "549",
        lojaId: "loja-1",
        valorFicha: 2.5,
        usaFichas: true,
        comissaoLojaPercentual: 0,
      },
      usuario: { id: "admin-1" },
    };
    const res = createMockRes();

    await criarMaquina(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createPayload.usaFichas, true);
    assert.equal(res.body.usaFichas, true);
  } finally {
    Loja.findByPk = originalLojaFindByPk;
    GastoFixoLoja.findAll = originalGastoFindAll;
    Maquina.findOne = originalMaquinaFindOne;
    Maquina.create = originalMaquinaCreate;
    Maquina.sequelize.transaction = originalTransaction;
  }
});

test("cria maquina defaultando usaFichas=false quando ausente", async () => {
  const originalLojaFindByPk = Loja.findByPk;
  const originalGastoFindAll = GastoFixoLoja.findAll;
  const originalMaquinaFindOne = Maquina.findOne;
  const originalMaquinaCreate = Maquina.create;
  const originalTransaction = Maquina.sequelize.transaction;

  let createPayload = null;

  Loja.findByPk = async () => ({ id: "loja-1" });
  GastoFixoLoja.findAll = async () => [];
  Maquina.findOne = async () => null;
  Maquina.sequelize.transaction = async () => ({
    async commit() {},
    async rollback() {},
  });
  Maquina.create = async (payload) => {
    createPayload = payload;
    return {
      id: "maq-1",
      ...payload,
      toJSON() {
        return { id: this.id, ...payload };
      },
    };
  };

  try {
    const req = {
      body: {
        codigo: "550",
        lojaId: "loja-1",
        valorFicha: 2.5,
        comissaoLojaPercentual: 0,
      },
      usuario: { id: "admin-1" },
    };
    const res = createMockRes();

    await criarMaquina(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createPayload.usaFichas, false);
    assert.equal(res.body.usaFichas, false);
  } finally {
    Loja.findByPk = originalLojaFindByPk;
    GastoFixoLoja.findAll = originalGastoFindAll;
    Maquina.findOne = originalMaquinaFindOne;
    Maquina.create = originalMaquinaCreate;
    Maquina.sequelize.transaction = originalTransaction;
  }
});

test("edita maquina mudando usaFichas", async () => {
  const originalLojaFindByPk = Loja.findByPk;
  const originalGastoFindAll = GastoFixoLoja.findAll;
  const originalMaquinaFindByPk = Maquina.findByPk;
  const originalMaquinaFindOne = Maquina.findOne;

  let updatePayload = null;

  Loja.findByPk = async () => ({ id: "loja-1" });
  GastoFixoLoja.findAll = async () => [];
  Maquina.findOne = async () => null;
  Maquina.findByPk = async () => ({
    id: "maq-1",
    codigo: "549",
    nome: "549",
    tipo: null,
    lojaId: "loja-1",
    capacidadePadrao: 100,
    valorFicha: 2.5,
    usaFichas: true,
    comissaoLojaPercentual: 0,
    fichasNecessarias: null,
    forcaForte: null,
    forcaFraca: null,
    forcaPremium: null,
    jogadasPremium: null,
    percentualAlertaEstoque: 30,
    localizacao: null,
    ativo: true,
    async update(payload) {
      updatePayload = payload;
      Object.assign(this, payload);
      return this;
    },
  });

  try {
    const req = {
      params: { id: "maq-1" },
      body: { usaFichas: false, comissaoLojaPercentual: 0 },
    };
    const res = createMockRes();

    await atualizarMaquina(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(updatePayload.usaFichas, false);
    assert.equal(res.body.usaFichas, false);
  } finally {
    Loja.findByPk = originalLojaFindByPk;
    GastoFixoLoja.findAll = originalGastoFindAll;
    Maquina.findByPk = originalMaquinaFindByPk;
    Maquina.findOne = originalMaquinaFindOne;
  }
});

test("lista maquinas mantendo usaFichas na resposta", async () => {
  const originalMaquinaFindAll = Maquina.findAll;

  Maquina.findAll = async () => [
    {
      id: "maq-1",
      codigo: "549",
      valorFicha: 2.5,
      usaFichas: true,
    },
  ];

  try {
    const req = { query: {} };
    const res = createMockRes();

    await listarMaquinas(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body[0].usaFichas, true);
  } finally {
    Maquina.findAll = originalMaquinaFindAll;
  }
});

test("serializa maquina do roteiro/executar com usaFichas", () => {
  const maquina = serializarMaquinaRoteiroExecucao(
    {
      id: "maq-1",
      nome: "Maquina 549",
      codigo: "549",
      valorFicha: "2.50",
      usaFichas: true,
    },
    true,
  );

  assert.deepEqual(maquina, {
    id: "maq-1",
    nome: "Maquina 549",
    codigo: "549",
    valorFicha: "2.50",
    usaFichas: true,
    status: "finalizado",
  });
});
