import express from "express";
import {
  listarManutencoes,
  criarManutencao,
  atualizarManutencao,
  deletarManutencao,
} from "../controllers/manutencaoController.js";
import { autenticar, autorizar, registrarLog } from "../middlewares/auth.js";

const router = express.Router();

router.use(autenticar);

router.get("/", listarManutencoes);
router.post(
  "/",
  autorizar(["ADMIN", "GERENCIADOR"]),
  registrarLog("CRIAR_MANUTENCAO", "Manutencao"),
  criarManutencao,
);
router.put(
  "/:id",
  registrarLog("EDITAR_MANUTENCAO", "Manutencao"),
  atualizarManutencao,
);
router.delete(
  "/:id",
  autorizar(["ADMIN"]),
  registrarLog("DELETAR_MANUTENCAO", "Manutencao"),
  deletarManutencao,
);

export default router;
