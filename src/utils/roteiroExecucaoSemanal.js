import RoteiroExecucaoSemanal from "../models/RoteiroExecucaoSemanal.js";

export const getDataHoje = () => {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const porTipo = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${porTipo.year}-${porTipo.month}-${porTipo.day}`;
};

export const getFaixaSemanaAtualUtc = () => {
  const referencia = new Date();
  const inicioSemana = new Date(referencia);
  inicioSemana.setUTCDate(inicioSemana.getUTCDate() - inicioSemana.getUTCDay());
  inicioSemana.setUTCHours(0, 0, 0, 0);

  const fimSemana = new Date(inicioSemana);
  fimSemana.setUTCDate(fimSemana.getUTCDate() + 6);
  fimSemana.setUTCHours(23, 59, 59, 999);

  return {
    inicio: inicioSemana,
    fim: fimSemana,
    inicioSemana: inicioSemana.toISOString().slice(0, 10),
    fimSemana: fimSemana.toISOString().slice(0, 10),
  };
};

export const isFinalizadoNaSemana = (execucao) => {
  if (!execucao?.finalizadoEm) return false;

  const { inicio, fim } = getFaixaSemanaAtualUtc();
  const dataFinalizacao = new Date(execucao.finalizadoEm);

  return dataFinalizacao >= inicio && dataFinalizacao <= fim;
};

export const resolverContextoExecucaoSemanal = async (roteiroId) => {
  const dataHoje = getDataHoje();

  if (!roteiroId) {
    return {
      dataHoje,
      dataInicio: dataHoje,
      dataInicioBase: dataHoje,
      emAndamento: false,
      finalizadoNaSemana: false,
      execucao: null,
    };
  }

  const execucao = await RoteiroExecucaoSemanal.findOne({ where: { roteiroId } });
  const dataInicioBase = execucao?.dataInicio
    ? String(execucao.dataInicio)
    : dataHoje;
  const emAndamento = Boolean(execucao?.emAndamento);
  const finalizadoNaSemana = isFinalizadoNaSemana(execucao);
  const usarDataInicio = execucao && (emAndamento || finalizadoNaSemana);

  return {
    dataHoje,
    dataInicio: usarDataInicio ? dataInicioBase : dataHoje,
    dataInicioBase,
    emAndamento,
    finalizadoNaSemana,
    execucao,
  };
};
