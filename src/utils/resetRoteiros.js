// utils/resetRoteiros.js
import { Op } from "sequelize";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import RoteiroFinalizacaoDiaria from "../models/RoteiroFinalizacaoDiaria.js";

// Reseta o status semanal dos roteiros

export async function resetarRoteirosDiarios() {
  try {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    // Limpa apenas status de máquinas com mais de 7 dias (preserva a semana atual)
    await MovimentacaoStatusDiario.destroy({ where: { data: { [Op.lt]: seteDiasAtras } } });

    // Limpa finalizações manuais dos roteiros com mais de 7 dias
    await RoteiroFinalizacaoDiaria.destroy({ where: { data: { [Op.lt]: seteDiasAtras } } });

    console.log("🔄 Status semanais de roteiros resetados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao resetar status semanal dos roteiros:", error);
  }
}
