import { Op } from "sequelize";
import {
  GastoRoteiro,
  MovimentacaoVeiculo,
  Roteiro,
  Usuario,
  Veiculo,
} from "../models/index.js";
import { sequelize } from "../database/connection.js";
import { verificarRevisaoPendente } from "../services/revisaoVeiculoService.js";

const CATEGORIAS_GASTO = [
  "transporte",
  "estadia",
  "abastecimento",
  "alimentacao",
  "outros",
];

const parseValor = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const normalizado = valor.replace(",", ".").trim();
    return Number.parseFloat(normalizado);
  }
  return Number.NaN;
};

const parseLitros = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const normalizado = valor.replace(",", ".").trim();
    return Number.parseFloat(normalizado);
  }
  return Number.NaN;
};

const getFaixaSemana = (dataParam) => {
  const dataReferencia = dataParam || new Date().toISOString().slice(0, 10);
  const referencia = new Date(`${dataReferencia}T00:00:00.000Z`);

  if (Number.isNaN(referencia.getTime())) {
    return null;
  }

  const inicio = new Date(referencia);
  inicio.setUTCDate(inicio.getUTCDate() - inicio.getUTCDay());
  inicio.setUTCHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 6);
  fim.setUTCHours(23, 59, 59, 999);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return null;
  }

  return {
    dataReferencia,
    inicio,
    fim,
    inicioSemana: inicio.toISOString().slice(0, 10),
    fimSemana: fim.toISOString().slice(0, 10),
  };
};

const serializarGasto = (gasto) => ({
  id: gasto.id,
  roteiroId: gasto.roteiroId,
  usuarioId: gasto.usuarioId,
  categoria: gasto.categoria,
  valor: Number.parseFloat(gasto.valor || 0),
  quilometragem:
    gasto.quilometragem !== null && gasto.quilometragem !== undefined
      ? Number.parseInt(gasto.quilometragem, 10)
      : null,
  observacao: gasto.observacao,
  dataHora: gasto.dataHora,
  usuario: gasto.usuario
    ? {
        id: gasto.usuario.id,
        nome: gasto.usuario.nome,
      }
    : undefined,
  roteiro: gasto.roteiro
    ? {
        id: gasto.roteiro.id,
        nome: gasto.roteiro.nome,
      }
    : undefined,
});

const validarPermissaoLancamento = (roteiro, usuario) => {
  if (!usuario) return false;
  if (["ADMIN", "GERENCIADOR"].includes(usuario.role)) return true;
  return roteiro.funcionarioId === usuario.id;
};

const calcularTotalSemana = async (roteiroId, inicio, fim) => {
  const total = await GastoRoteiro.sum("valor", {
    where: {
      roteiroId,
      dataHora: {
        [Op.between]: [inicio, fim],
      },
    },
  });

  return Number.parseFloat(total || 0);
};

const obterReferenciaKmVeiculo = async (veiculoId, transaction) => {
  const veiculo = await Veiculo.findByPk(veiculoId, { transaction });
  if (!veiculo) {
    const erro = new Error("Veículo do roteiro não encontrado");
    erro.statusCode = 404;
    throw erro;
  }

  const ultimaMovimentacaoComKm = await MovimentacaoVeiculo.findOne({
    where: {
      veiculoId,
      km: {
        [Op.ne]: null,
      },
    },
    order: [["dataHora", "DESC"]],
    transaction,
  });

  const kmAtualVeiculo = Number.parseInt(veiculo.km, 10);
  const kmUltimaMovimentacao = Number.parseInt(ultimaMovimentacaoComKm?.km, 10);

  const kmReferencia = Math.max(
    Number.isInteger(kmAtualVeiculo) ? kmAtualVeiculo : 0,
    Number.isInteger(kmUltimaMovimentacao) ? kmUltimaMovimentacao : 0,
  );

  return { veiculo, kmReferencia };
};

