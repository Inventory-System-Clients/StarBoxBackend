import { Op } from "sequelize";
import { GastoRoteiro, Roteiro, Usuario } from "../models/index.js";

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

const getFaixaDia = (dataParam) => {
  const data = dataParam || new Date().toISOString().slice(0, 10);
  const inicio = new Date(`${data}T00:00:00.000Z`);
  const fim = new Date(`${data}T23:59:59.999Z`);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return null;
  }

  return { data, inicio, fim };
};

const serializarGasto = (gasto) => ({
  id: gasto.id,
  roteiroId: gasto.roteiroId,
  usuarioId: gasto.usuarioId,
  categoria: gasto.categoria,
  valor: Number.parseFloat(gasto.valor || 0),
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
  if (usuario.role === "ADMIN") return true;
  return roteiro.funcionarioId === usuario.id;
};

const calcularTotalDia = async (roteiroId, inicio, fim) => {
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

export const listarGastosRoteiro = async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const faixaDia = getFaixaDia(req.query.data);

    if (!faixaDia) {
      return res.status(400).json({ error: "Data inválida. Use AAAA-MM-DD." });
    }

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    if (!validarPermissaoLancamento(roteiro, req.usuario)) {
      return res.status(403).json({ error: "Sem permissão para ver gastos deste roteiro" });
    }

    const gastos = await GastoRoteiro.findAll({
      where: {
        roteiroId,
        dataHora: {
          [Op.between]: [faixaDia.inicio, faixaDia.fim],
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
    const saldoDisponivel = Number.parseFloat((orcamentoDiario - totalGasto).toFixed(2));

    return res.json({
      roteiro: {
        id: roteiro.id,
        nome: roteiro.nome,
      },
      data: faixaDia.data,
      categoriasDisponiveis: CATEGORIAS_GASTO,
      orcamentoDiario,
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
    const { categoria, valor, observacao } = req.body;

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    if (!validarPermissaoLancamento(roteiro, req.usuario)) {
      return res.status(403).json({ error: "Sem permissão para lançar gasto neste roteiro" });
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
      return res.status(400).json({ error: "Valor do gasto deve ser maior que zero" });
    }

    if (observacao !== undefined && typeof observacao !== "string") {
      return res.status(400).json({ error: "observacao deve ser um texto" });
    }

    const faixaHoje = getFaixaDia();
    const totalGastoAtual = await calcularTotalDia(
      roteiroId,
      faixaHoje.inicio,
      faixaHoje.fim,
    );
    const orcamentoDiario = Number.parseFloat(roteiro.orcamentoDiario || 2000);
    const saldoDisponivelAntes = Number.parseFloat(
      (orcamentoDiario - totalGastoAtual).toFixed(2),
    );

    if (valorNumerico > saldoDisponivelAntes) {
      return res.status(400).json({
        error: "Saldo diário insuficiente para este lançamento",
        orcamentoDiario,
        totalGastoAtual: Number.parseFloat(totalGastoAtual.toFixed(2)),
        saldoDisponivel: saldoDisponivelAntes,
      });
    }

    const gasto = await GastoRoteiro.create({
      roteiroId,
      usuarioId: req.usuario.id,
      categoria: categoriaNormalizada,
      valor: Number.parseFloat(valorNumerico.toFixed(2)),
      observacao: observacao?.trim() || null,
      dataHora: new Date(),
    });

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
      (totalGastoAtual + Number.parseFloat(valorNumerico.toFixed(2))).toFixed(2),
    );

    return res.status(201).json({
      message: "Gasto diário registrado com sucesso",
      gasto: serializarGasto(gastoCompleto),
      resumoDia: {
        data: faixaHoje.data,
        orcamentoDiario,
        totalGasto: totalGastoApos,
        saldoDisponivel: Number.parseFloat((orcamentoDiario - totalGastoApos).toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Erro ao registrar gasto do roteiro:", error);
    return res.status(500).json({ error: "Erro ao registrar gasto do roteiro" });
  }
};

export const atualizarOrcamentoDiarioRoteiro = async (req, res) => {
  try {
    const roteiroId = req.params.id;
    const { orcamentoDiario } = req.body;

    const valorNumerico = parseValor(orcamentoDiario);
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res
        .status(400)
        .json({ error: "orcamentoDiario deve ser um número maior que zero" });
    }

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    await roteiro.update({
      orcamentoDiario: Number.parseFloat(valorNumerico.toFixed(2)),
    });

    return res.json({
      message: "Orçamento diário atualizado com sucesso",
      roteiro: {
        id: roteiro.id,
        nome: roteiro.nome,
        orcamentoDiario: Number.parseFloat(roteiro.orcamentoDiario || 0),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar orçamento diário do roteiro:", error);
    return res.status(500).json({ error: "Erro ao atualizar orçamento diário" });
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
      const fim = dataFim
        ? new Date(`${dataFim}T23:59:59.999Z`)
        : new Date();

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
          attributes: ["id", "nome"],
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

    return res.json({
      categoriasDisponiveis: CATEGORIAS_GASTO,
      totalRegistros: gastos.length,
      totalValor: Number.parseFloat(totalValor.toFixed(2)),
      gastos: gastos.map(serializarGasto),
    });
  } catch (error) {
    console.error("Erro ao listar gastos de roteiro no dashboard:", error);
    return res.status(500).json({ error: "Erro ao listar gastos de roteiro" });
  }
};
