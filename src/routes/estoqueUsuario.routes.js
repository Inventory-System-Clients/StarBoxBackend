import express from "express";
import {
  listarMeuEstoqueUsuario,
  listarMeusAlertasEstoqueUsuario,
  listarEstoqueUsuario,
  listarAlertasEstoqueUsuario,
  listarEstoquesUsuarios,
  listarUsuariosDisponiveisEstoque,
  listarMovimentacoesEstoqueUsuario,
  movimentarEstoqueUsuario,
  criarOuAtualizarProdutoEstoqueUsuario,
  atualizarEstoqueUsuario,
  atualizarVariosEstoquesUsuario,
  deletarEstoqueUsuario,
} from "../controllers/estoqueUsuarioController.js";
import { autenticar, autorizar, registrarLog } from "../middlewares/auth.js";

const router = express.Router();

router.get("/me", autenticar, listarMeuEstoqueUsuario);
router.get("/me/alertas", autenticar, listarMeusAlertasEstoqueUsuario);

router.get(
  "/",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  listarEstoquesUsuarios,
);

router.get(
  "/usuarios",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  listarUsuariosDisponiveisEstoque,
);

router.get(
  "/movimentacoes",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  listarMovimentacoesEstoqueUsuario,
);

router.get("/:usuarioId/alertas", autenticar, listarAlertasEstoqueUsuario);
router.get("/:usuarioId", autenticar, listarEstoqueUsuario);

router.post(
  "/:usuarioId/varios",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  registrarLog("ATUALIZAR_VARIOS_ESTOQUES_USUARIO", "EstoqueUsuario"),
  atualizarVariosEstoquesUsuario,
);

router.put(
  "/:usuarioId/varios",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  registrarLog("ATUALIZAR_VARIOS_ESTOQUES_USUARIO", "EstoqueUsuario"),
  atualizarVariosEstoquesUsuario,
);

router.post(
  "/:usuarioId/movimentar",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  registrarLog("MOVIMENTAR_ESTOQUE_USUARIO", "EstoqueUsuario"),
  movimentarEstoqueUsuario,
);

router.post(
  "/:usuarioId",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  registrarLog("CRIAR_ATUALIZAR_ESTOQUE_USUARIO", "EstoqueUsuario"),
  criarOuAtualizarProdutoEstoqueUsuario,
);

router.put(
  "/:usuarioId/:produtoId",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  registrarLog("ATUALIZAR_ESTOQUE_USUARIO", "EstoqueUsuario"),
  atualizarEstoqueUsuario,
);

router.delete(
  "/:usuarioId/:produtoId",
  autenticar,
  autorizar(["ADMIN", "CONTROLADOR_ESTOQUE"]),
  registrarLog("DELETAR_ESTOQUE_USUARIO", "EstoqueUsuario"),
  deletarEstoqueUsuario,
);

export default router;