export const listarGastosRoteiro = async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const faixaSemana = getFaixaSemana(req.query.data);

    if (!faixaSemana) {
      return res.status(400).json({ error: "Data inválida. Use AAAA-MM-DD." });
    }

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    if (!validarPermissaoLancamento(roteiro, req.usuario)) {
      return res
        .status(403)
        .json({ error: "Sem permissão para ver gastos deste roteiro" });
    }

    const gastos = await GastoRoteiro.findAll({
      where: {
        roteiroId,
        dataHora: {
          [Op.between]: [faixaSemana.inicio, faixaSemana.fim],
        },
      },
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome"],
        },
      ],
      order: [["dataHora", "DESC"]],
    });

    const totalGasto = gastos.reduce(
      (acc, gasto) => acc + Number.parseFloat(gasto.valor || 0),
      0,
    );
    const orcamentoDiario = Number.parseFloat(roteiro.orcamentoDiario || 2000);
    const saldoDisponivel = Number.parseFloat(
      (orcamentoDiario - totalGasto).toFixed(2),
    );

    return res.json({
      roteiro: {
        id: roteiro.id,
        nome: roteiro.nome,
      },
      periodo: "semanal",
      data: faixaSemana.dataReferencia,
      dataReferencia: faixaSemana.dataReferencia,
      inicioSemana: faixaSemana.inicioSemana,
      fimSemana: faixaSemana.fimSemana,
      categoriasDisponiveis: CATEGORIAS_GASTO,
      orcamentoDiario,
      orcamentoSemanal: orcamentoDiario,
      totalGasto: Number.parseFloat(totalGasto.toFixed(2)),
      saldoDisponivel,
      gastos: gastos.map(serializarGasto),
    });
  } catch (error) {
    console.error("Erro ao listar gastos do roteiro:", error);
    return res.status(500).json({ error: "Erro ao listar gastos do roteiro" });
  }
};

