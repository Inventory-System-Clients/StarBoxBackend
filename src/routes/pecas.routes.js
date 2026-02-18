import express from "express";
import {
  listarPecas,
  criarPeca,
  atualizarPeca,
  excluirPeca,
} from "../controllers/pecaController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

// Listar todas as peças (qualquer usuário autenticado)
router.get("/", autenticar, listarPecas);
// Cadastrar nova peça (ADMIN, GERENCIADOR)
router.post("/", autenticar, autorizar(["ADMIN", "GERENCIADOR"]), criarPeca);
// Editar peça (ADMIN, GERENCIADOR)
router.put("/:id", autenticar, autorizar(["ADMIN", "GERENCIADOR"]), atualizarPeca);
// Excluir peça (ADMIN, GERENCIADOR)
router.delete("/:id", autenticar, autorizar(["ADMIN", "GERENCIADOR"]), excluirPeca);

export default router;
