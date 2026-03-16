import express from "express";
import {
  registrarMovimentacaoVeiculo,
  listarMovimentacoesVeiculo,
  ultimasMovimentacoesPorVeiculo,
  listarAbastecimentos,
} from "../controllers/movimentacaoVeiculoController.js";
import { autenticar } from "../middlewares/auth.js";

const router = express.Router();

// Buscar últimas movimentações de cada veículo
router.get("/ultimas", ultimasMovimentacoesPorVeiculo);

// Listar apenas abastecimentos
router.get("/abastecimentos", autenticar, listarAbastecimentos);

// Registrar retirada, devolução ou abastecimento
router.post("/", autenticar, registrarMovimentacaoVeiculo);
// Listar movimentações com filtro
router.get("/", autenticar, listarMovimentacoesVeiculo);

export default router;
