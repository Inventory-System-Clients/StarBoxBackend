import { Op } from "sequelize";
import Movimentacao from "../models/Movimentacao.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

export const getDataSaoPaulo = (data = new Date()) => {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const porTipo = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${porTipo.year}-${porTipo.month}-${porTipo.day}`;
};

const getInicioDiaSaoPaulo = (data) => new Date(`${data}T00:00:00-03:00`);

export const registrarMaquinaConcluidaNaExecucao = async ({
  maquinaId,
  roteiroId,
  data = new Date(),
}) => {
  if (!maquinaId || !roteiroId) return null;

  const dataStatus = getDataSaoPaulo(data);

  return MovimentacaoStatusDiario.upsert({
    maquina_id: maquinaId,
    roteiro_id: roteiroId,
    data: dataStatus,
    concluida: true,
  });
};

export const obterStatusMaquinasConcluidasDaExecucao = async ({
  roteiroId,
  dataInicio,
  maquinaIds = [],
}) => {
  if (!roteiroId || !dataInicio) {
    return {
      statusMaquinas: [],
      movimentacoesConsideradas: [],
      maquinasConcluidas: new Set(),
    };
  }

  const statusMaquinas = await MovimentacaoStatusDiario.findAll({
    where: {
      roteiro_id: roteiroId,
      concluida: true,
      data: {
        [Op.gte]: dataInicio,
      },
    },
  });

  const whereMovimentacao = {
    roteiroId,
    dataColeta: {
      [Op.gte]: getInicioDiaSaoPaulo(dataInicio),
    },
  };

  if (maquinaIds.length > 0) {
    whereMovimentacao.maquinaId = { [Op.in]: maquinaIds };
  }

  const movimentacoesConsideradas = await Movimentacao.findAll({
    attributes: ["maquinaId", "roteiroId", "dataColeta"],
    where: whereMovimentacao,
  });

  const maquinasConcluidas = new Set(statusMaquinas.map((item) => item.maquina_id));
  movimentacoesConsideradas.forEach((movimentacao) => {
    if (movimentacao.maquinaId) {
      maquinasConcluidas.add(movimentacao.maquinaId);
    }
  });

  return {
    statusMaquinas,
    movimentacoesConsideradas,
    maquinasConcluidas,
  };
};
