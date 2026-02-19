import express from "express";
import { Roteiro, Loja, Usuario, Maquina } from "../models/index.js";

const router = express.Router();

// Criar novo roteiro
router.post("/", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
    const roteiro = await Roteiro.create({ nome });
    res.status(201).json(roteiro);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar roteiro" });
  }
});

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

// Página de execução de roteiro: retorna lojas e máquinas do roteiro
import { getRoteiroExecucaoComStatus } from "../controllers/roteiroExecucaoController.js";

router.get("/:id/executar", getRoteiroExecucaoComStatus);

export default router;
