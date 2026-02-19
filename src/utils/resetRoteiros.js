// utils/resetRoteiros.js
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

// Zera o status das movimentações diárias para todos os roteiros

export async function resetarRoteirosDiarios() {
  try {
    // Remove todos os status do dia anterior (ou de todos os dias)
    await MovimentacaoStatusDiario.destroy({ where: {} });
    console.log("🔄 Todos os status de movimentação diária foram resetados!");
  } catch (error) {
    console.error("❌ Erro ao resetar status diário dos roteiros:", error);
  }
}
