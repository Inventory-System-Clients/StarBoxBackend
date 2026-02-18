import express from "express";
import * as reportsController from "../../controllers/financeiro/reportsController.js";

const router = express.Router();

router.get("/dashboard", reportsController.dashboard);
router.get("/alerts", reportsController.alerts);
router.get("/export", reportsController.export);

export default router;
