import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

export const getStatusDiario = async (req, res) => {
  try {
    const { maquinaId, roteiroId, data } = req.query;
    if (!maquinaId || !roteiroId || !data) {
      return res
        .status(400)
        .json({ error: "Parâmetros obrigatórios: maquinaId, roteiroId, data" });
    }
    const status = await MovimentacaoStatusDiario.findOne({
      where: {
        maquina_id: maquinaId,
        roteiro_id: roteiroId,
        data,
      },
    });
    res.json({ concluida: !!(status && status.concluida) });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar status diário" });
  }
};
