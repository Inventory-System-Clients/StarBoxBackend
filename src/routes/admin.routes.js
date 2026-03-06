import express from "express";
import { autenticar, autorizar } from "../middlewares/auth.js";
import {
  limparDadosAntigos,
  verificarDadosParaLimpeza,
} from "../utils/dataRetention.js";
import { listarTodosCarrinhos } from "../controllers/carrinhoPecaController.js";

const router = express.Router();

// Verificar quantos dados podem ser excluídos (dry run)
router.get(
  "/verificar-limpeza",
  autenticar,
  autorizar("ADMIN"),
  async (req, res) => {
    try {
      const resultado = await verificarDadosParaLimpeza();
      res.json(resultado);
    } catch (error) {
      console.error("Erro ao verificar limpeza:", error);
      res.status(500).json({ error: "Erro ao verificar dados para limpeza" });
    }
  }
);

// Executar limpeza de dados antigos
router.post(
  "/limpar-dados-antigos",
  autenticar,
  autorizar("ADMIN"),
  async (req, res) => {
    try {
      const resultado = await limparDadosAntigos();
      res.json(resultado);
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      res.status(500).json({ error: "Erro ao executar limpeza de dados" });
    }
  }
);

// Listar todos os carrinhos de funcionários (visão consolidada)
router.get(
  "/carrinhos-funcionarios",
  autenticar,
  autorizar("ADMIN"),
  listarTodosCarrinhos
);

export default router;
