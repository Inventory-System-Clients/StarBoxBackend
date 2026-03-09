// Ocultar justificativa de quebra de ordem
import { Movimentacao } from "../models/index.js";
router.patch("/:id/ocultar-justificativa", async (req, res) => {
  try {
    const { id } = req.params;
    const mov = await Movimentacao.findByPk(id);
    if (!mov) return res.status(404).json({ error: "Movimentação não encontrada" });
    await mov.update({ status_justificativa: "oculta" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao ocultar justificativa" });
  }
});
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
