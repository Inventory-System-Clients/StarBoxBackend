import express from "express";
import { getStatusDiario } from "../controllers/statusDiarioController.js";

const router = express.Router();

router.get("/status-diario", getStatusDiario);

export default router;
