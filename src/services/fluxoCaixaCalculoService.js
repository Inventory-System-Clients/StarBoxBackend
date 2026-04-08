import { Movimentacao } from "../models/index.js";

const possuiNumero = (valor) =>
  valor !== null &&
  valor !== undefined &&
  valor !== "" &&
  !Number.isNaN(Number(valor));

const inteiroOuNull = (valor) => {
  if (!possuiNumero(valor)) return null;
  return parseInt(valor, 10);
};

const decimalOuNull = (valor) => {
  if (!possuiNumero(valor)) return null;
  return Number(valor);
};

const arredondar2 = (valor) => {
  if (!possuiNumero(valor)) return null;
  return Number(Number(valor).toFixed(2));
};

const lerCampo = (obj, campos) => {
  for (const campo of campos) {
    if (obj?.[campo] !== undefined) return obj[campo];
    if (obj?.dataValues?.[campo] !== undefined) return obj.dataValues[campo];
  }
  return undefined;
};

const compararNuloPorUltimo = (a, b) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const normalizarMovimentacao = (mov) => ({
  ...mov,
  id: lerCampo(mov, ["id"]),
  maquinaId: lerCampo(mov, ["maquinaId", "maquina_id"]),
  dataColeta: lerCampo(mov, ["dataColeta", "data_coleta"]),
  createdAt: lerCampo(mov, ["createdAt", "created_at"]),
  contadorIn: lerCampo(mov, ["contadorIn", "contador_in"]),
  contadorInDigital: lerCampo(mov, [
    "contadorInDigital",
    "contador_in_digital",
  ]),
  contadorOut: lerCampo(mov, ["contadorOut", "contador_out"]),
  contadorOutDigital: lerCampo(mov, [
    "contadorOutDigital",
    "contador_out_digital",
  ]),
  contadorInAnterior: lerCampo(mov, [
    "contadorInAnterior",
    "contador_in_anterior",
  ]),
  contadorOutAnterior: lerCampo(mov, [
    "contadorOutAnterior",
    "contador_out_anterior",
  ]),
});

export const extrairContadorAtualMovimentacao = (movimentacao = {}) => {
  const mov = normalizarMovimentacao(movimentacao);
  return {
    contadorInAtual:
      inteiroOuNull(mov.contadorIn) ?? inteiroOuNull(mov.contadorInDigital),
    contadorOutAtual:
      inteiroOuNull(mov.contadorOut) ?? inteiroOuNull(mov.contadorOutDigital),
  };
};

export const extrairContadoresBaseMovimentacao = ({
  movimentacaoAtual,
  ultimoContadorInValido,
  ultimoContadorOutValido,
  contadorInAnteriorFallback = null,
  contadorOutAnteriorFallback = null,
}) => {
  const atual = normalizarMovimentacao(movimentacaoAtual || {});

  const inAnteriorPersistido = inteiroOuNull(atual.contadorInAnterior);
  const outAnteriorPersistido = inteiroOuNull(atual.contadorOutAnterior);
  const inFallback = inteiroOuNull(contadorInAnteriorFallback);
  const outFallback = inteiroOuNull(contadorOutAnteriorFallback);

  const baseIn =
    inAnteriorPersistido !== null
      ? inAnteriorPersistido
      : inFallback !== null
        ? inFallback
        : ultimoContadorInValido;
  const baseOut =
    outAnteriorPersistido !== null
      ? outAnteriorPersistido
      : outFallback !== null
        ? outFallback
        : ultimoContadorOutValido;

  return { baseIn, baseOut };
};

export const ordenarMovimentacoesDeterministico = (movA, movB) => {
  const a = normalizarMovimentacao(movA);
  const b = normalizarMovimentacao(movB);

  const dataA = a.dataColeta ? new Date(a.dataColeta).getTime() : null;
  const dataB = b.dataColeta ? new Date(b.dataColeta).getTime() : null;

  if (dataA !== dataB) {
    if (dataA === null) return 1;
    if (dataB === null) return -1;
    return dataA - dataB;
  }

  const createdA = a.createdAt ? new Date(a.createdAt).getTime() : null;
  const createdB = b.createdAt ? new Date(b.createdAt).getTime() : null;

  if (createdA !== createdB) {
    if (createdA === null) return 1;
    if (createdB === null) return -1;
    return createdA - createdB;
  }

  const contadorInCmp = compararNuloPorUltimo(
    inteiroOuNull(a.contadorIn),
    inteiroOuNull(b.contadorIn),
  );
  if (contadorInCmp !== 0) return contadorInCmp;

  const contadorOutCmp = compararNuloPorUltimo(
    inteiroOuNull(a.contadorOut),
    inteiroOuNull(b.contadorOut),
  );
  if (contadorOutCmp !== 0) return contadorOutCmp;

  const idA = String(a.id || "");
  const idB = String(b.id || "");
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
};