export const registrarGastoRoteiro = async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const {
      categoria,
      valor,
      observacao,
      quilometragem,
      litros,
      nivelCombustivel,
    } = req.body;

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    if (!validarPermissaoLancamento(roteiro, req.usuario)) {
      return res
        .status(403)
        .json({ error: "Sem permissão para lançar gasto neste roteiro" });
    }

    const categoriaNormalizada = String(categoria || "")
      .trim()
      .toLowerCase();

    if (!CATEGORIAS_GASTO.includes(categoriaNormalizada)) {
      return res.status(400).json({
        error: `Categoria inválida. Use: ${CATEGORIAS_GASTO.join(", ")}`,
      });
    }

    const valorNumerico = parseValor(valor);
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res
        .status(400)
        .json({ error: "Valor do gasto deve ser maior que zero" });
    }

    let quilometragemNumerica = null;
    let litrosNumericos = null;
    if (categoriaNormalizada === "abastecimento") {
      if (!roteiro.veiculoId) {
        return res.status(400).json({
          error:
            "Este roteiro não possui veículo associado. Vincule um veículo antes de lançar abastecimento.",
        });
      }

      const quilometragemConvertida = Number.parseInt(quilometragem, 10);
      if (
        !Number.isInteger(quilometragemConvertida) ||
        quilometragemConvertida < 0
      ) {
        return res.status(400).json({
          error:
            "KM é obrigatório para abastecimento e deve ser um número inteiro maior ou igual a zero",
        });
      }
      quilometragemNumerica = quilometragemConvertida;

      const litrosConvertidos = parseLitros(litros);
      if (!Number.isFinite(litrosConvertidos) || litrosConvertidos <= 0) {
        return res.status(400).json({
          error:
            "Litros abastecidos é obrigatório para abastecimento e deve ser maior que zero",
        });
      }
      litrosNumericos = Number.parseFloat(litrosConvertidos.toFixed(2));
    }

    if (
      observacao !== undefined &&
      observacao !== null &&
      typeof observacao !== "string"
    ) {
      return res.status(400).json({ error: "observacao deve ser um texto" });
    }

    const observacaoNormalizada =
      typeof observacao === "string" ? observacao.trim() : "";

    if (categoriaNormalizada === "outros" && !observacaoNormalizada) {
      return res.status(400).json({
        error: "Observação é obrigatória quando a categoria for Outros",
      });
    }

    const faixaSemanaAtual = getFaixaSemana();
    const totalGastoAtual = await calcularTotalSemana(
      roteiroId,
      faixaSemanaAtual.inicio,
      faixaSemanaAtual.fim,
    );
    const orcamentoDiario = Number.parseFloat(roteiro.orcamentoDiario || 2000);
    const saldoDisponivelAntes = Number.parseFloat(
      (orcamentoDiario - totalGastoAtual).toFixed(2),
    );

    if (valorNumerico > saldoDisponivelAntes) {
      return res.status(400).json({
        error: "Saldo semanal insuficiente para este lançamento",
        orcamentoDiario,
        totalGastoAtual: Number.parseFloat(totalGastoAtual.toFixed(2)),
        saldoDisponivel: saldoDisponivelAntes,
      });
    }

    const dataLancamento = new Date();
    let gasto;
    let movimentacaoVeiculo = null;

    await sequelize.transaction(async (transaction) => {
      gasto = await GastoRoteiro.create(
        {
          roteiroId,
          usuarioId: req.usuario.id,
          categoria: categoriaNormalizada,
          valor: Number.parseFloat(valorNumerico.toFixed(2)),
          quilometragem: quilometragemNumerica,
          observacao: observacaoNormalizada || null,
          dataHora: dataLancamento,
        },
        { transaction },
      );

      if (categoriaNormalizada !== "abastecimento") {
        return;
      }

      const { veiculo, kmReferencia } = await obterReferenciaKmVeiculo(
        roteiro.veiculoId,
        transaction,
      );

      if (quilometragemNumerica < kmReferencia) {
        const erroKm = new Error(
          `O KM informado (${quilometragemNumerica}) não pode ser menor que o KM anterior (${kmReferencia}).`,
        );
        erroKm.statusCode = 400;
        throw erroKm;
      }

      movimentacaoVeiculo = await MovimentacaoVeiculo.create(
        {
          veiculoId: roteiro.veiculoId,
          usuarioId: req.usuario.id,
          tipo: "abastecimento",
          dataHora: dataLancamento,
          gasolina:
            typeof nivelCombustivel === "string" && nivelCombustivel.trim()
              ? nivelCombustivel.trim()
              : null,
          km: quilometragemNumerica,
          litros: litrosNumericos,
          obs: observacaoNormalizada || null,
          roteiroId: roteiro.id,
        },
        { transaction },
      );

      const atualizacoesVeiculo = {};
      if (quilometragemNumerica > Number(veiculo.km || 0)) {
        atualizacoesVeiculo.km = quilometragemNumerica;
      }
      if (
        typeof nivelCombustivel === "string" &&
        nivelCombustivel.trim().length > 0
      ) {
        atualizacoesVeiculo.nivelCombustivel = nivelCombustivel.trim();
      }

      if (Object.keys(atualizacoesVeiculo).length > 0) {
        await veiculo.update(atualizacoesVeiculo, { transaction });
      }
    });

    if (categoriaNormalizada === "abastecimento" && roteiro.veiculoId) {
      await verificarRevisaoPendente(roteiro.veiculoId);
    }

    const gastoCompleto = await GastoRoteiro.findByPk(gasto.id, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome"],
        },
      ],
    });

    const totalGastoApos = Number.parseFloat(
      (totalGastoAtual + Number.parseFloat(valorNumerico.toFixed(2))).toFixed(
        2,
      ),
    );

    return res.status(201).json({
      message: "Gasto semanal registrado com sucesso",
      gasto: serializarGasto(gastoCompleto),
      movimentacaoVeiculoId: movimentacaoVeiculo?.id || null,
      resumoSemana: {
        dataReferencia: faixaSemanaAtual.dataReferencia,
        inicioSemana: faixaSemanaAtual.inicioSemana,
        fimSemana: faixaSemanaAtual.fimSemana,
        orcamentoDiario,
        orcamentoSemanal: orcamentoDiario,
        totalGasto: totalGastoApos,
        saldoDisponivel: Number.parseFloat(
          (orcamentoDiario - totalGastoApos).toFixed(2),
        ),
      },
      resumoDia: {
        data: faixaSemanaAtual.dataReferencia,
        orcamentoDiario,
        totalGasto: totalGastoApos,
        saldoDisponivel: Number.parseFloat(
          (orcamentoDiario - totalGastoApos).toFixed(2),
        ),
      },
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Erro ao registrar gasto do roteiro:", error);
    return res
      .status(500)
      .json({ error: "Erro ao registrar gasto do roteiro" });
  }
};

