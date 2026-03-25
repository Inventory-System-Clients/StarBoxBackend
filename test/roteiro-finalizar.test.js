import test from "node:test";
import assert from "node:assert/strict";

import { finalizarRoteiro } from "../src/controllers/roteiroController.js";
import {
  Roteiro,
  RoteiroFinalizacaoDiaria,
} from "../src/models/index.js";
import MovimentacaoStatusDiario from "../src/models/MovimentacaoStatusDiario.js";

const createMockRes = () => {
  const res = {
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
  };
  return res;
};

const buildRoteiro = ({ funcionarioId = "func-1" } = {}) => ({
  id: "roteiro-1",
  nome: "Roteiro Centro",
  funcionarioId,
  lojas: [],
});

test("ADMIN finaliza roteiro com sucesso", async () => {
  const originalFindByPk = Roteiro.findByPk;
  const originalFindAll = MovimentacaoStatusDiario.findAll;
  const originalUpsert = RoteiroFinalizacaoDiaria.upsert;

  let upsertPayload = null;

  Roteiro.findByPk = async () => buildRoteiro({ funcionarioId: "func-alvo" });
  MovimentacaoStatusDiario.findAll = async () => [];
  RoteiroFinalizacaoDiaria.upsert = async (payload) => {
    upsertPayload = payload;
    return [payload, true];
  };

  try {
    const req = {
      params: { id: "roteiro-1" },
      usuario: { id: "admin-1", role: "ADMIN" },
      headers: {},
    };
    const res = createMockRes();

    await finalizarRoteiro(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(res.body?.status, "finalizado");
    assert.equal(upsertPayload?.roteiroId, "roteiro-1");
    assert.equal(upsertPayload?.finalizadoPorId, "admin-1");
    assert.equal(upsertPayload?.finalizado, true);
  } finally {
    Roteiro.findByPk = originalFindByPk;
    MovimentacaoStatusDiario.findAll = originalFindAll;
    RoteiroFinalizacaoDiaria.upsert = originalUpsert;
  }
});

test("GERENCIADOR finaliza roteiro com sucesso", async () => {
  const originalFindByPk = Roteiro.findByPk;
  const originalFindAll = MovimentacaoStatusDiario.findAll;
  const originalUpsert = RoteiroFinalizacaoDiaria.upsert;

  Roteiro.findByPk = async () => buildRoteiro({ funcionarioId: "func-alvo" });
  MovimentacaoStatusDiario.findAll = async () => [];
  RoteiroFinalizacaoDiaria.upsert = async () => [null, true];

  try {
    const req = {
      params: { id: "roteiro-1" },
      usuario: { id: "ger-1", role: "GERENCIADOR" },
      headers: {},
    };
    const res = createMockRes();

    await finalizarRoteiro(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
  } finally {
    Roteiro.findByPk = originalFindByPk;
    MovimentacaoStatusDiario.findAll = originalFindAll;
    RoteiroFinalizacaoDiaria.upsert = originalUpsert;
  }
});

test("FUNCIONARIO atribuido finaliza roteiro com sucesso", async () => {
  const originalFindByPk = Roteiro.findByPk;
  const originalFindAll = MovimentacaoStatusDiario.findAll;
  const originalUpsert = RoteiroFinalizacaoDiaria.upsert;

  Roteiro.findByPk = async () => buildRoteiro({ funcionarioId: "func-1" });
  MovimentacaoStatusDiario.findAll = async () => [];
  RoteiroFinalizacaoDiaria.upsert = async () => [null, true];

  try {
    const req = {
      params: { id: "roteiro-1" },
      usuario: { id: "func-1", role: "FUNCIONARIO" },
      headers: {},
    };
    const res = createMockRes();

    await finalizarRoteiro(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
  } finally {
    Roteiro.findByPk = originalFindByPk;
    MovimentacaoStatusDiario.findAll = originalFindAll;
    RoteiroFinalizacaoDiaria.upsert = originalUpsert;
  }
});

test("FUNCIONARIO nao atribuido recebe 403 com motivo explicito e log estruturado", async () => {
  const originalFindByPk = Roteiro.findByPk;
  const originalWarn = console.warn;

  let logPayload = null;

  Roteiro.findByPk = async () => buildRoteiro({ funcionarioId: "func-do-roteiro" });
  console.warn = (payload) => {
    logPayload = payload;
  };

  try {
    const req = {
      params: { id: "roteiro-1" },
      usuario: { id: "outro-func", role: "FUNCIONARIO" },
      headers: { "x-request-id": "req-403" },
    };
    const res = createMockRes();

    await finalizarRoteiro(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body?.error?.code, "not_assigned_to_roteiro");
    assert.equal(logPayload?.evento, "roteiro_finalizacao_forbidden");
    assert.equal(logPayload?.requestId, "req-403");
    assert.equal(logPayload?.userId, "outro-func");
    assert.equal(logPayload?.role, "FUNCIONARIO");
    assert.equal(logPayload?.roteiroId, "roteiro-1");
    assert.equal(logPayload?.roteiroFuncionarioId, "func-do-roteiro");
    assert.equal(logPayload?.motivo, "not_assigned_to_roteiro");
  } finally {
    Roteiro.findByPk = originalFindByPk;
    console.warn = originalWarn;
  }
});
