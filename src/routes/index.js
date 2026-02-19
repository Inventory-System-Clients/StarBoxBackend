import express from "express";
import authRoutes from "./auth.routes.js";
import usuarioRoutes from "./usuario.routes.js";
import lojaRoutes from "./loja.routes.js";
import maquinaRoutes from "./maquina.routes.js";
import produtoRoutes from "./produto.routes.js";
import movimentacaoRoutes from "./movimentacao.routes.js";
import relatorioRoutes from "./relatorio.routes.js";
import totaisRoutes from "./totais.routes.js";
import adminRoutes from "./admin.routes.js";
import estoqueLojaRoutes from "./estoqueLoja.routes.js";
import movimentacaoEstoqueLojaRoutes from "./movimentacaoEstoqueLoja.routes.js";
import veiculoRoutes from "./veiculo.routes.js";
import alertasVeiculosRoutes from "./alertasVeiculos.routes.js";
import movimentacaoVeiculoRoutes from "./movimentacaoVeiculo.routes.js";
import roteirosRoutes from "./roteiros.routes.js";
import statusDiarioRoutes from "./statusDiario.routes.js";
import financeiroRoutes from "./financeiro/index.js";
import pecasRoutes from "./pecas.routes.js";
import carrinhoPecaRoutes from "./carrinhoPeca.routes.js";
import roteiroStatusRoutes from "./roteiroStatus.routes.js";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/lojas", lojaRoutes);
router.use("/maquinas", maquinaRoutes);
router.use("/produtos", produtoRoutes);
router.use("/movimentacoes", movimentacaoRoutes);
router.use("/relatorios", relatorioRoutes);
router.use("/totais", totaisRoutes);

router.use("/pecas", pecasRoutes);
router.use("/usuarios", carrinhoPecaRoutes); // /usuarios/:id/carrinho
router.use("/admin", adminRoutes);
router.use("/estoque-lojas", estoqueLojaRoutes);
router.use("/movimentacao-estoque-loja", movimentacaoEstoqueLojaRoutes);

router.use("/veiculos", veiculoRoutes);
router.use("/alertas-veiculos", alertasVeiculosRoutes);

router.use("/movimentacao-veiculos", movimentacaoVeiculoRoutes);

router.use("/roteiros", roteirosRoutes);
router.use("/status-diario", statusDiarioRoutes);
router.use("/roteiro-status", roteiroStatusRoutes);

// Nova rota para a aba de financeiro
router.use("/financeiro", financeiroRoutes);

export default router;
