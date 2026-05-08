import { resolverContextoExecucaoSemanal } from "../utils/roteiroExecucaoSemanal.js";
import { obterStatusMaquinasConcluidasDaExecucao } from "../utils/roteiroStatusSemanal.js";

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

    const { maquinasConcluidas } = await obterStatusMaquinasConcluidasDaExecucao({
      roteiroId,
      dataInicio: contextoExecucao.dataInicio,
      maquinaIds: [maquinaId],
    });
    res.json({ concluida: maquinasConcluidas.has(maquinaId) });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar status diário" });
  }
};
