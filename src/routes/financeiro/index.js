import express from "express";
import financeiroAuthRoutes from "./auth.routes.js";
import financeiroBillsRoutes from "./bills.routes.js";
import financeiroCategoriesRoutes from "./categories.routes.js";
import financeiroReportsRoutes from "./reports.routes.js";

const router = express.Router();

router.use("/auth", financeiroAuthRoutes);
router.use("/bills", financeiroBillsRoutes);
router.use("/categories", financeiroCategoriesRoutes);
router.use("/reports", financeiroReportsRoutes);

export default router;
