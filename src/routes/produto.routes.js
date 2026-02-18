import express from "express";
import {
  listarProdutos,
  obterProduto,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  listarCategorias,
} from "../controllers/produtoController.js";
import {
  autenticar,
  autorizar,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();


router.get("/", autenticar, listarProdutos);
router.get("/categorias", autenticar, listarCategorias);
router.get("/:id", autenticar, obterProduto);
router.post(
  "/",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("CRIAR_PRODUTO", "Produto"),
  criarProduto
);
router.put(
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("EDITAR_PRODUTO", "Produto"),
  atualizarProduto
);
router.delete(
  "/:id",
  autenticar,
  autorizar(["ADMIN"]),
  registrarLog("DELETAR_PRODUTO", "Produto"),
  deletarProduto
);

export default router;
