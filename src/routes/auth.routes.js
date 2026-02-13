import express from "express";
import {
  login,
  registrar,
  perfil,
  atualizarPerfil,
} from "../controllers/authController.js";
import { autenticar } from "../middlewares/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/registrar", registrar);
router.get("/perfil", autenticar, perfil);
router.put("/perfil", autenticar, atualizarPerfil);

export default router;
