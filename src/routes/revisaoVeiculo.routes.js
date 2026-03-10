import { Router } from "express";
import {
  listarRevisoes,
  marcarRevisaoConcluida,
  verificarTodas,
  verificarRevisaoVeiculo,
  reconhecerAlerta,
} from "../controllers/revisaoVeiculoController.js";
import { autenticar } from "../middlewares/auth.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticar);

// Listar revisões pendentes
router.get("/", listarRevisoes);

// Verificar todas as revisões
router.post("/verificar-todas", verificarTodas);

// Verificar revisão de um veículo específico
router.post("/:veiculoId/verificar", verificarRevisaoVeiculo);

// Reconhecer alerta de revisão (marcar como visto)
router.post("/:veiculoId/reconhecer", reconhecerAlerta);

// Marcar revisão como concluída
router.post("/:veiculoId/concluir", marcarRevisaoConcluida);

export default router;
