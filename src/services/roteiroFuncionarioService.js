import { Usuario, RoteiroExecucaoSemanal } from "../models/index.js";

const ROLES_FUNCIONARIO_ROTEIRO = new Set([
  "FUNCIONARIO",
  "FUNCIONARIO_TODAS_LOJAS",
]);

const ROLES_RESPONSAVEL_ROTEIRO = new Set([
  "ADMIN",
  "GERENCIADOR",
  "FUNCIONARIO",
  "FUNCIONARIO_TODAS_LOJAS",
]);

const valorVazio = (valor) =>
  valor === null || valor === undefined || String(valor).trim() === "";

const erroValidacao = (message, status = 400) =>
  Object.assign(new Error(message), { status });

export const hasFuncionarioPayload = (payload = {}) =>
  Object.prototype.hasOwnProperty.call(payload, "funcionarioId") ||
  Object.prototype.hasOwnProperty.call(payload, "funcionarioNome");

export const resolverAtualizacaoFuncionarioRoteiro = async ({
  funcionarioId,
  funcionarioNome,
}) => {
  if (valorVazio(funcionarioId)) {
    return {};
  }

  const funcionario = await Usuario.findByPk(String(funcionarioId).trim(), {
    attributes: ["id", "nome", "role", "ativo"],
  });

  if (!funcionario) {
    throw erroValidacao("Funcionario nao encontrado", 404);
  }

  if (!funcionario.ativo || !ROLES_RESPONSAVEL_ROTEIRO.has(funcionario.role)) {
    throw erroValidacao(
      "Usuario informado nao e um responsavel ativo permitido para roteiro",
    );
  }

  return {
    funcionarioId: funcionario.id,
    funcionarioNome:
      typeof funcionarioNome === "string" && funcionarioNome.trim()
        ? funcionarioNome.trim()
        : funcionario.nome,
  };
};

export const garantirFuncionarioPersistenteRoteiro = async (
  roteiro,
  { transaction } = {},
) => {
  if (!roteiro || roteiro.funcionarioId) {
    return roteiro;
  }

  const execucao = await RoteiroExecucaoSemanal.findOne({
    where: { roteiroId: roteiro.id },
    transaction,
  });

  if (!execucao?.usuarioId) {
    return roteiro;
  }

  const funcionario = await Usuario.findByPk(execucao.usuarioId, {
    attributes: ["id", "nome", "role", "ativo"],
    transaction,
  });

  if (
    !funcionario ||
    !funcionario.ativo ||
    !ROLES_FUNCIONARIO_ROTEIRO.has(funcionario.role)
  ) {
    return roteiro;
  }

  await roteiro.update(
    {
      funcionarioId: funcionario.id,
      funcionarioNome: funcionario.nome,
    },
    { transaction },
  );

  roteiro.funcionarioId = funcionario.id;
  roteiro.funcionarioNome = funcionario.nome;
  return roteiro;
};
