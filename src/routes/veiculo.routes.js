import express from "express";
import veiculoController from "../controllers/veiculoController.js";
const router = express.Router();

router.get("/", veiculoController.listar);
router.post("/", veiculoController.criar);
router.put("/:id", veiculoController.atualizar);
router.delete("/:id", veiculoController.remover);

export default router;
