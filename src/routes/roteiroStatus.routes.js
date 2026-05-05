import express from "express";
import { fn, col, where, Op } from "sequelize";
import { Roteiro, Loja, Maquina, RoteiroFinalizacaoDiaria } from "../models/index.js";
import Movimentacao from "../models/Movimentacao.js";
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

    // Buscar status das máquinas concluídas do dia para o roteiro.
    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: { roteiro_id: roteiroId, concluida: true, data: dataHoje },
    });
    const statusMap = {};
    statusMaquinas.forEach((s) => {
      statusMap[s.maquina_id] = s.concluida;
    });

    const maquinaIdsRota = roteiro.lojas.flatMap((loja) =>
      (loja.maquinas || []).map((maquina) => maquina.id),
    );

    const movimentacoesHoje = maquinaIdsRota.length
      ? await Movimentacao.findAll({
          attributes: ["maquinaId"],
          where: {
            maquinaId: { [Op.in]: maquinaIdsRota },
            [Op.and]: [where(fn("DATE", col("dataColeta")), dataHoje)],
          },
        })
      : [];

    const maquinasComMovimentoHoje = new Set(
      movimentacoesHoje.map((mov) => mov.maquinaId),
    );

    // Montar resposta
    const lojas = roteiro.lojas.map((loja) => {
      let lojaFinalizada = true;
      const maquinas = loja.maquinas.map((maquina) => {
        const concluida =
          statusMap[maquina.id] === true ||
          maquinasComMovimentoHoje.has(maquina.id);
        if (!concluida) lojaFinalizada = false;
        return {
          id: maquina.id,
          nome: maquina.nome,
          status: concluida ? "finalizado" : "pendente",
        };
      });
      return {
        id: loja.id,
        nome: loja.nome,
        status: lojaFinalizada ? "finalizado" : "pendente",
        maquinas,
      };
    });
    const finalizacaoManual = await RoteiroFinalizacaoDiaria.findOne({
      where: {
        roteiroId,
        data: dataHoje,
        finalizado: true,
      },
    });

    res.json({
      id: roteiro.id,
      nome: roteiro.nome,
      status: finalizacaoManual ? "finalizado" : "pendente",
      data: dataHoje,
      lojas,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao calcular status de execução" });
  }
});

export default router;
