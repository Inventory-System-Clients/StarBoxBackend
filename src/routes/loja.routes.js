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
  autorizar,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();

router.get("/", autenticar, listarLojas);
router.get("/:id", autenticar, obterLoja);
  "/",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("CRIAR_LOJA", "Loja"),
  criarLoja
);
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("EDITAR_LOJA", "Loja"),
  atualizarLoja
);
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("DELETAR_LOJA", "Loja"),
  deletarLoja
);

export default router;
