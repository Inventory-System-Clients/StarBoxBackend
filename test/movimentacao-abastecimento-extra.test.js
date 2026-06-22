import test from "node:test";
import assert from "node:assert/strict";

import { registrarAbastecimentoExtra } from "../src/controllers/movimentacaoController.js";
import {
  EstoqueLoja,
  EstoqueUsuario,
  Maquina,
  Movimentacao,
  MovimentacaoProduto,
  Produto,
  Roteiro,
  RoteiroLoja,
  UsuarioLoja,
} from "../src/models/index.js";

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

const metodosOriginais = {
  transaction: Movimentacao.sequelize.transaction,
  movimentacaoFindByPk: Movimentacao.findByPk,
  maquinaFindByPk: Maquina.findByPk,
  produtoFindByPk: Produto.findByPk,
  roteiroFindByPk: Roteiro.findByPk,
  roteiroLojaFindOne: RoteiroLoja.findOne,
  usuarioLojaFindOne: UsuarioLoja.findOne,
  estoqueUsuarioFindOne: EstoqueUsuario.findOne,
  estoqueLojaFindOne: EstoqueLoja.findOne,
  detalheFindOne: MovimentacaoProduto.findOne,
  detalheCreate: MovimentacaoProduto.create,
};

const restaurarMocks = () => {
  Movimentacao.sequelize.transaction = metodosOriginais.transaction;
  Movimentacao.findByPk = metodosOriginais.movimentacaoFindByPk;
  Maquina.findByPk = metodosOriginais.maquinaFindByPk;
  Produto.findByPk = metodosOriginais.produtoFindByPk;
  Roteiro.findByPk = metodosOriginais.roteiroFindByPk;
  RoteiroLoja.findOne = metodosOriginais.roteiroLojaFindOne;
  UsuarioLoja.findOne = metodosOriginais.usuarioLojaFindOne;
  EstoqueUsuario.findOne = metodosOriginais.estoqueUsuarioFindOne;
  EstoqueLoja.findOne = metodosOriginais.estoqueLojaFindOne;
  MovimentacaoProduto.findOne = metodosOriginais.detalheFindOne;
  MovimentacaoProduto.create = metodosOriginais.detalheCreate;
};

const configurarCenario = ({
  role = "FUNCIONARIO",
  usuarioId = "func-1",
  funcionarioId = usuarioId,
  produtoExiste = true,
  estoqueUsuario = { id: "est-user-1", quantidade: 20 },
  estoqueLoja = null,
  permissaoLoja = {
    permissoes: { registrarMovimentacao: true },
  },
  detalheExistente = null,
} = {}) => {
  let committed = false;
  let rolledBack = false;
  let movimentoUpdate = null;
  let estoqueUpdate = null;
  let detalheCriado = null;
  let usuarioLojaConsultado = false;
  let findMovimentacaoCount = 0;

  const transaction = {
    LOCK: { UPDATE: "UPDATE" },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
  };

  const movimentacao = {
    id: "mov-1",
    maquinaId: "maq-1",
    usuarioId: "criador-antigo",
    roteiroId: "rot-1",
    totalPre: 40,
    abastecidas: 5,
    contadorIn: 1234,
    contadorOut: 567,
    async update(payload) {
      movimentoUpdate = payload;
      Object.assign(this, payload);
    },
  };

  const estoqueUsuarioModel = estoqueUsuario
    ? {
        ...estoqueUsuario,
        async update(payload) {
          estoqueUpdate = { origem: "usuario", ...payload };
          Object.assign(this, payload);
        },
      }
    : null;
  const estoqueLojaModel = estoqueLoja
    ? {
        ...estoqueLoja,
        async update(payload) {
          estoqueUpdate = { origem: "loja", ...payload };
          Object.assign(this, payload);
        },
      }
    : null;

  Movimentacao.sequelize.transaction = async () => transaction;
  Movimentacao.findByPk = async () => {
    findMovimentacaoCount += 1;
    if (findMovimentacaoCount === 1) return movimentacao;
    return {
      ...movimentacao,
      maquina: { id: "maq-1", lojaId: "loja-1" },
      detalhesProdutos: detalheCriado ? [detalheCriado] : [],
    };
  };
  Maquina.findByPk = async () => ({
    id: "maq-1",
    codigo: "M01",
    nome: "Máquina 1",
    lojaId: "loja-1",
    tipo: "Garra",
  });
  Produto.findByPk = async () =>
    produtoExiste ? { id: "prod-novo", nome: "Produto novo" } : null;
  Roteiro.findByPk = async () => ({
    id: "rot-1",
    funcionarioId,
  });
  RoteiroLoja.findOne = async () => ({ RoteiroId: "rot-1", LojaId: "loja-1" });
  UsuarioLoja.findOne = async () => {
    usuarioLojaConsultado = true;
    return permissaoLoja;
  };
  EstoqueUsuario.findOne = async () => estoqueUsuarioModel;
  EstoqueLoja.findOne = async () => estoqueLojaModel;
  MovimentacaoProduto.findOne = async () => detalheExistente;
  MovimentacaoProduto.create = async (payload) => {
    detalheCriado = payload;
    return payload;
  };

  return {
    req: {
      params: { id: "mov-1" },
      body: {
        produtoId: "prod-novo",
        quantidadeAbastecida: 10,
      },
      usuario: { id: usuarioId, role },
    },
    state: {
      get committed() {
        return committed;
      },
      get rolledBack() {
        return rolledBack;
      },
      get movimentoUpdate() {
        return movimentoUpdate;
      },
      get estoqueUpdate() {
        return estoqueUpdate;
      },
      get detalheCriado() {
        return detalheCriado;
      },
      get usuarioLojaConsultado() {
        return usuarioLojaConsultado;
      },
    },
  };
};

