import { Maquina, Loja, Movimentacao } from "../models/index.js";
import { Op } from "sequelize";

const possuiNumero = (valor) =>
  valor !== null &&
  valor !== undefined &&
  valor !== "" &&
  !Number.isNaN(Number(valor));

const inteiroSeguro = (valor, fallback = 0) => {
  if (!possuiNumero(valor)) return fallback;
  return parseInt(valor, 10);
};

const calcularContadoresProjetados = (historico) => {
  let contadorInProjetado = 0;
  let contadorOutProjetado = 0;

  for (const mov of historico) {
    const fichas = inteiroSeguro(mov.fichas, 0);
    const sairam = inteiroSeguro(mov.sairam, 0);

    if (possuiNumero(mov.contadorIn)) {
      contadorInProjetado = inteiroSeguro(mov.contadorIn, contadorInProjetado);
    } else {
      contadorInProjetado += fichas;
    }

    if (possuiNumero(mov.contadorOut)) {
      contadorOutProjetado = inteiroSeguro(
        mov.contadorOut,
        contadorOutProjetado,
      );
    } else {
      contadorOutProjetado += sairam;
    }
  }

  return {
    contadorInProjetado: Math.max(0, contadorInProjetado),
    contadorOutProjetado: Math.max(0, contadorOutProjetado),
  };
};
// Calcula quantidade atual e sugestão de abastecimento
export const calcularQuantidadeAtual = async (req, res) => {
  try {
    const { maquinaId, contadorIn, contadorOut } = req.query;
    if (!maquinaId) {
      return res.status(400).json({
        error: "maquinaId é obrigatório",
      });
    }

    const maquina = await Maquina.findByPk(maquinaId);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    const historico = await Movimentacao.findAll({
      where: { maquinaId },
      attributes: [
        "contadorIn",
        "contadorOut",
        "fichas",
        "sairam",
        "totalPos",
        "dataColeta",
        "createdAt",
      ],
      order: [
        ["dataColeta", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    const ultimaMov = historico[historico.length - 1] || null;
    const { contadorInProjetado, contadorOutProjetado } =
      calcularContadoresProjetados(historico);

    const capacidade = parseInt(maquina.capacidadePadrao) || 0;
    const totalPosAnterior = ultimaMov
      ? inteiroSeguro(ultimaMov.totalPos, 0)
      : capacidade;

    const contadorInAtual = possuiNumero(contadorIn)
      ? inteiroSeguro(contadorIn, contadorInProjetado)
      : contadorInProjetado;
    const contadorOutAtual = possuiNumero(contadorOut)
      ? inteiroSeguro(contadorOut, contadorOutProjetado)
      : contadorOutProjetado;

    const saidaCalculada = Math.max(0, contadorOutAtual - contadorOutProjetado);
    const totalPreEsperado = Math.max(0, totalPosAnterior - saidaCalculada);
    const quantidadeAtual = totalPreEsperado;
    const sugestaoAbastecimento = Math.max(0, capacidade - quantidadeAtual);

    res.json({
      quantidadeAtual: quantidadeAtual >= 0 ? quantidadeAtual : 0,
      totalPreEsperado,
      sugestaoAbastecimento,
      capacidadePadrao: capacidade,
      contadorInSugerido: contadorInProjetado,
      contadorOutSugerido: contadorOutProjetado,
      contadorInAtual,
      contadorOutAtual,
      saidaCalculada,
    });
  } catch (error) {
    console.error("Erro ao calcular quantidade atual:", error);
    res.status(500).json({ error: "Erro ao calcular quantidade atual" });
  }
};

// US05 - Listar máquinas
export const listarMaquinas = async (req, res) => {
  try {
    const { lojaId, incluirInativas } = req.query;
    const where = {};

    if (lojaId) {
      where.lojaId = lojaId;
    }

    // Por padrão, só mostra máquinas ativas
    // Para ver inativas, passar ?incluirInativas=true
    if (incluirInativas !== "true") {
      where.ativo = true;
    }

    const maquinas = await Maquina.findAll({
      where,
      attributes: { exclude: [] }, // Inclui todos os atributos da máquina, inclusive lojaId
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome", "cidade"],
        },
      ],
      order: [["codigo", "ASC"]],
    });

    res.json(maquinas);
  } catch (error) {
    console.error("Erro ao listar máquinas:", error);
    res.status(500).json({ error: "Erro ao listar máquinas" });
  }
};
export const listarTiposMaquina = async (req, res) => {
  try {
    const maquinas = await Maquina.findAll({
      attributes: ["tipo"],
      where: {
        tipo: {
          [Op.not]: null,
        },
      },
      raw: true,
    });

    const tiposSet = new Set();

    for (const item of maquinas) {
      const nome = String(item?.tipo || "").trim();
      if (nome) tiposSet.add(nome);
    }

    const tipos = Array.from(tiposSet).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
    );

    return res.json({ tipos });
  } catch (error) {
    console.error("Erro ao listar tipos de máquina:", error);
    return res.status(500).json({ error: "Erro ao listar tipos de máquina" });
  }
};
// US05 - Obter máquina por ID
export const obterMaquina = async (req, res) => {
  try {
    const maquina = await Maquina.findByPk(req.params.id, {
      attributes: { exclude: [] }, // Inclui todos os atributos, inclusive lojaId
      include: [
        {
          model: Loja,
          as: "loja",
        },
      ],
    });

    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    res.json(maquina);
  } catch (error) {
    console.error("Erro ao obter máquina:", error);
    res.status(500).json({ error: "Erro ao obter máquina" });
  }
};

// US05 - Criar máquina
export const criarMaquina = async (req, res) => {
  try {
    const {
      codigo,
      nome,
      tipo,
      lojaId,
      capacidadePadrao,
      valorFicha,
      comissaoLojaPercentual,
      fichasNecessarias,
      forcaForte,
      forcaFraca,
      forcaPremium,
      jogadasPremium,
      percentualAlertaEstoque,
      localizacao,
    } = req.body;

    if (!codigo || !lojaId) {
      return res
        .status(400)
        .json({ error: "Código e ID da loja são obrigatórios" });
    }

    if (
      comissaoLojaPercentual !== undefined &&
      comissaoLojaPercentual !== null &&
      (Number(comissaoLojaPercentual) < 0 ||
        Number(comissaoLojaPercentual) > 100)
    ) {
      return res.status(400).json({
        error: "Comissão da loja deve estar entre 0 e 100",
      });
    }

    // Verificar se código já existe
    const maquinaExistente = await Maquina.findOne({ where: { codigo } });
    if (maquinaExistente) {
      return res.status(400).json({ error: "Código de máquina já existe" });
    }

    const maquina = await Maquina.create({
      codigo,
      nome,
      tipo,
      lojaId,
      capacidadePadrao: capacidadePadrao || 100,
      valorFicha: valorFicha || 5.0,
      comissaoLojaPercentual:
        comissaoLojaPercentual !== undefined && comissaoLojaPercentual !== null
          ? Number(comissaoLojaPercentual)
          : 0,
      fichasNecessarias: fichasNecessarias || null,
      forcaForte: forcaForte || null,
      forcaFraca: forcaFraca || null,
      forcaPremium: forcaPremium || null,
      jogadasPremium: jogadasPremium || null,
      percentualAlertaEstoque: percentualAlertaEstoque || 30,
      localizacao,
    });

    res.locals.entityId = maquina.id;
    res.status(201).json(maquina);
  } catch (error) {
    console.error("Erro ao criar máquina:", error);
    res.status(500).json({ error: "Erro ao criar máquina" });
  }
};

// US05 - Atualizar máquina
export const atualizarMaquina = async (req, res) => {
  try {
    const maquina = await Maquina.findByPk(req.params.id);

    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    const {
      codigo,
      nome,
      tipo,
      lojaId,
      capacidadePadrao,
      valorFicha,
      comissaoLojaPercentual,
      fichasNecessarias,
      forcaForte,
      forcaFraca,
      forcaPremium,
      jogadasPremium,
      percentualAlertaEstoque,
      localizacao,
      ativo,
    } = req.body;

    // Verificar se novo código já existe em outra máquina
    if (codigo && codigo !== maquina.codigo) {
      const maquinaExistente = await Maquina.findOne({ where: { codigo } });
      if (maquinaExistente) {
        return res.status(400).json({ error: "Código de máquina já existe" });
      }
    }

    if (
      comissaoLojaPercentual !== undefined &&
      comissaoLojaPercentual !== null &&
      (Number(comissaoLojaPercentual) < 0 ||
        Number(comissaoLojaPercentual) > 100)
    ) {
      return res.status(400).json({
        error: "Comissão da loja deve estar entre 0 e 100",
      });
    }

    await maquina.update({
      codigo: codigo ?? maquina.codigo,
      nome: nome ?? maquina.nome,
      tipo: tipo ?? maquina.tipo,
      lojaId: lojaId ?? maquina.lojaId,
      capacidadePadrao: capacidadePadrao ?? maquina.capacidadePadrao,
      valorFicha: valorFicha ?? maquina.valorFicha,
      comissaoLojaPercentual:
        comissaoLojaPercentual ?? maquina.comissaoLojaPercentual,
      fichasNecessarias: fichasNecessarias ?? maquina.fichasNecessarias,
      forcaForte: forcaForte ?? maquina.forcaForte,
      forcaFraca: forcaFraca ?? maquina.forcaFraca,
      forcaPremium: forcaPremium ?? maquina.forcaPremium,
      jogadasPremium: jogadasPremium ?? maquina.jogadasPremium,
      percentualAlertaEstoque:
        percentualAlertaEstoque ?? maquina.percentualAlertaEstoque,
      localizacao: localizacao ?? maquina.localizacao,
      ativo: ativo ?? maquina.ativo,
    });

    res.json(maquina);
  } catch (error) {
    console.error("Erro ao atualizar máquina:", error);
    res.status(500).json({ error: "Erro ao atualizar máquina" });
  }
};

// US05 - Deletar máquina (soft delete na 1ª vez, hard delete na 2ª)
export const deletarMaquina = async (req, res) => {
  try {
    const maquina = await Maquina.findByPk(req.params.id);

    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    // Se já está inativa, deletar permanentemente
    if (!maquina.ativo) {
      await maquina.destroy();
      res.locals.entityId = req.params.id;
      return res.json({
        message: "Máquina excluída permanentemente com sucesso",
        permanentDelete: true,
      });
    }

    // Se está ativa, apenas desativar (soft delete)
    await maquina.update({ ativo: false });
    res.locals.entityId = maquina.id;
    res.json({
      message:
        "Máquina desativada com sucesso. Clique novamente para excluir permanentemente.",
      permanentDelete: false,
    });
  } catch (error) {
    console.error("Erro ao deletar máquina:", error);
    res.status(500).json({ error: "Erro ao deletar máquina" });
  }
};

// US07 - Obter estoque atual da máquina
export const obterEstoqueAtual = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔍 [obterEstoqueAtual] Buscando estoque para máquina:", id);

    const maquina = await Maquina.findByPk(id);

    if (!maquina) {
      console.log("❌ [obterEstoqueAtual] Máquina não encontrada:", id);
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    // Buscar última movimentação
    const ultimaMovimentacao = await Movimentacao.findOne({
      where: { maquinaId: maquina.id },
      order: [["dataColeta", "DESC"]],
    });

    console.log("📦 [obterEstoqueAtual] Última movimentação:", {
      id: ultimaMovimentacao?.id,
      dataColeta: ultimaMovimentacao?.dataColeta,
      totalPre: ultimaMovimentacao?.totalPre,
      sairam: ultimaMovimentacao?.sairam,
      abastecidas: ultimaMovimentacao?.abastecidas,
      totalPos: ultimaMovimentacao?.totalPos,
    });

    const estoqueAtual = ultimaMovimentacao ? ultimaMovimentacao.totalPos : 0;
    const percentualEstoque = (estoqueAtual / maquina.capacidadePadrao) * 100;
    const estoqueMinimo =
      (maquina.capacidadePadrao * maquina.percentualAlertaEstoque) / 100;

    console.log("✅ [obterEstoqueAtual] Estoque calculado:", {
      estoqueAtual,
      percentualEstoque: percentualEstoque.toFixed(2),
      estoqueMinimo,
      alertaEstoqueBaixo: estoqueAtual < estoqueMinimo,
    });

    res.json({
      maquina: {
        id: maquina.id,
        codigo: maquina.codigo,
        nome: maquina.nome,
        capacidadePadrao: maquina.capacidadePadrao,
      },
      estoqueAtual,
      percentualEstoque: percentualEstoque.toFixed(2),
      estoqueMinimo,
      alertaEstoqueBaixo: estoqueAtual < estoqueMinimo,
      ultimaAtualizacao: ultimaMovimentacao?.dataColeta,
    });
  } catch (error) {
    console.error("❌ [obterEstoqueAtual] Erro ao obter estoque:", error);
    res.status(500).json({ error: "Erro ao obter estoque" });
  }
};
