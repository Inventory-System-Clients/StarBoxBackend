import express from "express";
import {
  receberWebhookMeta,
  verificarWebhookMeta,
} from "../controllers/whatsappWebhookController.js";

const router = express.Router();

router.get("/", verificarWebhookMeta);
router.post("/", receberWebhookMeta);

export default router;
