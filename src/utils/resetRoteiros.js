// utils/resetRoteiros.js
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import RoteiroFinalizacaoDiaria from "../models/RoteiroFinalizacaoDiaria.js";

// Reseta o status semanal dos roteiros

export async function resetarRoteirosDiarios() {
  try {
    // Limpa status de máquinas concluídas
    await MovimentacaoStatusDiario.destroy({ where: {} });

    // Limpa finalizações manuais dos roteiros
    await RoteiroFinalizacaoDiaria.destroy({ where: {} });

    console.log("🔄 Status semanais de roteiros resetados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao resetar status semanal dos roteiros:", error);
  }
}
