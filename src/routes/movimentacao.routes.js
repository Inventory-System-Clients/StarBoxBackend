import express from "express";
import {
  registrarMovimentacao,
  listarMovimentacoes,
  obterMovimentacao,
  atualizarMovimentacao,
  deletarMovimentacao,
  relatorioMovimentacoesDia,
  relatorioLucroTotalDia,
  relatorioComissaoTotalDia,
} from "../controllers/movimentacaoController.js";
import {
  autenticar,
  autorizar,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();

router.get("/", autenticar, listarMovimentacoes);

// Relatório routes MUST come before /:id to avoid being caught by the param route
router.get("/relatorio/movimentacoes-dia", autenticar, relatorioMovimentacoesDia);
router.get("/relatorio/lucro-dia", autenticar, relatorioLucroTotalDia);
router.get("/relatorio/comissao-dia", autenticar, relatorioComissaoTotalDia);

router.get("/:id", autenticar, obterMovimentacao);
router.post(
  "/",
  autenticar,
  registrarLog("REGISTRAR_MOVIMENTACAO", "Movimentacao"),
  registrarMovimentacao
);
router.put(
  "/:id",
  autenticar,
  registrarLog("EDITAR_MOVIMENTACAO", "Movimentacao"),
  atualizarMovimentacao
);
router.delete(
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("DELETAR_MOVIMENTACAO", "Movimentacao"),
  deletarMovimentacao
);

export default router;
