import express from "express";
import {
  listarUsuarios,
  obterUsuario,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  reativarUsuario,
} from "../controllers/usuarioController.js";
import {
  autenticar,
  autorizarRole,
  registrarLog,
} from "../middlewares/auth.js";

const router = express.Router();

// Todas as rotas requerem autenticação e role ADMIN
router.use(autenticar, autorizarRole("ADMIN"));

router.get("/", listarUsuarios);
router.get("/:id", obterUsuario);
router.post("/", registrarLog("CRIAR_USUARIO", "Usuario"), criarUsuario);
router.put("/:id", registrarLog("EDITAR_USUARIO", "Usuario"), atualizarUsuario);
router.delete(
  "/:id",
  registrarLog("DELETAR_USUARIO", "Usuario"),
  deletarUsuario
);
router.patch(
  "/:id/reativar",
  registrarLog("REATIVAR_USUARIO", "Usuario"),
  reativarUsuario
);

export default router;
