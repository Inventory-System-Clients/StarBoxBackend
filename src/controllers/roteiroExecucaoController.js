import { Op } from "sequelize";
import { Roteiro, Loja, Maquina } from "../models/index.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

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

    // Buscar status diário das máquinas para o roteiro e data de hoje
    const dataHoje = new Date().toISOString().slice(0, 10);
    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: {
        roteiro_id: roteiro.id,
        data: dataHoje,
        concluida: true,
      },
    });
    const maquinasFinalizadas = new Set(statusMaquinas.map((s) => s.maquina_id));

    let roteiroFinalizado = true;
    const lojas = roteiro.lojas.map((loja) => {
      let lojaFinalizada = true;
      // Movimentações consideradas para esta loja
      const movimentacoesLoja = statusMaquinas.filter(s => {
        return loja.maquinas.some(m => m.id === s.maquina_id);
      });
      console.log(`[Status Loja] ${loja.nome} - Movimentações consideradas:`, movimentacoesLoja);
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
        movimentacoesConsideradas: movimentacoesLoja.map(s => ({
          maquina_id: s.maquina_id,
          roteiro_id: s.roteiro_id,
          data: s.data,
          concluida: s.concluida
        }))
      };
    });
    res.json({
      id: roteiro.id,
      nome: roteiro.nome,
      status: roteiroFinalizado ? "finalizado" : "pendente",
      lojas,
      movimentacoesHoje: statusMaquinas.map(s => ({
        maquina_id: s.maquina_id,
        roteiro_id: s.roteiro_id,
        data: s.data,
        concluida: s.concluida
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar execução do roteiro" });
  }
}
