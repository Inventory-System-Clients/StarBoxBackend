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
};
