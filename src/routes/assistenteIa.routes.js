import express from "express";
import { lerContadoresPorImagem } from "../controllers/assistenteIaController.js";
import { autenticar } from "../middlewares/auth.js";
import { limitarLeituraContadores } from "../middlewares/assistenteIaRateLimit.js";

const router = express.Router();

router.post(
  "/ler-contadores",
  autenticar,
  limitarLeituraContadores,
  lerContadoresPorImagem,
);

export default router;
