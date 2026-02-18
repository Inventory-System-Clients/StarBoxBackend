import express from "express";
import financeiroAuthRoutes from "./auth.routes.js";
import financeiroBillsRoutes from "./bills.routes.js";
import financeiroCategoriesRoutes from "./categories.routes.js";
import financeiroReportsRoutes from "./reports.routes.js";

import { autenticar } from "../../middlewares/auth.js";
const router = express.Router();

// Bloquear GERENCIADOR
router.use(autenticar, (req, res, next) => {
	if (req.usuario.role === "GERENCIADOR") {
		return res.status(403).json({ error: "Acesso negado para GERENCIADOR" });
	}
	next();
});

router.use("/auth", financeiroAuthRoutes);
router.use("/bills", financeiroBillsRoutes);
router.use("/categories", financeiroCategoriesRoutes);
router.use("/reports", financeiroReportsRoutes);

export default router;
