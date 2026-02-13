import { Op, fn, col } from "sequelize";
import { Movimentacao, Maquina } from "../models/index.js";

// Retorna totais de dinheiro e pix para um período e loja
export const totaisDinheiroPix = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : new Date();
    const inicio = dataInicio
      ? new Date(`${dataInicio}T00:00:00`)
      : new Date(new Date().setDate(fim.getDate() - 30));

    // Filtros
    const whereMovimentacao = {
      dataColeta: { [Op.between]: [inicio, fim] },
    };
    if (lojaId) {
      whereMovimentacao["$maquina.lojaId$"] = lojaId;
    }

    // Busca agregada
    const resultado = await Movimentacao.findAll({
      attributes: [
        [fn("SUM", col("quantidade_notas_entrada")), "dinheiro"],
        [fn("SUM", col("valor_entrada_maquininha_pix")), "pix"],
      ],
      include: [
        {
          model: Maquina,
          as: "maquina",
          attributes: [],
        },
      ],
      where: whereMovimentacao,
      raw: true,
    });

    const totais = resultado[0] || {};
    res.json({
      dinheiro: parseFloat(totais.dinheiro || 0),
      pix: parseFloat(totais.pix || 0),
    });
  } catch (error) {
    console.error("Erro ao buscar totais de dinheiro/pix:", error);
    res.status(500).json({ error: "Erro interno ao buscar totais." });
  }
};
