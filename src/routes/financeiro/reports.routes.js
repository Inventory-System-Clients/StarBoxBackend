import express from "express";
import {
  dashboard,
  alerts,
  exportReport,
} from "../../controllers/financeiro/reportsController.js";

const router = express.Router();

router.get("/dashboard", dashboard);
router.get("/alerts", alerts);
router.get("/export", exportReport);

export default router;
