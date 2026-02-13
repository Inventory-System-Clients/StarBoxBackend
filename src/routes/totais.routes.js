import express from "express";
import { totaisDinheiroPix } from "../controllers/totaisController.js";
import { autenticar } from "../middlewares/auth.js";

const router = express.Router();

// GET /totais/dinheiro-pix?lojaId=...&dataInicio=...&dataFim=...
router.get("/dinheiro-pix", autenticar, totaisDinheiroPix);

export default router;
