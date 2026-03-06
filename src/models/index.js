import MovimentacaoPeca from "./MovimentacaoPeca.js";
// MovimentacaoPeca -> Movimentacao
MovimentacaoPeca.belongsTo(Movimentacao, { foreignKey: "movimentacaoId" });
Movimentacao.hasMany(MovimentacaoPeca, {
  foreignKey: "movimentacaoId",
  as: "pecasUsadas",
});
// MovimentacaoPeca -> Peca
MovimentacaoPeca.belongsTo(Peca, { foreignKey: "pecaId" });
Peca.hasMany(MovimentacaoPeca, { foreignKey: "pecaId" });
// CarrinhoPeca -> Peca
CarrinhoPeca.belongsTo(Peca, { foreignKey: "pecaId" });
Peca.hasMany(CarrinhoPeca, { foreignKey: "pecaId" });

// CarrinhoPeca -> Usuario
CarrinhoPeca.belongsTo(Usuario, { foreignKey: "usuarioId" });
Usuario.hasMany(CarrinhoPeca, { foreignKey: "usuarioId", as: "carrinhoPecas" });
import ContasFinanceiro from "./ContasFinanceiro.js";
import MovimentacaoVeiculo from "./MovimentacaoVeiculo.js";
import CarrinhoPeca from "./CarrinhoPeca.js";
import Peca from "./Peca.js";
import Usuario from "./Usuario.js";
import Loja from "./Loja.js";
import Maquina from "./Maquina.js";
import Produto from "./Produto.js";
import Movimentacao from "./Movimentacao.js";
import MovimentacaoProduto from "./MovimentacaoProduto.js";
import LogAtividade from "./LogAtividade.js";
import UsuarioLoja from "./UsuarioLoja.js";
import EstoqueLoja from "./EstoqueLoja.js";
import MovimentacaoEstoqueLoja from "./MovimentacaoEstoqueLoja.js";
import MovimentacaoEstoqueLojaProduto from "./MovimentacaoEstoqueLojaProduto.js";
import AlertaIgnorado from "./AlertaIgnorado.js";
import Veiculo from "./Veiculo.js";
import RegistroDinheiro from "./RegistroDinheiro.js";
import Roteiro from "./Roteiro.js";
import SecurityControl from "./SecurityControl.js";
import Manutencao from "./Manutencao.js";
import WhatsAppAlerta from "./WhatsAppAlerta.js";
import RoteiroFinalizacaoDiaria from "./RoteiroFinalizacaoDiaria.js";
import GastoFixoLoja from "./GastoFixoLoja.js";
Roteiro.associate({ Usuario, Loja });
// Movimentação de Veículo -> Veículo e Usuário
MovimentacaoVeiculo.belongsTo(Veiculo, {
  as: "veiculo",
  foreignKey: "veiculoId",
});
MovimentacaoVeiculo.belongsTo(Usuario, {
  as: "usuario",
  foreignKey: "usuarioId",
});

// Relacionamentos
MovimentacaoEstoqueLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
Loja.hasMany(MovimentacaoEstoqueLoja, {
  foreignKey: "lojaId",
  as: "movimentacoesEstoque",
});

MovimentacaoEstoqueLoja.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
});
Usuario.hasMany(MovimentacaoEstoqueLoja, {
  foreignKey: "usuarioId",
  as: "movimentacoesEstoque",
});

// Loja -> Máquinas
Loja.hasMany(Maquina, { foreignKey: "lojaId", as: "maquinas" });
Maquina.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });

// Loja -> Gastos Fixos
Loja.hasMany(GastoFixoLoja, { foreignKey: "lojaId", as: "gastosFixos" });
GastoFixoLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });


// Máquina -> Movimentações
Maquina.hasMany(Movimentacao, { foreignKey: "maquinaId", as: "movimentacoes" });
Movimentacao.belongsTo(Maquina, { foreignKey: "maquinaId", as: "maquina" });

// Usuário -> Movimentações
Usuario.hasMany(Movimentacao, { foreignKey: "usuarioId", as: "movimentacoes" });
Movimentacao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

// Movimentação <-> Produtos (many-to-many)
Movimentacao.belongsToMany(Produto, {
  through: MovimentacaoProduto,
  foreignKey: "movimentacaoId",
  otherKey: "produtoId",
  as: "produtos",
});

Produto.belongsToMany(Movimentacao, {
  through: MovimentacaoProduto,
  foreignKey: "produtoId",
  otherKey: "movimentacaoId",
  as: "movimentacoes",
});

// Acesso direto à tabela intermediária
Movimentacao.hasMany(MovimentacaoProduto, {
  foreignKey: "movimentacaoId",
  as: "detalhesProdutos",
});
MovimentacaoProduto.belongsTo(Movimentacao, { foreignKey: "movimentacaoId" });
MovimentacaoProduto.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "produto",
});

// Usuário -> Logs
Usuario.hasMany(LogAtividade, { foreignKey: "usuarioId", as: "logs" });
LogAtividade.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

// Usuário <-> Lojas (RBAC - many-to-many)
Usuario.belongsToMany(Loja, {
  through: UsuarioLoja,
  foreignKey: "usuarioId",
  otherKey: "lojaId",
  as: "lojasPermitidas",
});

