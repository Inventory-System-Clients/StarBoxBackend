import express from "express";
import {
  balançoSemanal,
  alertasEstoque,
  performanceMaquinas,
  relatorioImpressao,
  buscarAlertasDeInconsistencia,
  ignorarAlertaMovimentacao,
  dashboardRelatorio,
} from "../controllers/relatorioController.js";
import { alertasAbastecimentoIncompleto } from "../controllers/movimentacaoController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

// Todas as rotas de relatórios são restritas a ADMIN
router.get(
  "/balanco-semanal",
  autenticar,
  autorizar("ADMIN"),
  balançoSemanal
);
router.get(
  "/alertas-movimentacao-inconsistente",
  autenticar,
  autorizar("ADMIN"),
  buscarAlertasDeInconsistencia
);
router.delete(
  "/alertas-movimentacao-inconsistente/:id",
  autenticar,
  autorizar("ADMIN"),
  ignorarAlertaMovimentacao
);
router.get(
  "/alertas-estoque",
  autenticar,
  autorizar("ADMIN"),
  alertasEstoque
);
router.get(
  "/performance-maquinas",
  autenticar,
  autorizar("ADMIN"),
  performanceMaquinas
);
router.get(
  "/impressao",
  autenticar,
  autorizar("ADMIN"),
  relatorioImpressao
);
router.get(
  "/dashboard",
  autenticar,
  autorizar("ADMIN"),
  dashboardRelatorio
);
router.get(
  "/alertas-abastecimento-incompleto",
  autenticar,
  autorizar("ADMIN"),
  alertasAbastecimentoIncompleto
);

export default router;
