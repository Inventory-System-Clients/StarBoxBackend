import express from "express";
import { Roteiro, Loja, Usuario, Maquina } from "../models/index.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { finalizarRoteiro, criarRoteiro, atualizarDiasSemana } from "../controllers/roteiroController.js";
import { Op, literal } from "sequelize";

const router = express.Router();

// Criar novo roteiro (aceita diasSemana opcionalmente)
router.post("/", autenticar, autorizar("ADMIN"), criarRoteiro);

// Listar roteiros
router.get("/", async (req, res) => {
  try {
    const roteiros = await Roteiro.findAll({
      include: [
        { model: Usuario, as: "funcionario", attributes: ["id", "nome"] },
        { model: Loja, as: "lojas", attributes: ["id", "nome"] },
      ],
    });
    res.json(roteiros);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar roteiros" });
  }
});

// Iniciar roteiro
router.post("/:id/iniciar", async (req, res) => {
  try {
    const { funcionarioId, funcionarioNome } = req.body;
    const roteiro = await Roteiro.findByPk(req.params.id);
    if (!roteiro)
      return res.status(404).json({ error: "Roteiro não encontrado" });
    await roteiro.update({ funcionarioId, funcionarioNome });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao iniciar roteiro" });
  }
});

router.post("/:id/finalizar", autenticar, finalizarRoteiro);

// Mover loja entre roteiros
router.post("/mover-loja", async (req, res) => {
  try {
    const { lojaId, roteiroOrigemId, roteiroDestinoId } = req.body;
    const roteiroDestino = await Roteiro.findByPk(roteiroDestinoId);
    if (!roteiroDestino)
      return res
        .status(404)
        .json({ error: "Roteiro de destino não encontrado" });

    if (roteiroOrigemId) {
      const roteiroOrigem = await Roteiro.findByPk(roteiroOrigemId);
      if (!roteiroOrigem)
        return res
          .status(404)
          .json({ error: "Roteiro de origem não encontrado" });
      await roteiroOrigem.removeLoja(lojaId);
    }
    await roteiroDestino.addLoja(lojaId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao mover/adicionar loja" });
  }
});

// Atualizar campos do roteiro (diasSemana, nome) — apenas ADMIN
router.patch("/:id", autenticar, autorizar("ADMIN"), atualizarDiasSemana);

// Roteiros do dia corrente: GET /roteiros/do-dia?dia=SEG
router.get("/do-dia", autenticar, async (req, res) => {
  try {
    const DIAS_VALIDOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
    const { dia } = req.query;
    if (!dia || !DIAS_VALIDOS.includes(dia.toUpperCase()))
      return res.status(400).json({
        error: `Parâmetro 'dia' obrigatório. Use um de: ${DIAS_VALIDOS.join(", ")}`,
      });
    const diaUpper = dia.toUpperCase();
    const roteiros = await Roteiro.findAll({
      where: literal(`"Roteiros"."dias_semana"::jsonb @> '"${diaUpper}"'`),
      include: [
        { model: Usuario, as: "funcionario", attributes: ["id", "nome"] },
        { model: Loja, as: "lojas", attributes: ["id", "nome"] },
      ],
    });
    res.json(roteiros);
  } catch (error) {
    console.error("Erro ao filtrar roteiros por dia:", error);
    res.status(500).json({ error: "Erro ao filtrar roteiros por dia" });
  }
});

// Endpoint para buscar todos os roteiros com status
import { getTodosRoteirosComStatus } from "../controllers/roteiroExecucaoController.js";
router.get("/com-status", getTodosRoteirosComStatus);

// Página de execução de roteiro: retorna lojas e máquinas do roteiro
import { getRoteiroExecucaoComStatus } from "../controllers/roteiroExecucaoController.js";

router.get("/:id/executar", getRoteiroExecucaoComStatus);

export default router;