export const atualizarOrcamentoDiarioRoteiro = async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const { orcamentoSemanal, orcamentoDiario } = req.body;
    const orcamentoRecebido =
      orcamentoSemanal !== undefined ? orcamentoSemanal : orcamentoDiario;

    const valorNumerico = parseValor(orcamentoRecebido);
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res
        .status(400)
        .json({ error: "orcamentoSemanal deve ser um número maior que zero" });
    }

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    await roteiro.update({
      orcamentoDiario: Number.parseFloat(valorNumerico.toFixed(2)),
    });

    const orcamentoAtualizado = Number.parseFloat(roteiro.orcamentoDiario || 0);

    return res.json({
      message: "Orçamento semanal atualizado com sucesso",
      roteiro: {
        id: roteiro.id,
        nome: roteiro.nome,
        orcamentoDiario: orcamentoAtualizado,
        orcamentoSemanal: orcamentoAtualizado,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar orçamento semanal do roteiro:", error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar orçamento semanal" });
  }
};

export const listarGastosRoteirosDashboard = async (req, res) => {
  try {
    const { dataInicio, dataFim, roteiroId, usuarioId, categoria } = req.query;
    const where = {};

    if (roteiroId) where.roteiroId = roteiroId;
    if (usuarioId) where.usuarioId = usuarioId;

    if (categoria) {
      const categoriaNormalizada = String(categoria).trim().toLowerCase();
      if (!CATEGORIAS_GASTO.includes(categoriaNormalizada)) {
        return res.status(400).json({
          error: `Categoria inválida. Use: ${CATEGORIAS_GASTO.join(", ")}`,
        });
      }
      where.categoria = categoriaNormalizada;
    }

    if (dataInicio || dataFim) {
      const inicio = dataInicio
        ? new Date(`${dataInicio}T00:00:00.000Z`)
        : new Date("1970-01-01T00:00:00.000Z");
      const fim = dataFim ? new Date(`${dataFim}T23:59:59.999Z`) : new Date();

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
        return res.status(400).json({
          error: "Datas inválidas. Use o formato AAAA-MM-DD",
        });
      }

      where.dataHora = {
        [Op.between]: [inicio, fim],
      };
    }

    const gastos = await GastoRoteiro.findAll({
      where,
      include: [
        {
          model: Roteiro,
          as: "roteiro",
          attributes: ["id", "nome", "orcamentoDiario"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome"],
        },
      ],
      order: [["dataHora", "DESC"]],
    });

    const totalValor = gastos.reduce(
      (acc, gasto) => acc + Number.parseFloat(gasto.valor || 0),
      0,
    );

    const totalOrcamentoPeriodo = gastos.reduce(
      (acc, gasto) => {
        const roteiro = gasto.roteiro;
        if (!roteiro?.id || !gasto?.dataHora) return acc;

        const data = new Date(gasto.dataHora);
        if (Number.isNaN(data.getTime())) return acc;

        const chave = `${roteiro.id}|${data.toISOString().slice(0, 10)}`;
        if (!acc._chaves) acc._chaves = new Set();
        if (acc._chaves.has(chave)) return acc;

        acc._chaves.add(chave);
        acc.valor += Number.parseFloat(roteiro.orcamentoDiario || 2000);
        return acc;
      },
      { valor: 0, _chaves: null },
    );

    const saldoDisponivel = Number.parseFloat(
      Math.max(0, totalOrcamentoPeriodo.valor - totalValor).toFixed(2),
    );

    return res.json({
      categoriasDisponiveis: CATEGORIAS_GASTO,
      totalRegistros: gastos.length,
      totalValor: Number.parseFloat(totalValor.toFixed(2)),
      saldoDisponivel,
      gastos: gastos.map(serializarGasto),
    });
  } catch (error) {
    console.error("Erro ao listar gastos de roteiro no dashboard:", error);
    return res.status(500).json({ error: "Erro ao listar gastos de roteiro" });
  }
};
