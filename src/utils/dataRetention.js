import { Movimentacao, LogAtividade } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Limpa dados com mais de 1 ano (365 dias)
 * Mantém apenas os últimos 365 dias de histórico
 */
export const limparDadosAntigos = async () => {
  try {
    const umAnoAtras = new Date();
    umAnoAtras.setDate(umAnoAtras.getDate() - 365);

    console.log(
      `🗑️  Iniciando limpeza de dados anteriores a ${umAnoAtras.toISOString()}`
    );

    // Limpar movimentações antigas (> 1 ano)
    const movimentacoesExcluidas = await Movimentacao.destroy({
      where: {
        dataColeta: {
          [Op.lt]: umAnoAtras,
        },
      },
    });

    // Limpar logs de atividade antigos (> 1 ano)
    const logsExcluidos = await LogAtividade.destroy({
      where: {
        createdAt: {
          [Op.lt]: umAnoAtras,
        },
      },
    });

    const resultado = {
      sucesso: true,
      dataLimite: umAnoAtras,
      movimentacoesExcluidas,
      logsExcluidos,
      totalExcluido: movimentacoesExcluidas + logsExcluidos,
    };

    console.log(`✅ Limpeza concluída:`);
    console.log(`   - ${movimentacoesExcluidas} movimentações excluídas`);
    console.log(`   - ${logsExcluidos} logs excluídos`);
    console.log(`   - Total: ${resultado.totalExcluido} registros removidos`);

    return resultado;
  } catch (error) {
    console.error("❌ Erro ao limpar dados antigos:", error);
    throw error;
  }
};

/**
 * Verifica quantos registros seriam excluídos (dry run)
 */
export const verificarDadosParaLimpeza = async () => {
  try {
    const umAnoAtras = new Date();
    umAnoAtras.setDate(umAnoAtras.getDate() - 365);

    const movimentacoesAntigas = await Movimentacao.count({
      where: {
        dataColeta: {
          [Op.lt]: umAnoAtras,
        },
      },
    });

    const logsAntigos = await LogAtividade.count({
      where: {
        createdAt: {
          [Op.lt]: umAnoAtras,
        },
      },
    });

    return {
      dataLimite: umAnoAtras,
      movimentacoesParaExcluir: movimentacoesAntigas,
      logsParaExcluir: logsAntigos,
      totalParaExcluir: movimentacoesAntigas + logsAntigos,
    };
  } catch (error) {
    console.error("Erro ao verificar dados para limpeza:", error);
    throw error;
  }
};
