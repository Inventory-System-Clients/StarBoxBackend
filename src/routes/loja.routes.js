import express from "express";
import {
  listarLojas,
  obterLoja,
  criarLoja,
  atualizarLoja,
  deletarLoja,
} from "../controllers/lojaController.js";
import {
  autenticar,
  autorizarRole,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();

router.get("/", autenticar, listarLojas);
router.get("/:id", autenticar, obterLoja);
router.post(
  "/",
  autenticar,
  autorizarRole("ADMIN"),
  registrarLog("CRIAR_LOJA", "Loja"),
  criarLoja
);
router.put(
  "/:id",
  autenticar,
  autorizarRole("ADMIN"),
  registrarLog("EDITAR_LOJA", "Loja"),
  atualizarLoja
);
router.delete(
  "/:id",
  autenticar,
  autorizarRole("ADMIN"),
  registrarLog("DELETAR_LOJA", "Loja"),
  deletarLoja
);

export default router;
