import express from "express";
import {
  listarCarrinho,
  adicionarAoCarrinho,
  removerDoCarrinho,
} from "../controllers/carrinhoPecaController.js";
import { autenticar } from "../middlewares/auth.js";

const router = express.Router();

// Listar peças do carrinho do usuário
router.get("/:id/carrinho", autenticar, listarCarrinho);
// Adicionar peça ao carrinho
router.post("/:id/carrinho", autenticar, adicionarAoCarrinho);
// Remover peça do carrinho
router.delete("/:id/carrinho/:pecaId", autenticar, removerDoCarrinho);

export default router;
