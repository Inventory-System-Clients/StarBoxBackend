import express from "express";
import * as authController from "../../controllers/financeiro/authController.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authController.me);

export default router;
