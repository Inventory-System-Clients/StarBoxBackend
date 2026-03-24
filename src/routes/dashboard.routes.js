import express from "express";
import { lucroDiario, faturamentoSemanal, comparacaoLucro } from "../controllers/dashboardController.js";
import { listarGastosRoteirosDashboard } from "../controllers/gastoRoteiroController.js";
import { listarMinhasPecasDefeituosasDashboard } from "../controllers/pecaDefeituosaController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

// GET /dashboard/lucro-diario?lojaId=...
router.get("/lucro-diario", autenticar, lucroDiario);

// GET /dashboard/faturamento-semanal?lojaId=...
router.get("/faturamento-semanal", autenticar, faturamentoSemanal);

// GET /dashboard/comparacao-lucro?lojaId=...
router.get("/comparacao-lucro", autenticar, comparacaoLucro);

// GET /dashboard/pecas-defeituosas
router.get("/pecas-defeituosas", autenticar, listarMinhasPecasDefeituosasDashboard);

// GET /dashboard/gastos-roteiros?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD
router.get(
  "/gastos-roteiros",
  autenticar,
  autorizar("ADMIN"),
  listarGastosRoteirosDashboard,
);

export default router;
