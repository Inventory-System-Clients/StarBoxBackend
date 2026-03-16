import { Veiculo, WhatsAppAlerta } from "../models/index.js";

const INTERVALO_REVISAO_PADRAO_KM = 10000;

const normalizarKmNaoNegativo = (valor, fallback = 0) => {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero) || numero < 0) return fallback;
  return numero;
};

const obterIntervaloRevisaoKm = (veiculo) => {
  const intervalo = Number.parseInt(veiculo?.intervaloRevisaoKm, 10);
  if (!Number.isFinite(intervalo) || intervalo <= 0) {
    return INTERVALO_REVISAO_PADRAO_KM;
  }
  return intervalo;
};

const calcularProximaRevisaoPorIntervalo = (kmAtual, intervaloRevisaoKm) => {
  const kmSeguro = normalizarKmNaoNegativo(kmAtual, 0);
  return (Math.floor(kmSeguro / intervaloRevisaoKm) + 1) * intervaloRevisaoKm;
};

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

    const kmAtual = normalizarKmNaoNegativo(veiculo.km, 0);
    const intervaloRevisaoKm = obterIntervaloRevisaoKm(veiculo);
    const proximaRevisaoKm =
      veiculo.proximaRevisaoKm && veiculo.proximaRevisaoKm > 0
        ? veiculo.proximaRevisaoKm
        : calcularProximaRevisaoPorIntervalo(kmAtual, intervaloRevisaoKm);
    
    // Se não atingiu a quilometragem de revisão, não faz nada
    if (kmAtual < proximaRevisaoKm) {
      return null;
    }

    // Calcular quantas revisões foram puladas
    const revisoesPassadas =
      Math.floor(kmAtual / intervaloRevisaoKm) * intervaloRevisaoKm;
    const novaProximaRevisao = revisoesPassadas + intervaloRevisaoKm;

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
    const mensagem = `🔧 REVISÃO PENDENTE\n\nVeículo: ${veiculo.nome} (${veiculo.modelo})\nKM Atual: ${kmAtual.toLocaleString('pt-BR')}\nIntervalo configurado: ${intervaloRevisaoKm.toLocaleString('pt-BR')} km\nRevisão deveria ter sido feita aos: ${revisoesPassadas.toLocaleString('pt-BR')} km\n\nPróxima revisão: ${novaProximaRevisao.toLocaleString('pt-BR')} km`;

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
        intervaloRevisaoKm,
        kmRevisaoDevida: revisoesPassadas,
        proximaRevisaoKm: novaProximaRevisao,
      },
    });

    // Apenas ativa o alerta visual, NÃO atualiza proximaRevisaoKm automaticamente
    await veiculo.update({
      alertaRevisaoPendente: true, // Ativar alerta visual
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
      const kmAtual = normalizarKmNaoNegativo(veiculo.km, 0);
      const intervaloRevisaoKm = obterIntervaloRevisaoKm(veiculo);
      const proximaRevisaoKm =
        veiculo.proximaRevisaoKm && veiculo.proximaRevisaoKm > 0
          ? veiculo.proximaRevisaoKm
          : calcularProximaRevisaoPorIntervalo(kmAtual, intervaloRevisaoKm);

      // Se passou da quilometragem de revisão
      if (kmAtual >= proximaRevisaoKm) {
        const revisoesAtrasadas =
          Math.floor(kmAtual / intervaloRevisaoKm) * intervaloRevisaoKm;
        
        revisoesPendentes.push({
          veiculoId: veiculo.id,
          veiculoNome: veiculo.nome,
          veiculoModelo: veiculo.modelo,
          kmAtual,
          intervaloRevisaoKm,
          kmRevisaoDevida: revisoesAtrasadas,
          proximaRevisaoKm: revisoesAtrasadas + intervaloRevisaoKm,
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
 * Reconhecer alerta de revisão (marcar como visto pelo usuário)
 */
export const reconhecerAlertaRevisao = async (veiculoId) => {
  try {
    const veiculo = await Veiculo.findByPk(veiculoId);
    
    if (!veiculo) {
      throw new Error("Veículo não encontrado");
    }

    await veiculo.update({
      alertaRevisaoPendente: false,
    });

    console.log(`[Revisão] Alerta reconhecido para veículo ${veiculo.nome}`);
    
    return veiculo;
  } catch (error) {
    console.error("[Revisão] Erro ao reconhecer alerta:", error);
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

    const intervaloRevisaoKm = obterIntervaloRevisaoKm(veiculo);
    const kmBaseRevisao = normalizarKmNaoNegativo(kmRevisao, veiculo.km);
    const proximaRevisao =
      (Math.floor(kmBaseRevisao / intervaloRevisaoKm) + 1) *
      intervaloRevisaoKm;

    await veiculo.update({
      ultimaRevisaoKm: kmBaseRevisao,
      proximaRevisaoKm: proximaRevisao,
      alertaRevisaoPendente: false,
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
