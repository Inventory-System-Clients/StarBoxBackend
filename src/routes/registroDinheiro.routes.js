import express from "express";
import registroDinheiroController from "../controllers/registroDinheiroController.js";
const router = express.Router();

// POST /registro-dinheiro
router.post("/", registroDinheiroController.criar);

// GET /registro-dinheiro
router.get("/", registroDinheiroController.listar);

export default router;
