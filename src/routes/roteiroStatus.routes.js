import express from "express";
import { Roteiro, Loja, Maquina } from "../models/index.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

const router = express.Router();

// Endpoint: Status de execução do roteiro (completo, lojas e máquinas)
router.get("/:id/status-execucao", async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const dataHoje = new Date().toISOString().slice(0, 10);
    const roteiro = await Roteiro.findByPk(roteiroId, {
      include: [
        {
          model: Loja,
          as: "lojas",
          include: [
            {
              model: Maquina,
              as: "maquinas",
            },
          ],
        },
      ],
    });
    if (!roteiro) return res.status(404).json({ error: "Roteiro não encontrado" });

    // Buscar status das máquinas para o roteiro e data
    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: { roteiro_id: roteiroId, data: dataHoje },
    });
    const statusMap = {};
    statusMaquinas.forEach((s) => {
      statusMap[s.maquina_id] = s.concluida;
    });

    // Montar resposta
    let roteiroFinalizado = true;
    const lojas = roteiro.lojas.map((loja) => {
      let lojaFinalizada = true;
      const maquinas = loja.maquinas.map((maquina) => {
        const concluida = statusMap[maquina.id] === true;
        if (!concluida) lojaFinalizada = false;
        return {
          id: maquina.id,
          nome: maquina.nome,
          status: concluida ? "finalizado" : "pendente",
        };
      });
      if (!lojaFinalizada) roteiroFinalizado = false;
      return {
        id: loja.id,
        nome: loja.nome,
        status: lojaFinalizada ? "finalizado" : "pendente",
        maquinas,
      };
    });
    res.json({
      id: roteiro.id,
      nome: roteiro.nome,
      status: roteiroFinalizado ? "finalizado" : "pendente",
      data: dataHoje,
      lojas,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao calcular status de execução" });
  }
});

export default router;
