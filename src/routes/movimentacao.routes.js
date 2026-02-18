import express from "express";
import {
  registrarMovimentacao,
  listarMovimentacoes,
  obterMovimentacao,
  atualizarMovimentacao,
  deletarMovimentacao,
} from "../controllers/movimentacaoController.js";
import {
  autenticar,
  autorizar,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();

router.get("/", autenticar, listarMovimentacoes);
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
