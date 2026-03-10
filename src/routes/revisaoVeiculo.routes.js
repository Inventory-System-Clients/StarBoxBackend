import { Router } from "express";
import {
  listarRevisoes,
  marcarRevisaoConcluida,
  verificarTodas,
  verificarRevisaoVeiculo,
} from "../controllers/revisaoVeiculoController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar revisões pendentes
router.get("/", listarRevisoes);

// Verificar todas as revisões
router.post("/verificar-todas", verificarTodas);

// Verificar revisão de um veículo específico
router.post("/:veiculoId/verificar", verificarRevisaoVeiculo);

// Marcar revisão como concluída
router.post("/:veiculoId/concluir", marcarRevisaoConcluida);

export default router;
