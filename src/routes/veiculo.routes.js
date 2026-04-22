import express from "express";
import veiculoController from "../controllers/veiculoController.js";
import { autenticar, registrarLog } from "../middlewares/auth.js";
const router = express.Router();

router.get("/", veiculoController.listar);
router.post("/", veiculoController.criar);
router.patch("/:id/intervalo-revisao", veiculoController.atualizarIntervaloRevisao);
router.put("/:id", veiculoController.atualizar);
router.delete(
	"/:id",
	autenticar,
	registrarLog("DELETAR_VEICULO", "Veiculo"),
	veiculoController.remover,
);

export default router;
