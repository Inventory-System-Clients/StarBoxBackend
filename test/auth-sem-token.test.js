import test from "node:test";
import assert from "node:assert/strict";

import { autenticar } from "../src/middlewares/auth.js";
import SecurityControl from "../src/models/SecurityControl.js";

test("Usuario sem token recebe 401", async () => {
  const originalFindByPk = SecurityControl.findByPk;
  const originalCreate = SecurityControl.create;

  SecurityControl.findByPk = async () => ({
    id: 1,
    isLocked: false,
    authVersion: 1,
  });
  SecurityControl.create = async () => ({
    id: 1,
    isLocked: false,
    authVersion: 1,
  });

  try {
    const req = { headers: {} };
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

    let nextCalled = false;
    await autenticar(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error, "Token não fornecido");
  } finally {
    SecurityControl.findByPk = originalFindByPk;
    SecurityControl.create = originalCreate;
  }
});
