// utils/resetRoteiros.js
import { Op } from "sequelize";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import RoteiroFinalizacaoDiaria from "../models/RoteiroFinalizacaoDiaria.js";
import RoteiroExecucaoSemanal from "../models/RoteiroExecucaoSemanal.js";

// Reseta o status semanal dos roteiros

export async function resetarRoteirosDiarios() {
  try {
    const hoje = new Date();
    const ehDomingo = hoje.getDay() === 0;
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    // Limpa apenas status de máquinas com mais de 7 dias (preserva a semana atual)
    await MovimentacaoStatusDiario.destroy({ where: { data: { [Op.lt]: seteDiasAtras } } });

    // Limpa finalizações manuais dos roteiros com mais de 7 dias
    await RoteiroFinalizacaoDiaria.destroy({ where: { data: { [Op.lt]: seteDiasAtras } } });

    if (ehDomingo) {
      await MovimentacaoStatusDiario.destroy({ where: {} });
      await RoteiroFinalizacaoDiaria.destroy({ where: {} });
      await RoteiroExecucaoSemanal.update(
        { emAndamento: false, finalizadoEm: new Date() },
        { where: { emAndamento: true } },
      );
    }

    console.log("🔄 Status semanais de roteiros resetados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao resetar status semanal dos roteiros:", error);
  }
}
