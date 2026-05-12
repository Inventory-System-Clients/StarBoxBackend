// utils/resetRoteiros.js
import { Op } from "sequelize";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import RoteiroFinalizacaoDiaria from "../models/RoteiroFinalizacaoDiaria.js";
import RoteiroExecucaoSemanal from "../models/RoteiroExecucaoSemanal.js";
import {
  getFaixaSemanaAtualUtc,
  isHorarioResetSemanalSaoPaulo,
} from "./roteiroExecucaoSemanal.js";

export async function resetarRoteirosDiarios() {
  try {
    const agora = new Date();
    const deveResetarSemana = isHorarioResetSemanalSaoPaulo(agora);
    const { inicioSemana } = getFaixaSemanaAtualUtc(agora);

    // Mantem o ciclo atual intacto; remove apenas residuos de ciclos anteriores.
    await MovimentacaoStatusDiario.destroy({
      where: { data: { [Op.lt]: inicioSemana } },
    });

    await RoteiroFinalizacaoDiaria.destroy({
      where: { data: { [Op.lt]: inicioSemana } },
    });

    if (deveResetarSemana) {
      await MovimentacaoStatusDiario.destroy({ where: {} });
      await RoteiroFinalizacaoDiaria.destroy({ where: {} });
      await RoteiroExecucaoSemanal.update(
        {
          emAndamento: false,
          finalizadoEm: null,
          veiculoId: null,
          kmInicialVeiculo: null,
          kmInicialRegistradoEm: null,
        },
        { where: {} },
      );
    }

    console.log(
      deveResetarSemana
        ? "Status semanais de roteiros resetados com sucesso!"
        : "Limpeza de dados antigos de roteiros concluida; ciclo atual preservado.",
    );
  } catch (error) {
    console.error("Erro ao resetar status semanal dos roteiros:", error);
  }
}
