import { Op } from "sequelize";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import { resolverContextoExecucaoSemanal } from "../utils/roteiroExecucaoSemanal.js";

export const getStatusDiario = async (req, res) => {
  try {
    const { maquinaId, roteiroId } = req.query;
    if (!maquinaId || !roteiroId) {
      return res
        .status(400)
        .json({ error: "Parâmetros obrigatórios: maquinaId, roteiroId" });
    }
    const contextoExecucao = await resolverContextoExecucaoSemanal(roteiroId);
    if (!contextoExecucao.emAndamento && !contextoExecucao.finalizadoNaSemana) {
      return res.json({ concluida: false });
    }

    const status = await MovimentacaoStatusDiario.findOne({
      where: {
        maquina_id: maquinaId,
        roteiro_id: roteiroId,
        concluida: true,
        data: {
          [Op.gte]: contextoExecucao.dataInicio,
        },
      },
    });
    res.json({ concluida: !!(status && status.concluida) });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar status diário" });
  }
};
