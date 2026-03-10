import {
  listarRevisoesPendentes,
  concluirRevisao,
  verificarTodasRevisoes,
  verificarRevisaoPendente,
} from "../services/revisaoVeiculoService.js";

/**
 * GET /revisoes-veiculos
 * Lista todas as revisões pendentes dos veículos
 */
export const listarRevisoes = async (req, res) => {
  try {
    const revisoesPendentes = await listarRevisoesPendentes();
    res.json(revisoesPendentes);
  } catch (error) {
    console.error("[Revisão Controller] Erro ao listar revisões:", error);
    res.status(500).json({ error: "Erro ao listar revisões pendentes" });
  }
};

/**
 * POST /revisoes-veiculos/:veiculoId/concluir
 * Marca revisão como concluída para um veículo
 */
export const marcarRevisaoConcluida = async (req, res) => {
  try {
    const { veiculoId } = req.params;
    const { kmRevisao } = req.body;

    const veiculo = await concluirRevisao(veiculoId, kmRevisao);

    res.json({
      message: "Revisão marcada como concluída",
      veiculo,
    });
  } catch (error) {
    console.error("[Revisão Controller] Erro ao concluir revisão:", error);
    res.status(500).json({ 
      error: error.message || "Erro ao marcar revisão como concluída" 
    });
  }
};

/**
 * POST /revisoes-veiculos/verificar-todas
 * Verifica revisões de todos os veículos manualmente
 */
export const verificarTodas = async (req, res) => {
  try {
    const alertas = await verificarTodasRevisoes();
    
    res.json({
      message: "Verificação de revisões concluída",
      alertasCriados: alertas.length,
      alertas,
    });
  } catch (error) {
    console.error("[Revisão Controller] Erro ao verificar revisões:", error);
    res.status(500).json({ error: "Erro ao verificar revisões" });
  }
};

/**
 * POST /revisoes-veiculos/:veiculoId/verificar
 * Verifica revisão de um veículo específico
 */
export const verificarRevisaoVeiculo = async (req, res) => {
  try {
    const { veiculoId } = req.params;
    
    const alerta = await verificarRevisaoPendente(veiculoId);
    
    if (alerta) {
      res.json({
        message: "Alerta de revisão criado",
        alerta,
      });
    } else {
      res.json({
        message: "Veículo não precisa de revisão no momento",
      });
    }
  } catch (error) {
    console.error("[Revisão Controller] Erro ao verificar revisão:", error);
    res.status(500).json({ error: "Erro ao verificar revisão do veículo" });
  }
};
