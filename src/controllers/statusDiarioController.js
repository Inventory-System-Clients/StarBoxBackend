import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

export const getStatusDiario = async (req, res) => {
  try {
    const { maquinaId, roteiroId } = req.query;
    if (!maquinaId || !roteiroId) {
      return res
        .status(400)
        .json({ error: "Parâmetros obrigatórios: maquinaId, roteiroId" });
    }
    const status = await MovimentacaoStatusDiario.findOne({
      where: {
        maquina_id: maquinaId,
        roteiro_id: roteiroId,
        concluida: true,
      },
    });
    res.json({ concluida: !!(status && status.concluida) });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar status diário" });
  }
};
