import express from "express";
import alertasVeiculosController from "../controllers/alertasVeiculosController.js";
const router = express.Router();

router.get("/", alertasVeiculosController.listarAlertas);

export default router;
