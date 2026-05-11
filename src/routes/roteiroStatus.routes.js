import express from "express";
import { Roteiro, Loja, Maquina, RoteiroFinalizacaoDiaria } from "../models/index.js";
import { resolverContextoExecucaoSemanal } from "../utils/roteiroExecucaoSemanal.js";
import { obterStatusMaquinasConcluidasDaExecucao } from "../utils/roteiroStatusSemanal.js";

const router = express.Router();

router.get("/:id/status-execucao", async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const contextoExecucao = await resolverContextoExecucaoSemanal(roteiroId);
    const dataHoje = contextoExecucao.dataHoje;
    const dataInicio = contextoExecucao.dataInicio;

    const roteiro = await Roteiro.findByPk(roteiroId, {
      include: [
        {
          model: Loja,
          as: "lojas",
          include: [{ model: Maquina, as: "maquinas" }],
        },
      ],
    });

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro nao encontrado" });
    }

    const maquinaIdsRota = roteiro.lojas.flatMap((loja) =>
      (loja.maquinas || []).map((maquina) => maquina.id),
    );

    const { maquinasConcluidas } = await obterStatusMaquinasConcluidasDaExecucao({
      roteiroId,
      dataInicio,
      maquinaIds: maquinaIdsRota,
    });

    const lojas = roteiro.lojas.map((loja) => {
      const maquinas = loja.maquinas.map((maquina) => {
        const concluida = maquinasConcluidas.has(maquina.id);
        return {
          id: maquina.id,
          nome: maquina.nome,
          status: concluida ? "finalizado" : "pendente",
        };
      });

      const lojaFinalizada = maquinas.some(
        (maquina) => maquina.status === "finalizado",
      );

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
    const roteiroFinalizadoSemana =
      contextoExecucao.finalizadoNaSemana || Boolean(finalizacaoManual);

    return res.json({
      id: roteiro.id,
      nome: roteiro.nome,
      status: roteiroFinalizadoSemana
        ? "finalizado"
        : contextoExecucao.emAndamento
          ? "em_andamento"
          : "pendente",
      execucaoSemanal: contextoExecucao.execucao
        ? {
            emAndamento: contextoExecucao.emAndamento,
            dataInicio: contextoExecucao.dataInicioBase,
            iniciadoEm: contextoExecucao.execucao.iniciadoEm,
            finalizadoEm: contextoExecucao.emAndamento
              ? null
              : contextoExecucao.execucao.finalizadoEm,
            usuarioId: contextoExecucao.execucao.usuarioId,
          }
        : null,
      data: dataHoje,
      lojas,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao calcular status de execucao" });
  }
});

export default router;
