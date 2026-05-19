import test from "node:test";
import assert from "node:assert/strict";

import {
  garantirFuncionarioPersistenteRoteiro,
  resolverAtualizacaoFuncionarioRoteiro,
} from "../src/services/roteiroFuncionarioService.js";
import { Usuario, RoteiroExecucaoSemanal } from "../src/models/index.js";

test("payload vazio de funcionario nao gera atualizacao que desassocia roteiro", async () => {
  assert.deepEqual(
    await resolverAtualizacaoFuncionarioRoteiro({
      funcionarioId: "",
      funcionarioNome: "",
    }),
    {},
  );

  assert.deepEqual(
    await resolverAtualizacaoFuncionarioRoteiro({
      funcionarioId: null,
      funcionarioNome: "Qualquer Nome",
    }),
    {},
  );
});

test("troca de funcionario exige usuario ativo com role de funcionario", async () => {
  const originalFindByPk = Usuario.findByPk;

  Usuario.findByPk = async () => ({
    id: "func-1",
    nome: "Funcionario Um",
    role: "FUNCIONARIO",
    ativo: true,
  });

  try {
    assert.deepEqual(
      await resolverAtualizacaoFuncionarioRoteiro({
        funcionarioId: "func-1",
      }),
      {
        funcionarioId: "func-1",
        funcionarioNome: "Funcionario Um",
      },
    );
  } finally {
    Usuario.findByPk = originalFindByPk;
  }
});

test("responsavel do roteiro pode ser ADMIN ativo quando escolhido explicitamente", async () => {
  const originalFindByPk = Usuario.findByPk;

  Usuario.findByPk = async () => ({
    id: "admin-1",
    nome: "Admin Um",
    role: "ADMIN",
    ativo: true,
  });

  try {
    assert.deepEqual(
      await resolverAtualizacaoFuncionarioRoteiro({
        funcionarioId: "admin-1",
      }),
      {
        funcionarioId: "admin-1",
        funcionarioNome: "Admin Um",
      },
    );
  } finally {
    Usuario.findByPk = originalFindByPk;
  }
});

test("responsavel do roteiro rejeita usuario inativo", async () => {
  const originalFindByPk = Usuario.findByPk;

  Usuario.findByPk = async () => ({
    id: "admin-inativo",
    nome: "Admin Inativo",
    role: "ADMIN",
    ativo: false,
  });

  try {
    await assert.rejects(
      () =>
        resolverAtualizacaoFuncionarioRoteiro({
          funcionarioId: "admin-inativo",
        }),
      {
        status: 400,
        message:
          "Usuario informado nao e um responsavel ativo permitido para roteiro",
      },
    );
  } finally {
    Usuario.findByPk = originalFindByPk;
  }
});

test("roteiro sem funcionario recupera responsavel da execucao semanal ativa", async () => {
  const originalFindOne = RoteiroExecucaoSemanal.findOne;
  const originalFindByPk = Usuario.findByPk;
  const updates = [];

  RoteiroExecucaoSemanal.findOne = async () => ({ usuarioId: "func-2" });
  Usuario.findByPk = async () => ({
    id: "func-2",
    nome: "Funcionario Dois",
    role: "FUNCIONARIO_TODAS_LOJAS",
    ativo: true,
  });

  const roteiro = {
    id: "roteiro-1",
    funcionarioId: null,
    funcionarioNome: null,
    async update(payload) {
      updates.push(payload);
      Object.assign(this, payload);
    },
  };

  try {
    await garantirFuncionarioPersistenteRoteiro(roteiro);

    assert.deepEqual(updates, [
      {
        funcionarioId: "func-2",
        funcionarioNome: "Funcionario Dois",
      },
    ]);
    assert.equal(roteiro.funcionarioId, "func-2");
    assert.equal(roteiro.funcionarioNome, "Funcionario Dois");
  } finally {
    RoteiroExecucaoSemanal.findOne = originalFindOne;
    Usuario.findByPk = originalFindByPk;
  }
});