test("FUNCIONARIO responsável registra produto diferente e preserva IN/OUT", async () => {
  const { req, state } = configurarCenario();
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.committed, true);
    assert.deepEqual(state.estoqueUpdate, {
      origem: "usuario",
      quantidade: 10,
    });
    assert.equal(state.detalheCriado.produtoId, "prod-novo");
    assert.equal(state.detalheCriado.quantidadeAbastecida, 10);
    assert.equal(state.movimentoUpdate.abastecidas, 15);
    assert.equal(state.movimentoUpdate.totalPos, 55);
    assert.equal(state.movimentoUpdate.produtoNaMaquinaId, "prod-novo");
    assert.equal("contadorIn" in state.movimentoUpdate, false);
    assert.equal("contadorOut" in state.movimentoUpdate, false);
  } finally {
    restaurarMocks();
  }
});

test("FUNCIONARIO_TODAS_LOJAS usa estoque da loja quando não há estoque pessoal", async () => {
  const { req, state } = configurarCenario({
    role: "FUNCIONARIO_TODAS_LOJAS",
    estoqueUsuario: null,
    estoqueLoja: { id: "est-loja-1", quantidade: 18 },
  });
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(state.estoqueUpdate, {
      origem: "loja",
      quantidade: 8,
    });
    assert.equal(state.usuarioLojaConsultado, false);
  } finally {
    restaurarMocks();
  }
});

test("estoque insuficiente retorna 409 e não persiste alterações", async () => {
  const { req, state } = configurarCenario({
    estoqueUsuario: { id: "est-user-1", quantidade: 4 },
  });
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /Estoque insuficiente/);
    assert.equal(state.rolledBack, true);
    assert.equal(state.estoqueUpdate, null);
    assert.equal(state.movimentoUpdate, null);
  } finally {
    restaurarMocks();
  }
});

test("produto inexistente retorna 404", async () => {
  const { req, state } = configurarCenario({ produtoExiste: false });
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, "Produto não encontrado");
    assert.equal(state.rolledBack, true);
  } finally {
    restaurarMocks();
  }
});

test("estoque inexistente retorna 404", async () => {
  const { req, state } = configurarCenario({
    estoqueUsuario: null,
    estoqueLoja: null,
  });
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 404);
    assert.match(res.body.error, /Estoque não encontrado/);
    assert.equal(state.rolledBack, true);
  } finally {
    restaurarMocks();
  }
});

test("funcionário não responsável pelo roteiro recebe 403", async () => {
  const { req, state } = configurarCenario({
    funcionarioId: "outro-funcionario",
  });
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /responsável/);
    assert.equal(state.rolledBack, true);
    assert.equal(state.estoqueUpdate, null);
  } finally {
    restaurarMocks();
  }
});

test("quantidade inválida retorna 400 antes de abrir transação", async () => {
  const { req, state } = configurarCenario();
  req.body.quantidadeAbastecida = 0;
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /maior que zero/);
    assert.equal(state.committed, false);
    assert.equal(state.rolledBack, false);
  } finally {
    restaurarMocks();
  }
});

test("falha após débito aciona rollback e retorna 500", async () => {
  const { req, state } = configurarCenario();
  MovimentacaoProduto.create = async () => {
    throw new Error("falha simulada ao registrar detalhe");
  };
  const res = createMockRes();

  try {
    await registrarAbastecimentoExtra(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, "Erro interno ao registrar abastecimento");
    assert.equal(state.rolledBack, true);
    assert.equal(state.committed, false);
    assert.deepEqual(state.estoqueUpdate, {
      origem: "usuario",
      quantidade: 10,
    });
  } finally {
    restaurarMocks();
  }
});
