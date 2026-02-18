import express from "express";
import * as billController from "../../controllers/financeiro/billController.js";

const router = express.Router();

router.get("/", billController.getAll);
router.post("/", billController.create);
router.put("/:id", billController.update);
router.patch("/:id/status", billController.updateStatus);
router.delete("/:id", billController.delete);

export default router;
