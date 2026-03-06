import express from "express";
import {
  listarPecas,
  criarPeca,
  atualizarPeca,
  excluirPeca,
} from "../controllers/pecaController.js";
import {
  adicionarAoCarrinho,
  removerDoCarrinho,
} from "../controllers/carrinhoPecaController.js";
import { autenticar, autorizar } from "../middlewares/auth.js";

const router = express.Router();

// Listar todas as peças (sem autenticação para integração inicial)
router.get("/public", listarPecas);
// Listar todas as peças (qualquer usuário autenticado)
router.get("/", autenticar, listarPecas);

// ========== ROTAS DE CARRINHO (devem vir ANTES das rotas /:id) ==========
// Adicionar peça ao carrinho do usuário logado (FUNCIONARIO, GERENCIADOR, ADMIN)
router.post("/:pecaId/carrinho", autenticar, async (req, res) => {
  // Adiciona o ID do usuário logado aos params para reutilizar a função existente
  req.params.id = req.usuario.id;
  req.body.pecaId = req.params.pecaId; // Garantir que pecaId está no body
  return adicionarAoCarrinho(req, res);
});

// Remover peça do carrinho do usuário logado (FUNCIONARIO, GERENCIADOR, ADMIN)
router.delete("/:pecaId/carrinho", autenticar, async (req, res) => {
  req.params.id = req.usuario.id;
  return removerDoCarrinho(req, res);
});

// ========== ROTAS DE CRUD DE PEÇAS ==========
// Cadastrar nova peça (ADMIN, GERENCIADOR, FUNCIONARIO)
router.post("/", autenticar, autorizar(["ADMIN", "GERENCIADOR", "FUNCIONARIO"]), criarPeca);
// Editar peça (ADMIN, GERENCIADOR, FUNCIONARIO)
router.put(
  "/:id",
  autenticar,
  autorizar(["ADMIN", "GERENCIADOR", "FUNCIONARIO"]),
  atualizarPeca,
);
// Excluir peça (ADMIN, GERENCIADOR, FUNCIONARIO)
router.delete(
  "/:id",
  autenticar,
  autorizar(["ADMIN", "GERENCIADOR", "FUNCIONARIO"]),
  excluirPeca,
);

export default router;
