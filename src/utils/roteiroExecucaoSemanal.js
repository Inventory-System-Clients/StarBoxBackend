import RoteiroExecucaoSemanal from "../models/RoteiroExecucaoSemanal.js";

const TIME_ZONE = "America/Sao_Paulo";

const getPartesSaoPaulo = (data = new Date()) => {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const porTipo = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  const mapaDiaSemana = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    ano: Number.parseInt(porTipo.year, 10),
    mes: Number.parseInt(porTipo.month, 10),
    dia: Number.parseInt(porTipo.day, 10),
    hora: Number.parseInt(porTipo.hour, 10),
    minuto: Number.parseInt(porTipo.minute, 10),
    diaSemana: mapaDiaSemana[porTipo.weekday] ?? 0,
  };
};

const formatarData = (data) => data.toISOString().slice(0, 10);

export const getDataHoje = () => {
  const partes = getPartesSaoPaulo();
  return `${partes.ano}-${String(partes.mes).padStart(2, "0")}-${String(partes.dia).padStart(2, "0")}`;
};

export const isHorarioResetSemanalSaoPaulo = (data = new Date()) => {
  const partes = getPartesSaoPaulo(data);
  return partes.diaSemana === 0 && partes.hora >= 21;
};

export const getFaixaSemanaAtualUtc = (referencia = new Date()) => {
  const partes = getPartesSaoPaulo(referencia);
  const diasDesdeDomingo =
    partes.diaSemana === 0 && partes.hora < 21 ? 7 : partes.diaSemana;
  const dataLocalUtc = new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia));
  dataLocalUtc.setUTCDate(dataLocalUtc.getUTCDate() - diasDesdeDomingo);

  const inicioCicloData = formatarData(dataLocalUtc);
  const inicioSemana = new Date(`${inicioCicloData}T21:00:00-03:00`);
  const fimSemana = new Date(inicioSemana.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  return {
    inicio: inicioSemana,
    fim: fimSemana,
    inicioSemana: inicioCicloData,
    fimSemana: formatarData(fimSemana),
  };
};

export const isFinalizadoNaSemana = (execucao, referencia = new Date()) => {
  if (!execucao?.finalizadoEm) return false;

  const { inicio, fim } = getFaixaSemanaAtualUtc(referencia);
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
