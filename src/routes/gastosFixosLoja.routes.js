import express from "express";
import {
  listarGastosFixosPorLoja,
  salvarGastosFixosPorLoja,
} from "../controllers/gastosFixosLojaController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:id", autenticar, autorizar("ADMIN"), listarGastosFixosPorLoja);
router.post("/:id", autenticar, autorizar("ADMIN"), salvarGastosFixosPorLoja);

export default router;