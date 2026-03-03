import express from "express";
import {
  listarAlertasWhatsApp,
  enviarAlertaWhatsApp,
} from "../controllers/whatsappAlertaController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", autenticar, autorizar(["ADMIN"]), listarAlertasWhatsApp);
router.post("/", autenticar, autorizar(["ADMIN"]), enviarAlertaWhatsApp);

export default router;
