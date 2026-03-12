import express from "express";
import {
  gerarPromptWhatsAppManutencao,
  listarPromptsWhatsAppManutencao,
  listarDestinatariosWhatsAppManutencao,
} from "../controllers/manutencaoWhatsAppPromptController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

router.use(autenticar, autorizar(["ADMIN", "GERENCIADOR"]));

router.get("/", listarPromptsWhatsAppManutencao);
router.get("/destinatarios", listarDestinatariosWhatsAppManutencao);
router.post("/gerar", gerarPromptWhatsAppManutencao);

export default router;