export const calcularEsperadoComHistorico = ({
  movimentacaoAtual,
  historicoMovimentacoes,
  valorFicha,
  contadorInAnteriorFallback = null,
  contadorOutAnteriorFallback = null,
  permitirFallbackDeltaOut = false,
}) => {
  const atual = normalizarMovimentacao(movimentacaoAtual || {});

  if (!atual.maquinaId || !atual.id) {
    return {
      valorEsperadoCalculado: null,
      ultimoContadorInRetirada: null,
      ultimoContadorOutRetirada: null,
      deltaContadorIn: null,
      deltaContadorOut: null,
      algoritmoValorEsperado: null,
    };
  }

  const historicoOrdenado = (historicoMovimentacoes || [])
    .map(normalizarMovimentacao)
    .sort(ordenarMovimentacoesDeterministico);

  const indiceAtual = historicoOrdenado.findIndex(
    (item) => String(item.id) === String(atual.id),
  );

  if (indiceAtual === -1) {
    return {
      valorEsperadoCalculado: null,
      ultimoContadorInRetirada: null,
      ultimoContadorOutRetirada: null,
      deltaContadorIn: null,
      deltaContadorOut: null,
      algoritmoValorEsperado: null,
    };
  }

  let ultimoInValido = null;
  let ultimoOutValido = null;

  for (let i = 0; i < indiceAtual; i += 1) {
    const item = historicoOrdenado[i];
    const { contadorInAtual, contadorOutAtual } =
      extrairContadorAtualMovimentacao(item);

    if (contadorInAtual !== null) {
      ultimoInValido = contadorInAtual;
    }
    if (contadorOutAtual !== null) {
      ultimoOutValido = contadorOutAtual;
    }
  }

  const itemAtual = historicoOrdenado[indiceAtual];
  const { contadorInAtual, contadorOutAtual } =
    extrairContadorAtualMovimentacao(itemAtual);

  const { baseIn, baseOut } = extrairContadoresBaseMovimentacao({
    movimentacaoAtual: itemAtual,
    ultimoContadorInValido: ultimoInValido,
    ultimoContadorOutValido: ultimoOutValido,
    contadorInAnteriorFallback,
    contadorOutAnteriorFallback,
  });

  const deltaContadorIn =
    baseIn !== null && contadorInAtual !== null
      ? Math.max(0, contadorInAtual - baseIn)
      : null;
  const deltaContadorOut =
    baseOut !== null && contadorOutAtual !== null
      ? Math.max(0, contadorOutAtual - baseOut)
      : null;

  let valorEsperadoCalculado = null;
  let algoritmoValorEsperado = null;

  if (deltaContadorIn !== null) {
    valorEsperadoCalculado = arredondar2(deltaContadorIn);
    algoritmoValorEsperado = "delta_in_direto";
  } else if (permitirFallbackDeltaOut && deltaContadorOut !== null) {
    valorEsperadoCalculado = arredondar2(deltaContadorOut);
    algoritmoValorEsperado = "delta_out_direto";
  }

  return {
    valorEsperadoCalculado,
    ultimoContadorInRetirada: baseIn,
    ultimoContadorOutRetirada: baseOut,
    deltaContadorIn,
    deltaContadorOut,
    algoritmoValorEsperado,
  };
};

export const calcularEsperadoMovimentacaoRetirada = async ({
  movimentacaoAtual,
  valorFicha,
  contadorInAnteriorFallback = null,
  contadorOutAnteriorFallback = null,
  permitirFallbackDeltaOut = false,
  transaction,
}) => {
  const atual = normalizarMovimentacao(movimentacaoAtual || {});

  if (!atual.maquinaId || !atual.id) {
    return {
      valorEsperadoCalculado: null,
      ultimoContadorInRetirada: null,
      ultimoContadorOutRetirada: null,
      deltaContadorIn: null,
      deltaContadorOut: null,
      algoritmoValorEsperado: null,
    };
  }

  const historico = await Movimentacao.findAll({
    where: {
      maquinaId: atual.maquinaId,
    },
    attributes: [
      "id",
      "maquinaId",
      "dataColeta",
      "createdAt",
      "contadorIn",
      "contadorInDigital",
      "contadorOut",
      "contadorOutDigital",
      "contadorInAnterior",
      "contadorOutAnterior",
    ],
    transaction,
  });

  return calcularEsperadoComHistorico({
    movimentacaoAtual: atual,
    historicoMovimentacoes: historico,
    valorFicha,
    contadorInAnteriorFallback,
    contadorOutAnteriorFallback,
    permitirFallbackDeltaOut,
  });
};
