import express from "express";
import {
  balançoSemanal,
  alertasEstoque,
  performanceMaquinas,
  relatorioImpressao,
  relatorioTodasLojas,
  rankingLucroBrutoLojas,
  buscarAlertasDeInconsistencia,
  ignorarAlertaMovimentacao,
  alertasMovimentacaoOut,
  alertasMovimentacaoIn,
  dashboardRelatorio,
  relatorioRoteiro,
  roteiroDiasSemMovimentacao,
} from "../controllers/relatorioController.js";
import { alertasAbastecimentoIncompleto } from "../controllers/movimentacaoController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

// Dias sem movimentação por loja no roteiro
router.get(
  "/roteiro-dias-sem-movimentacao",
  autenticar,
  autorizar("ADMIN"),
  roteiroDiasSemMovimentacao,
);

// Relatório de roteiro
router.get("/roteiro", autenticar, autorizar("ADMIN"), relatorioRoteiro);

// Todas as rotas de relatórios são restritas a ADMIN
router.get("/balanco-semanal", autenticar, autorizar("ADMIN"), balançoSemanal);
router.get(
  "/alertas-movimentacao-inconsistente",
  autenticar,
  autorizar("ADMIN"),
  buscarAlertasDeInconsistencia,
);
router.delete(
  "/alertas-movimentacao-inconsistente/:id",
  autenticar,
  autorizar("ADMIN"),
  ignorarAlertaMovimentacao,
);
router.get("/alertas-estoque", autenticar, autorizar("ADMIN"), alertasEstoque);
router.get(
  "/performance-maquinas",
  autenticar,
  autorizar("ADMIN"),
  performanceMaquinas,
);
router.get("/impressao", autenticar, autorizar("ADMIN"), relatorioImpressao);
router.get("/todas-lojas", autenticar, autorizar("ADMIN"), relatorioTodasLojas);
router.get(
  "/ranking-lucro-bruto-lojas",
  autenticar,
  autorizar("ADMIN"),
  rankingLucroBrutoLojas,
);
router.get("/dashboard", autenticar, autorizar("ADMIN"), dashboardRelatorio);
router.get(
  "/alertas-abastecimento-incompleto",
  autenticar,
  autorizar("ADMIN"),
  alertasAbastecimentoIncompleto,
);
router.get(
  "/alertas-movimentacao-out",
  autenticar,
  autorizar("ADMIN"),
  alertasMovimentacaoOut,
);
router.get(
  "/alertas-movimentacao-in",
  autenticar,
  autorizar("ADMIN"),
  alertasMovimentacaoIn,
);

export default router;
