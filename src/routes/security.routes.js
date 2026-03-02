import express from "express";
import {
  criarSessaoSeguranca,
  obterStatusSeguranca,
  alternarBloqueioSistema,
} from "../controllers/securityController.js";
import { autenticarPainelSeguranca } from "../middlewares/securityPanelAuth.js";

const router = express.Router();

router.post("/session", criarSessaoSeguranca);
router.get("/status", autenticarPainelSeguranca, obterStatusSeguranca);
router.post("/toggle", autenticarPainelSeguranca, alternarBloqueioSistema);

export default router;
