import { Veiculo, WhatsAppAlerta } from "../models/index.js";

/**
 * Verifica se o veículo atingiu ou passou da quilometragem de revisão
 * e gera alertas se necessário
 */
export const verificarRevisaoPendente = async (veiculoId) => {
  try {
    const veiculo = await Veiculo.findByPk(veiculoId);
    
    if (!veiculo) {
      console.log(`[Revisão] Veículo ${veiculoId} não encontrado`);
      return null;
    }

    const kmAtual = veiculo.km || 0;
    const proximaRevisaoKm = veiculo.proximaRevisaoKm || 0;
    
    // Se não atingiu a quilometragem de revisão, não faz nada
    if (kmAtual < proximaRevisaoKm) {
      return null;
    }

    // Calcular quantas revisões foram puladas
    const revisoesPassadas = Math.floor(kmAtual / 10000) * 10000;
    const novaProximaRevisao = revisoesPassadas + 10000;

    // Verificar se já existe alerta pendente para este veículo
    const alertaExistente = await WhatsAppAlerta.findOne({
      where: {
        tipo: "revisao_veiculo",
        referenciaTipo: "veiculo",
        referenciaId: veiculoId,
        status: "pendente",
      },
    });

    // Se já existe alerta pendente, não precisa criar outro
    if (alertaExistente) {
      console.log(`[Revisão] Alerta já existe para veículo ${veiculo.nome}`);
      return alertaExistente;
    }

    // Criar alerta de revisão pendente
    const mensagem = `🔧 REVISÃO PENDENTE\n\nVeículo: ${veiculo.nome} (${veiculo.modelo})\nKM Atual: ${kmAtual.toLocaleString('pt-BR')}\nRevisão deveria ter sido feita aos: ${revisoesPassadas.toLocaleString('pt-BR')} km\n\nPróxima revisão: ${novaProximaRevisao.toLocaleString('pt-BR')} km`;

    const alerta = await WhatsAppAlerta.create({
      tipo: "revisao_veiculo",
      mensagem,
      status: "pendente",
      referenciaTipo: "veiculo",
      referenciaId: veiculoId,
      metadata: {
        veiculoNome: veiculo.nome,
        veiculoModelo: veiculo.modelo,
        kmAtual,
        kmRevisaoDevida: revisoesPassadas,
        proximaRevisaoKm: novaProximaRevisao,
      },
    });

    // Atualizar próxima revisão do veículo
    await veiculo.update({
      proximaRevisaoKm: novaProximaRevisao,
    });

    console.log(`[Revisão] Alerta criado para veículo ${veiculo.nome} - KM ${kmAtual}`);
    
    return alerta;
  } catch (error) {
    console.error("[Revisão] Erro ao verificar revisão pendente:", error);
    throw error;
  }
};

/**
 * Listar todas as revisões pendentes
 */
export const listarRevisoesPendentes = async () => {
  try {
    const veiculos = await Veiculo.findAll();
    const revisoesPendentes = [];

    for (const veiculo of veiculos) {
      const kmAtual = veiculo.km || 0;
      const proximaRevisaoKm = veiculo.proximaRevisaoKm || 10000;

      // Se passou da quilometragem de revisão
      if (kmAtual >= proximaRevisaoKm) {
        const revisoesAtrasadas = Math.floor(kmAtual / 10000) * 10000;
        
        revisoesPendentes.push({
          veiculoId: veiculo.id,
          veiculoNome: veiculo.nome,
          veiculoModelo: veiculo.modelo,
          kmAtual,
          kmRevisaoDevida: revisoesAtrasadas,
          proximaRevisaoKm: revisoesAtrasadas + 10000,
          diasAtrasado: Math.floor((kmAtual - revisoesAtrasadas) / 100), // Aproximação
        });
      }
    }

    return revisoesPendentes;
  } catch (error) {
    console.error("[Revisão] Erro ao listar revisões pendentes:", error);
    throw error;
  }
};

/**
 * Marcar revisão como concluída
 */
export const concluirRevisao = async (veiculoId, kmRevisao) => {
  try {
    const veiculo = await Veiculo.findByPk(veiculoId);
    
    if (!veiculo) {
      throw new Error("Veículo não encontrado");
    }

    // Calcular próxima revisão (próximo múltiplo de 10.000)
    const proximaRevisao = Math.ceil(veiculo.km / 10000) * 10000 + 10000;

    await veiculo.update({
      ultimaRevisaoKm: kmRevisao || veiculo.km,
      proximaRevisaoKm: proximaRevisao,
    });

    // Marcar alertas como enviados (resolver)
    await WhatsAppAlerta.update(
      { status: "enviado" },
      {
        where: {
          tipo: "revisao_veiculo",
          referenciaTipo: "veiculo",
          referenciaId: veiculoId,
          status: "pendente",
        },
      }
    );

    console.log(`[Revisão] Revisão concluída para veículo ${veiculo.nome}`);
    
    return veiculo;
  } catch (error) {
    console.error("[Revisão] Erro ao concluir revisão:", error);
    throw error;
  }
};

/**
 * Verificar revisões de todos os veículos (para rodar periodicamente)
 */
export const verificarTodasRevisoes = async () => {
  try {
    const veiculos = await Veiculo.findAll();
    const alertasCriados = [];

    for (const veiculo of veiculos) {
      const alerta = await verificarRevisaoPendente(veiculo.id);
      if (alerta) {
        alertasCriados.push(alerta);
      }
    }

    console.log(`[Revisão] Verificação completa: ${alertasCriados.length} alertas criados`);
    
    return alertasCriados;
  } catch (error) {
    console.error("[Revisão] Erro ao verificar todas revisões:", error);
    throw error;
  }
};
