import express from "express";
import { autenticar } from "../middlewares/auth.js";
import {
  listarFluxoCaixa,
  obterFluxoCaixa,
  atualizarFluxoCaixa,
  resumoFluxoCaixa,
  obterFluxoPorMovimentacao,
} from "../controllers/fluxoCaixaController.js";

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(autenticar);

// Listar todos os registros de fluxo de caixa
// GET /api/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31&lojaId=uuid&status=pendente
router.get("/", listarFluxoCaixa);

// Obter resumo/estatísticas
// GET /api/fluxo-caixa/resumo?dataInicio=2026-01-01&dataFim=2026-01-31&lojaId=uuid
router.get("/resumo", resumoFluxoCaixa);

// Obter um registro específico
// GET /api/fluxo-caixa/:id
router.get("/:id", obterFluxoCaixa);

// Obter fluxo de caixa por movimentação
// GET /api/fluxo-caixa/movimentacao/:movimentacaoId
router.get("/movimentacao/:movimentacaoId", obterFluxoPorMovimentacao);

// Atualizar conferência (apenas admin)
// PUT /api/fluxo-caixa/:id
router.put("/:id", atualizarFluxoCaixa);

export default router;
