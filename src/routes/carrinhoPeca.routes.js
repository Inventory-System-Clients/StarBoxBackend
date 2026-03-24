import express from "express";
import {
  listarCarrinho,
  adicionarAoCarrinho,
  removerDoCarrinho,
  devolverPecaDoCarrinho,
} from "../controllers/carrinhoPecaController.js";
import { listarPecasDefeituosasUsuario } from "../controllers/pecaDefeituosaController.js";
import { autenticar } from "../middlewares/auth.js";

const router = express.Router();

// Listar peças do carrinho do usuário
router.get("/:id/carrinho", autenticar, listarCarrinho);
// Adicionar peça ao carrinho
router.post("/:id/carrinho", autenticar, adicionarAoCarrinho);
// Remover peça do carrinho
router.delete("/:id/carrinho/:pecaId", autenticar, removerDoCarrinho);

// Devolver peça do carrinho (remove do carrinho e devolve ao estoque)
router.patch("/:id/carrinho/:pecaId/devolver", autenticar, devolverPecaDoCarrinho);

// Listar pecas defeituosas (pendentes e na base) do usuario
router.get("/:id/pecas-defeituosas", autenticar, listarPecasDefeituosasUsuario);

export default router;
