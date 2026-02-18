import express from "express";
import {
  listarMaquinas,
  obterMaquina,
  criarMaquina,
  atualizarMaquina,
  deletarMaquina,
  obterEstoqueAtual,
  calcularQuantidadeAtual,
} from "../controllers/maquinaController.js";
import {
  autenticar,
  autorizar,
  registrarLog,
} from "../middlewares/auth.js";
import { problemaMaquina } from "../controllers/movimentacaoController.js";

const router = express.Router();

router.get("/", autenticar, listarMaquinas);
router.get("/:id", autenticar, obterMaquina);
router.get("/:id/estoque", autenticar, obterEstoqueAtual);
router.get("/:id/problema", autenticar, problemaMaquina);
// Endpoint para cálculo automático
router.get("/:id/calcular-quantidade", autenticar, calcularQuantidadeAtual);
  "/",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("CRIAR_MAQUINA", "Maquina"),
  criarMaquina,
);
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("EDITAR_MAQUINA", "Maquina"),
  atualizarMaquina,
);
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("DELETAR_MAQUINA", "Maquina"),
  deletarMaquina,
);

export default router;
