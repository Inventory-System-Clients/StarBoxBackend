import express from "express";
import financeiroAuthRoutes from "./financeiro/auth.routes.js";
import financeiroBillsRoutes from "./financeiro/bills.routes.js";
import financeiroCategoriesRoutes from "./financeiro/categories.routes.js";
import financeiroReportsRoutes from "./financeiro/reports.routes.js";

const router = express.Router();

router.use("/auth", financeiroAuthRoutes);
router.use("/bills", financeiroBillsRoutes);
router.use("/categories", financeiroCategoriesRoutes);
router.use("/reports", financeiroReportsRoutes);

export default router;