Loja.belongsToMany(Usuario, {
  through: UsuarioLoja,
  foreignKey: "lojaId",
  otherKey: "usuarioId",
  as: "usuariosPermitidos",
});

// Acesso direto à tabela UsuarioLoja
Usuario.hasMany(UsuarioLoja, {
  foreignKey: "usuarioId",
  as: "permissoesLojas",
});
Loja.hasMany(UsuarioLoja, { foreignKey: "lojaId", as: "permissoesUsuarios" });
UsuarioLoja.belongsTo(Usuario, { foreignKey: "usuarioId" });
UsuarioLoja.belongsTo(Loja, { foreignKey: "lojaId" });

// Loja <-> Produtos (Estoque - many-to-many)
Loja.belongsToMany(Produto, {
  through: EstoqueLoja,
  foreignKey: "lojaId",
  otherKey: "produtoId",
  as: "estoqueProdutos",
});

Produto.belongsToMany(Loja, {
  through: EstoqueLoja,
  foreignKey: "produtoId",
  otherKey: "lojaId",
  as: "estoqueLoja",
});

// Relacionamento MovimentacaoEstoqueLoja <-> Produto
MovimentacaoEstoqueLoja.hasMany(MovimentacaoEstoqueLojaProduto, {
  foreignKey: "movimentacaoEstoqueLojaId",
  as: "produtosEnviados",
});
MovimentacaoEstoqueLojaProduto.belongsTo(MovimentacaoEstoqueLoja, {
  foreignKey: "movimentacaoEstoqueLojaId",
  as: "movimentacao",
});
MovimentacaoEstoqueLojaProduto.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "produto",
});
Loja.hasMany(EstoqueLoja, {
  foreignKey: "lojaId",
  as: "estoques",
});
Produto.hasMany(EstoqueLoja, {
  foreignKey: "produtoId",
  as: "estoquesEmLojas",
});
EstoqueLoja.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
EstoqueLoja.belongsTo(Produto, { foreignKey: "produtoId", as: "produto" });

// Manutenção
Manutencao.belongsTo(Loja, { foreignKey: "lojaId", as: "loja" });
Loja.hasMany(Manutencao, { foreignKey: "lojaId", as: "manutencoes" });

Manutencao.belongsTo(Maquina, { foreignKey: "maquinaId", as: "maquina" });
Maquina.hasMany(Manutencao, { foreignKey: "maquinaId", as: "manutencoes" });

Manutencao.belongsTo(Usuario, {
  foreignKey: "funcionarioId",
  as: "funcionario",
});
Usuario.hasMany(Manutencao, {
  foreignKey: "funcionarioId",
  as: "manutencoesAtribuidas",
});

Manutencao.belongsTo(Usuario, { foreignKey: "criadoPorId", as: "criadoPor" });
Usuario.hasMany(Manutencao, {
  foreignKey: "criadoPorId",
  as: "manutencoesCriadas",
});

Manutencao.belongsTo(Usuario, {
  foreignKey: "concluidoPorId",
  as: "concluidoPor",
});
Usuario.hasMany(Manutencao, {
  foreignKey: "concluidoPorId",
  as: "manutencoesConcluidas",
});

Manutencao.belongsTo(Usuario, {
  foreignKey: "verificadoPorId",
  as: "verificadoPor",
});
Usuario.hasMany(Manutencao, {
  foreignKey: "verificadoPorId",
  as: "manutencoesVerificadas",
});

Manutencao.belongsTo(Peca, {
  foreignKey: "pecaUsadaId",
  as: "pecaUsada",
});
Peca.hasMany(Manutencao, {
  foreignKey: "pecaUsadaId",
  as: "manutencoesComPeca",
});

Manutencao.belongsTo(Roteiro, { foreignKey: "roteiroId", as: "roteiro" });
Roteiro.hasMany(Manutencao, { foreignKey: "roteiroId", as: "manutencoes" });

RoteiroFinalizacaoDiaria.belongsTo(Roteiro, {
  foreignKey: "roteiroId",
  as: "roteiro",
});
Roteiro.hasMany(RoteiroFinalizacaoDiaria, {
  foreignKey: "roteiroId",
  as: "finalizacoesDiarias",
});

RoteiroFinalizacaoDiaria.belongsTo(Usuario, {
  foreignKey: "finalizadoPorId",
  as: "finalizadoPor",
});
Usuario.hasMany(RoteiroFinalizacaoDiaria, {
  foreignKey: "finalizadoPorId",
  as: "roteirosFinalizados",
});
export {
  CarrinhoPeca,
  Usuario,
  Loja,
  Maquina,
  Produto,
  Movimentacao,
  MovimentacaoProduto,
  LogAtividade,
  UsuarioLoja,
  EstoqueLoja,
  MovimentacaoEstoqueLoja,
  MovimentacaoEstoqueLojaProduto,
  AlertaIgnorado,
  Veiculo,
  MovimentacaoVeiculo,
  RegistroDinheiro,
  Roteiro,
  ContasFinanceiro,
  Peca,
  MovimentacaoPeca,
  SecurityControl,
  Manutencao,
  WhatsAppAlerta,
  RoteiroFinalizacaoDiaria,
  GastoFixoLoja,
};
