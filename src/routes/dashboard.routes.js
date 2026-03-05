import express from "express";
import { lucroDiario, faturamentoSemanal, comparacaoLucro } from "../controllers/dashboardController.js";
import { autenticar } from "../middlewares/auth.js";

const router = express.Router();

// GET /dashboard/lucro-diario?lojaId=...
router.get("/lucro-diario", autenticar, lucroDiario);

// GET /dashboard/faturamento-semanal?lojaId=...
router.get("/faturamento-semanal", autenticar, faturamentoSemanal);

// GET /dashboard/comparacao-lucro?lojaId=...
router.get("/comparacao-lucro", autenticar, comparacaoLucro);

export default router;
