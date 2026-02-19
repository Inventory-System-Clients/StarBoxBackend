import { Op } from "sequelize";
import { Roteiro, Loja, Maquina, Movimentacao } from "../models/index.js";

export async function getRoteiroExecucaoComStatus(req, res) {
  try {
    const roteiro = await Roteiro.findByPk(req.params.id, {
      include: [
        {
          model: Loja,
          as: "lojas",
          attributes: ["id", "nome", "cidade", "estado"],
          include: [
            {
              model: Maquina,
              as: "maquinas",
              attributes: ["id", "nome", "codigo", "tipo", "capacidadePadrao", "lojaId"],
            },
          ],
        },
      ],
    });
    if (!roteiro) return res.status(404).json({ error: "Roteiro não encontrado" });

    // Buscar movimentações do roteiro
    const movimentacoes = await Movimentacao.findAll({
      where: { roteiroId: roteiro.id },
      attributes: ["maquinaId"],
    });
    const maquinasFinalizadas = new Set(movimentacoes.map((m) => m.maquinaId));

    let roteiroFinalizado = true;
    const lojas = roteiro.lojas.map((loja) => {
      let lojaFinalizada = true;
      const maquinas = loja.maquinas.map((maquina) => {
        const finalizada = maquinasFinalizadas.has(maquina.id);
        if (!finalizada) lojaFinalizada = false;
        return {
          id: maquina.id,
          nome: maquina.nome,
          status: finalizada ? "finalizado" : "pendente",
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
      lojas,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar execução do roteiro" });
  }
}
