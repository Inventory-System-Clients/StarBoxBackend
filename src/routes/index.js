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
import estoqueUsuarioRoutes from "./estoqueUsuario.routes.js";
import movimentacaoEstoqueLojaRoutes from "./movimentacaoEstoqueLoja.routes.js";
import veiculoRoutes from "./veiculo.routes.js";
import alertasVeiculosRoutes from "./alertasVeiculos.routes.js";
import movimentacaoVeiculoRoutes from "./movimentacaoVeiculo.routes.js";
import revisaoVeiculoRoutes from "./revisaoVeiculo.routes.js";
import roteirosRoutes from "./roteiros.routes.js";
import statusDiarioRoutes from "./statusDiario.routes.js";
import financeiroRoutes from "./financeiro/index.js";
import pecasRoutes from "./pecas.routes.js";
import carrinhoPecaRoutes from "./carrinhoPeca.routes.js";
import roteiroStatusRoutes from "./roteiroStatus.routes.js";
import securityRoutes from "./security.routes.js";
import manutencaoRoutes from "./manutencao.routes.js";
import whatsappAlertaRoutes from "./whatsappAlerta.routes.js";
import whatsappWebhookRoutes from "./whatsappWebhook.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import gastosFixosLojaRoutes from "./gastosFixosLoja.routes.js";
import fluxoCaixaRoutes from "./fluxoCaixa.routes.js";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/security", securityRoutes);
router.use("/usuarios", carrinhoPecaRoutes); // /usuarios/:id/carrinho — ANTES de usuarioRoutes
router.use("/usuarios", usuarioRoutes);
router.use("/lojas", lojaRoutes);
router.use("/maquinas", maquinaRoutes);
router.use("/produtos", produtoRoutes);
router.use("/pecas", pecasRoutes);
router.use("/movimentacoes", movimentacaoRoutes);
router.use("/movimentacao", movimentacaoRoutes); // alias singular para frontend
router.use("/manutencoes", manutencaoRoutes);
router.use("/relatorios", relatorioRoutes);
router.use("/totais", totaisRoutes);
router.use("/admin", adminRoutes);
router.use("/estoque-lojas", estoqueLojaRoutes);
router.use("/estoque-usuarios", estoqueUsuarioRoutes);
router.use("/movimentacao-estoque-loja", movimentacaoEstoqueLojaRoutes);

router.use("/veiculos", veiculoRoutes);
router.use("/alertas-veiculos", alertasVeiculosRoutes);

router.use("/movimentacao-veiculos", movimentacaoVeiculoRoutes);
router.use("/revisoes-veiculos", revisaoVeiculoRoutes);

router.use("/roteiros", roteirosRoutes);
router.use("/status-diario", statusDiarioRoutes);
router.use("/roteiro-status", roteiroStatusRoutes);
router.use("/whatsapp-alertas", whatsappAlertaRoutes);
router.use("/whatsapp-webhook", whatsappWebhookRoutes);

// Nova rota para a aba de financeiro
router.use("/financeiro", financeiroRoutes);

// Nova rota para o dashboard
router.use("/dashboard", dashboardRoutes);
router.use("/gastos-fixos-loja", gastosFixosLojaRoutes);

// Rota para Fluxo de Caixa
router.use("/fluxo-caixa", fluxoCaixaRoutes);

export default router;
