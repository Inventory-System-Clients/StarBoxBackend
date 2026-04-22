import { Op } from "sequelize";
import {
  GastoRoteiro,
  Manutencao,
  Roteiro,
  RoteiroResumoExecucao,
} from "../models/index.js";

const STATUS_MANUTENCAO_REALIZADA = new Set(["feito", "concluida"]);

const toArrayStrings = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
};

const normalizarNumero = (value, fallback = 0) => {
  const numero = Number.parseFloat(value);
  if (!Number.isFinite(numero)) return fallback;
  return numero;
};

const formatarMoeda = (valor) => {
  const numero = normalizarNumero(valor, 0);
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatarLista = (lista = []) => {
  const itens = toArrayStrings(lista);
  return itens.length > 0 ? itens.join(", ") : "Nenhum";
};

const getFaixaSemanaAtualUtc = () => {
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
  };
};

const montarResumoManutencoes = async (roteiroId) => {
  const manutencoes = await Manutencao.findAll({
    where: { roteiroId },
    include: [
      {
        association: "loja",
        attributes: ["id", "nome"],
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  const realizadas = [];
  const naoRealizadas = [];
  const lojasComManutencaoRealizada = new Set();
  const mapaNaoRealizadasPorPonto = new Map();

  for (const manutencao of manutencoes) {
    const lojaNome = manutencao.loja?.nome || "Ponto sem nome";
    const descricao = manutencao.descricao || "Manutenção sem descrição";
    const itemTexto = `${descricao} (${lojaNome})`;

    if (STATUS_MANUTENCAO_REALIZADA.has(String(manutencao.status || "").toLowerCase())) {
      realizadas.push(itemTexto);
      lojasComManutencaoRealizada.add(lojaNome);
      continue;
    }

    naoRealizadas.push(itemTexto);
    if (!mapaNaoRealizadasPorPonto.has(lojaNome)) {
      mapaNaoRealizadasPorPonto.set(lojaNome, []);
    }
    mapaNaoRealizadasPorPonto.get(lojaNome).push(descricao);
  }

  const naoRealizadasPorPonto = Array.from(mapaNaoRealizadasPorPonto.entries()).map(
    ([ponto, manutencoesPonto]) => ({
      ponto,
      manutencoes: manutencoesPonto,
    }),
  );

  return {
    totalManutencoesRealizadas: realizadas.length,
    lojasComManutencaoRealizada: Array.from(lojasComManutencaoRealizada),
    manutencoesRealizadas: realizadas,
    manutencoesNaoRealizadas: naoRealizadas,
    manutencoesNaoRealizadasPorPonto: naoRealizadasPorPonto,
  };
};

const montarPayloadResumo = async ({
  roteiroId,
  data,
  roteiroNome,
  lojas = [],
  estoqueInicialTotal,
  estoqueFinalTotal,
  consumoTotalProdutos,
}) => {
  const pontosFeitos = lojas
    .filter((loja) => loja.status === "finalizado")
    .map((loja) => loja.nome);
  const pontosNaoFeitos = lojas
    .filter((loja) => loja.status !== "finalizado")
    .map((loja) => loja.nome);

  const maquinasFeitas = [];
  const maquinasNaoFeitas = [];

  for (const loja of lojas) {
    const maquinas = Array.isArray(loja.maquinas) ? loja.maquinas : [];
    for (const maquina of maquinas) {
      if (maquina.status === "finalizado") {
        maquinasFeitas.push(maquina.nome);
      } else {
        maquinasNaoFeitas.push(maquina.nome);
      }
    }
  }

  const faixaSemana = getFaixaSemanaAtualUtc();
  const roteiro = await Roteiro.findByPk(roteiroId, {
    attributes: ["id", "orcamentoDiario"],
  });

  const totalDespesaSemana = await GastoRoteiro.sum("valor", {
    where: {
      roteiroId,
      dataHora: {
        [Op.between]: [faixaSemana.inicio, faixaSemana.fim],
      },
    },
  });

  const despesaTotal = Number.parseFloat(normalizarNumero(totalDespesaSemana, 0).toFixed(2));
  const orcamento = normalizarNumero(roteiro?.orcamentoDiario, 2000);
  const sobraValorDespesa = Number.parseFloat((orcamento - despesaTotal).toFixed(2));

  const resumoManutencoes = await montarResumoManutencoes(roteiroId);

  return {
    roteiroId,
    data,
    roteiroNome,
    pontosFeitos,
    pontosNaoFeitos,
    maquinasFeitas,
    maquinasNaoFeitas,
    estoqueInicialTotal,
    estoqueFinalTotal,
    consumoTotalProdutos,
    despesaTotal,
    sobraValorDespesa,
    ...resumoManutencoes,
  };
};

export const salvarSnapshotResumoExecucao = async ({
  roteiroId,
  data,
  roteiroNome,
  lojas,
  estoqueInicialTotal,
  estoqueFinalTotal,
  consumoTotalProdutos,
}) => {
  const existente = await RoteiroResumoExecucao.findOne({
    where: { roteiroId, data },
  });

  if (existente?.status === "finalizado") {
    return existente;
  }

  const payload = await montarPayloadResumo({
    roteiroId,
    data,
    roteiroNome,
    lojas,
    estoqueInicialTotal,
    estoqueFinalTotal,
    consumoTotalProdutos,
  });

  if (!existente) {
    return RoteiroResumoExecucao.create({
      ...payload,
      status: "em_andamento",
    });
  }

  await existente.update({
    ...payload,
    status: "em_andamento",
  });

  return existente;
};

export const fecharResumoExecucao = async ({
  roteiroId,
  data,
  fechadoPorId,
  roteiroNome,
  lojas,
  estoqueInicialTotal,
  estoqueFinalTotal,
  consumoTotalProdutos,
}) => {
  const existente = await RoteiroResumoExecucao.findOne({
    where: { roteiroId, data },
  });

  if (existente?.status === "finalizado") {
    return existente;
  }

  const payload = await montarPayloadResumo({
    roteiroId,
    data,
    roteiroNome,
    lojas,
    estoqueInicialTotal,
    estoqueFinalTotal,
    consumoTotalProdutos,
  });

  if (!existente) {
    return RoteiroResumoExecucao.create({
      ...payload,
      status: "finalizado",
      fechadoPorId: fechadoPorId || null,
      fechadoEm: new Date(),
    });
  }

  await existente.update({
    ...payload,
    status: "finalizado",
    fechadoPorId: fechadoPorId || null,
    fechadoEm: new Date(),
  });

  return existente;
};

export const obterResumoExecucao = async ({ roteiroId, data }) => {
  return RoteiroResumoExecucao.findOne({
    where: {
      roteiroId,
      data,
    },
  });
};

export const montarMensagemResumoWhatsapp = (resumo) => {
  if (!resumo) return "Resumo da rota não encontrado.";

  const manutencoesNaoRealizadasPorPonto = Array.isArray(
    resumo.manutencoesNaoRealizadasPorPonto,
  )
    ? resumo.manutencoesNaoRealizadasPorPonto
        .map((item) => {
          const ponto = String(item?.ponto || "Ponto sem nome").trim();
          const lista = formatarLista(item?.manutencoes || []);
          return `${ponto}: ${lista}`;
        })
        .filter(Boolean)
    : [];

  const totalManutencoesRealizadas = Number(resumo.totalManutencoesRealizadas || 0);
  const manutencoesRealizadas = Array.isArray(resumo.manutencoesRealizadas)
    ? resumo.manutencoesRealizadas
    : [];
  const manutencoesNaoRealizadas = Array.isArray(resumo.manutencoesNaoRealizadas)
    ? resumo.manutencoesNaoRealizadas
    : [];

  return [
    `Roteiro: ${resumo.roteiroNome || "Sem nome"}`,
    `Pontos feitos: ${formatarLista(resumo.pontosFeitos)}`,
    `Pontos nao feitos: ${formatarLista(resumo.pontosNaoFeitos)}`,
    `Maquinas feitas: ${formatarLista(resumo.maquinasFeitas)}`,
    `Maquinas nao feitas: ${formatarLista(resumo.maquinasNaoFeitas)}`,
    `Estoque inicial: ${resumo.estoqueInicialTotal ?? "-"} produtos`,
    `Estoque final: ${resumo.estoqueFinalTotal ?? "-"} produtos`,
    `Total gasto na rota: ${resumo.consumoTotalProdutos ?? "-"} produtos`,
    `Despesa total: ${formatarMoeda(resumo.despesaTotal)}`,
    `Sobra valor despesa: ${formatarMoeda(resumo.sobraValorDespesa)}`,
    `Total de manutencoes realizadas: ${totalManutencoesRealizadas}`,
    `Lojas com manutencao realizada: ${formatarLista(resumo.lojasComManutencaoRealizada)}`,
    `Manutencoes realizadas (${manutencoesRealizadas.length}): ${formatarLista(manutencoesRealizadas)}`,
    `Manutencoes nao realizadas (${manutencoesNaoRealizadas.length}): ${formatarLista(manutencoesNaoRealizadas)}`,
    `Manutencoes nao realizadas por ponto: ${formatarLista(manutencoesNaoRealizadasPorPonto)}`,
  ].join("\n");
};
